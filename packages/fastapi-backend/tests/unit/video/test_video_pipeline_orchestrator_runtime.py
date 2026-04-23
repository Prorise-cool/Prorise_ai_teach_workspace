from __future__ import annotations

import asyncio
import time
from pathlib import Path
from types import SimpleNamespace

import pytest
from app.features.video.pipeline.models import (
    SolutionStep,
    UnderstandingResult,
    VideoPreviewSectionStatus,
    VideoResultDetail,
)
from app.features.video.pipeline.orchestration import (
    orchestrator as orchestrator_module,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration.orchestrator import VideoPipelineService
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.features.video.tasks import video_task_actor as video_task_actor_module
from app.features.video.tasks.video_task_actor import VideoTask
from app.infra.redis_client import RuntimeStore
from app.shared.cos_client import CosClient
from app.shared.task_framework.base import TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.scheduler import TaskScheduler
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
)


class _FakeAssembly:
    def provider_summary(self) -> dict[str, object]:
        return {"source": "test"}


class _FakeSectionAgent:
    def __init__(
        self,
        work_dir: Path,
        *,
        fail_codegen_ids: set[str] | None = None,
        fail_render_ids: set[str] | None = None,
        fixing_ids: set[str] | None = None,
        codegen_delay_seconds: float = 0.0,
    ) -> None:
        self.work_dir = work_dir
        self.fail_codegen_ids = set(fail_codegen_ids or set())
        self.fail_render_ids = set(fail_render_ids or set())
        self.fixing_ids = set(fixing_ids or set())
        self.codegen_delay_seconds = codegen_delay_seconds
        self.sections = [
            SimpleNamespace(
                id="section_1", title="认识题目", lecture_lines=["先看条件"]
            ),
            SimpleNamespace(
                id="section_2", title="中间推导", lecture_lines=["整理公式"]
            ),
            SimpleNamespace(
                id="section_3", title="得出结论", lecture_lines=["写出答案"]
            ),
        ]
        self.outline = SimpleNamespace(
            sections=[
                {"title": "条件分析"},
                {"title": "公式推导"},
                {"title": "结果校验"},
            ]
        )
        self.section_videos: dict[str, str] = {}
        self.render_summary: dict[str, object] = {}
        self.section_status_callback = None
        self.codegen_calls: list[str] = []
        self.render_calls: list[str] = []

    def generate_design(
        self, duration_minutes: int
    ) -> tuple[str, list[SimpleNamespace]]:
        return "<design>section design</design>", self.sections

    def generate_section_code(
        self,
        section: SimpleNamespace,
        design_text: str | None = None,
    ) -> str:
        self.codegen_calls.append(section.id)
        if self.codegen_delay_seconds > 0:
            time.sleep(self.codegen_delay_seconds)
        if section.id in self.fail_codegen_ids:
            raise RuntimeError(f"Section codegen failed for {section.id}")
        return (
            "from manim import *\n\n"
            f"class {section.id.title().replace('_', '')}(Scene):\n"
            "    def construct(self):\n"
            "        self.wait(0.1)\n"
        )

    def render_section(self, section: SimpleNamespace) -> str:
        self.render_calls.append(section.id)
        if section.id in self.fixing_ids and self.section_status_callback is not None:
            self.section_status_callback(
                {
                    "status": "fixing",
                    "sectionId": section.id,
                    "attemptNo": 1,
                    "maxFixAttempts": 3,
                }
            )
        if section.id in self.fail_render_ids:
            raise RuntimeError(f"Render crashed for {section.id}")
        output_dir = self.work_dir / "section_renders"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{section.id}.webm"
        output_path.write_bytes(f"video-{section.id}".encode("utf-8"))
        self.section_videos[section.id] = str(output_path)
        return str(output_path)


class _RecordingTask:
    def __init__(
        self,
        *,
        task_id: str = "video_orchestrator_runtime_case",
        metadata: dict[str, object] | None = None,
    ) -> None:
        self.context = SimpleNamespace(
            task_id=task_id,
            metadata={
                "sourcePayload": {"text": "一元二次方程组"},
                **(metadata or {}),
            },
            request_id=f"req_{task_id}",
            user_id="user_1",
        )
        self.snapshots: list[dict[str, object]] = []

    async def emit_runtime_snapshot(self, **payload) -> None:  # noqa: ANN003
        self.snapshots.append(payload)


class _RecordingMetadataService:
    def __init__(self) -> None:
        self.requests: list[object] = []

    async def persist_task(
        self,
        request,
        *,
        access_context=None,
        request_auth=None,
    ):  # noqa: ANN001
        self.requests.append(request)
        return request


def _build_service(
    tmp_path: Path,
    *,
    section_codegen_concurrency: int = 1,
) -> tuple[VideoPipelineService, RuntimeStore]:
    runtime_store = RuntimeStore(
        backend="memory-runtime-store", redis_url="redis://memory"
    )
    service = VideoPipelineService(
        runtime_store=runtime_store,
        metadata_service=SimpleNamespace(),
        settings=SimpleNamespace(
            video_asset_root=str(tmp_path),
            dramatiq_task_time_limit_ms=36_000_000,
            video_default_duration_minutes=5,
            video_section_codegen_concurrency=section_codegen_concurrency,
        ),
    )
    return service, runtime_store


def _patch_pipeline_dependencies(
    monkeypatch: pytest.MonkeyPatch,
    service: VideoPipelineService,
    tmp_path: Path,
    fake_agent: _FakeSectionAgent,
) -> None:
    asset_store = LocalAssetStore(
        root_dir=tmp_path / "assets",
        cos_client=CosClient("https://assets.test.local"),
    )

    async def fake_resolve_providers(task) -> _FakeAssembly:  # noqa: ANN001
        return _FakeAssembly()

    async def fake_run_tts(agent, assembly, work_dir) -> dict[str, Path]:  # noqa: ANN001
        audio_map: dict[str, Path] = {}
        for section in fake_agent.sections:
            audio_path = tmp_path / f"{section.id}.mp3"
            audio_path.write_bytes(f"audio-{section.id}".encode("utf-8"))
            audio_map[section.id] = audio_path
        return audio_map

    async def fake_upload_execute(self, task_id, compose_result):  # noqa: ANN001
        return SimpleNamespace(
            video_url="https://assets.test.local/video/final.webm",
            cover_url="https://assets.test.local/video/final.jpg",
        )

    def fake_compose_section_clip(
        *,
        section_id,
        section_video_path,
        audio_path,
        work_dir,
    ):  # noqa: ANN001
        preview_dir = work_dir / "preview_sections"
        preview_dir.mkdir(exist_ok=True)
        output_path = preview_dir / f"{section_id}_with_audio.webm"
        output_path.write_bytes(section_video_path.read_bytes())
        return output_path

    def fake_concatenate_section_clips(section_clips, *, work_dir):  # noqa: ANN001
        composed_dir = work_dir / "composed"
        composed_dir.mkdir(exist_ok=True)
        final_video = composed_dir / "final_with_audio.webm"
        final_video.write_bytes(b"final-video")
        cover = composed_dir / "cover.jpg"
        cover.write_bytes(b"cover")
        return final_video, cover

    monkeypatch.setattr(service, "_resolve_providers", fake_resolve_providers)
    monkeypatch.setattr(service, "_build_bridge", lambda assembly: object())
    monkeypatch.setattr(service, "_create_c2v_agent", lambda **kwargs: fake_agent)
    monkeypatch.setattr(service, "_run_tts", fake_run_tts)
    monkeypatch.setattr(service, "_compose_section_clip", fake_compose_section_clip)
    monkeypatch.setattr(
        service, "_concatenate_section_clips", fake_concatenate_section_clips
    )
    monkeypatch.setattr(orchestrator_module, "configure_bridge", lambda bridge: None)
    monkeypatch.setattr(orchestrator_module, "_probe_duration", lambda video_path: 42)
    monkeypatch.setattr(
        orchestrator_module.LocalAssetStore,
        "from_settings",
        classmethod(lambda cls, settings: asset_store),
    )
    monkeypatch.setattr(
        orchestrator_module,
        "UploadService",
        type(
            "FakeUploadService",
            (),
            {
                "__init__": lambda self, **kwargs: None,
                "execute": fake_upload_execute,
            },
        ),
    )


def test_video_pipeline_service_builds_preview_summary_from_understanding(
    tmp_path: Path,
) -> None:
    service, _ = _build_service(tmp_path)
    understanding = UnderstandingResult(
        topic_summary=(
            "这题先别急着代公式，先看这个一元二次方程到底有没有实数解。"
            "主线其实很简单：先看判别式，再决定后面怎么求根。"
            "很多同学容易跳过第一步，结果把本来无解的题也硬算下去。"
        ),
        knowledge_points=["判别式", "求根公式"],
        solution_steps=[
            SolutionStep(
                step_id="step_1",
                title="判断根的情况",
                explanation="先算 b²-4ac，确认这道题到底有没有实数解，这一步能帮你少走很多弯路。",
            ),
            SolutionStep(
                step_id="step_2",
                title="代入公式",
                explanation="确定有实数解以后，再把 a、b、c 代入求根公式，算完记得回头检查正负号。",
            ),
        ],
        difficulty="medium",
        subject="math",
        provider_used="stub-llm",
    )

    initial_preview = service._build_initial_preview_state(
        task_id="video_preview_summary_case",
        understanding=understanding,
        fallback_summary="原始题目",
    )
    section_preview = service._build_preview_from_agent(
        "video_preview_summary_case",
        initial_preview,
        _FakeSectionAgent(tmp_path),
        "一元二次方程求根",
    )

    assert initial_preview.preview_version == 1
    assert "这题先别急着代公式" in initial_preview.summary
    assert "- 判断根的情况：" in initial_preview.summary
    assert "**判断根的情况**" not in initial_preview.summary
    assert initial_preview.knowledge_points == ["判别式", "求根公式"]
    assert section_preview.preview_version == 2
    assert section_preview.summary == initial_preview.summary
    assert section_preview.knowledge_points == ["判别式", "求根公式"]


def test_video_pipeline_service_backfills_summary_from_sections_when_understanding_is_weak(
    tmp_path: Path,
) -> None:
    service, _ = _build_service(tmp_path)
    weak_preview = SimpleNamespace(
        preview_version=1,
        summary="证明一下洛必达法则的由来",
        knowledge_points=[],
    )
    agent = _FakeSectionAgent(tmp_path)
    agent.sections = [
        SimpleNamespace(
            id="section_1",
            title="先看为什么会出现 0/0",
            lecture_lines=["先确认分子和分母是不是都在一起逼近 0。"],
        ),
        SimpleNamespace(
            id="section_2",
            title="再看变化率怎么接上",
            lecture_lines=["把平均变化率和瞬时变化率连起来以后，洛必达法则的来路就清楚了。"],
        ),
    ]
    agent.outline = SimpleNamespace(
        sections=[
            {"title": "The 0/0 Problem"},
            {"title": "Zooming in (Linearization)"},
        ]
    )

    preview = service._build_preview_from_agent(
        "video_preview_backfill_case",
        weak_preview,
        agent,
        "证明一下洛必达法则的由来",
    )

    assert "先别急着只看题面" in preview.summary
    assert "先看为什么会出现 0/0" in preview.summary
    assert preview.knowledge_points == ["先看为什么会出现 0/0", "再看变化率怎么接上"]


def test_video_pipeline_service_streams_sections_and_persists_preview_runtime(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    service, runtime_store = _build_service(tmp_path)
    fake_agent = _FakeSectionAgent(
        tmp_path,
        fail_render_ids={"section_2"},
        fixing_ids={"section_1"},
    )
    _patch_pipeline_dependencies(monkeypatch, service, tmp_path, fake_agent)

    task = _RecordingTask()
    result = asyncio.run(service.run(task))

    assert fake_agent.codegen_calls == ["section_1", "section_2", "section_3"]
    assert fake_agent.render_calls == ["section_1", "section_2", "section_3"]
    assert "section_1" in fake_agent.section_videos
    assert "section_2" not in fake_agent.section_videos
    assert "section_3" in fake_agent.section_videos

    event_names = [snapshot["event"] for snapshot in task.snapshots]
    assert "section_progress" in event_names
    assert "section_ready" in event_names
    assert any(
        snapshot["context"].get("sectionStatus")
        == VideoPreviewSectionStatus.FIXING.value
        for snapshot in task.snapshots
        if isinstance(snapshot.get("context"), dict)
    )

    preview = VideoRuntimeStateStore(runtime_store, task.context.task_id).load_preview()
    assert preview is not None
    assert preview.status == "completed"
    assert preview.preview_available is True
    assert preview.ready_sections == 2
    assert preview.failed_sections == 1
    assert preview.sections[0].status == VideoPreviewSectionStatus.READY
    assert preview.sections[0].clip_url == (
        "https://assets.test.local/video/video_orchestrator_runtime_case/sections/section_1.webm"
    )
    assert preview.sections[0].audio_url == (
        "https://assets.test.local/video/video_orchestrator_runtime_case/tts/section_1.mp3"
    )
    assert preview.sections[1].status == VideoPreviewSectionStatus.FAILED
    assert preview.sections[2].status == VideoPreviewSectionStatus.READY

    assert result.status.value == "completed"
    assert result.context["duration"] == 42
    assert result.context["renderSummary"]["completionMode"] == "degraded"
    assert result.context["renderSummary"]["successfulSections"] == 2
    assert result.context["renderSummary"]["requiredSuccesses"] == 2


def test_video_pipeline_service_keeps_progress_monotonic_with_concurrent_codegen_prefetch(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    service, runtime_store = _build_service(tmp_path, section_codegen_concurrency=2)
    fake_agent = _FakeSectionAgent(tmp_path, codegen_delay_seconds=0.02)
    _patch_pipeline_dependencies(monkeypatch, service, tmp_path, fake_agent)

    task = _RecordingTask(
        task_id="video_orchestrator_prefetch_case",
        metadata={"section_codegen_concurrency": 2},
    )
    result = asyncio.run(service.run(task))

    progress_points = [snapshot["progress"] for snapshot in task.snapshots]
    assert progress_points == sorted(progress_points)

    first_codegen_index = next(
        index
        for index, snapshot in enumerate(task.snapshots)
        if snapshot["message"] == "准备逐段生成动画脚本..."
    )
    first_section_progress_index = next(
        index
        for index, snapshot in enumerate(task.snapshots)
        if snapshot["event"] == "section_progress"
    )
    assert first_codegen_index < first_section_progress_index

    preview = VideoRuntimeStateStore(runtime_store, task.context.task_id).load_preview()
    assert preview is not None
    assert preview.status == "completed"
    assert preview.ready_sections == 3
    assert preview.failed_sections == 0
    assert all(
        section.status == VideoPreviewSectionStatus.READY
        for section in preview.sections
    )

    assert result.status.value == "completed"
    assert result.context["renderSummary"]["completionMode"] == "full"
    assert result.context["renderSummary"]["successfulSections"] == 3


def test_video_pipeline_service_marks_failed_preview_when_all_section_codegen_abort(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    service, runtime_store = _build_service(tmp_path, section_codegen_concurrency=2)
    fake_agent = _FakeSectionAgent(
        tmp_path,
        fail_codegen_ids={"section_1", "section_2", "section_3"},
    )
    _patch_pipeline_dependencies(monkeypatch, service, tmp_path, fake_agent)

    task = _RecordingTask(
        task_id="video_orchestrator_all_codegen_fail_case",
        metadata={"section_codegen_concurrency": 2},
    )
    with pytest.raises(Exception, match="Render quality gate failed"):
        asyncio.run(service.run(task))

    runtime = VideoRuntimeStateStore(runtime_store, task.context.task_id)
    preview = runtime.load_preview()
    detail = runtime.load_model("result_detail", VideoResultDetail)

    assert preview is not None
    assert preview.status == "failed"
    assert preview.failed_sections == preview.total_sections == 3
    assert all(
        section.status == VideoPreviewSectionStatus.FAILED
        for section in preview.sections
    )
    assert all(
        "脚本生成失败" in (section.error_message or "") for section in preview.sections
    )

    assert detail is not None
    assert detail.status == "failed"
    assert detail.failure is not None
    assert detail.failure.error_code == "VIDEO_RENDER_FAILED"


def test_video_pipeline_service_returns_cancelled_before_finalize_when_runtime_cancel_requested(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    service, runtime_store = _build_service(tmp_path)
    fake_agent = _FakeSectionAgent(tmp_path)
    _patch_pipeline_dependencies(monkeypatch, service, tmp_path, fake_agent)

    upload_calls: list[str] = []

    class _TrackingUploadService:
        def __init__(self, **kwargs) -> None:  # noqa: ANN003
            pass

        async def execute(self, task_id, compose_result):  # noqa: ANN001
            upload_calls.append(task_id)
            return SimpleNamespace(
                video_url="https://assets.test.local/video/final.webm",
                cover_url="https://assets.test.local/video/final.jpg",
            )

    monkeypatch.setattr(orchestrator_module, "UploadService", _TrackingUploadService)

    task = _RecordingTask(task_id="video_orchestrator_cancel_before_finalize_case")
    runtime = VideoRuntimeStateStore(runtime_store, task.context.task_id)
    original_run_render_stage = service._run_render_stage

    async def wrapped_run_render_stage(*args, **kwargs):  # noqa: ANN002, ANN003
        render_result = await original_run_render_stage(*args, **kwargs)
        runtime.save_cancel_request(
            {
                "requestedAt": "2026-04-17T12:00:00Z",
                "requestedBy": "user_1",
            }
        )
        return render_result

    monkeypatch.setattr(service, "_run_render_stage", wrapped_run_render_stage)

    result = asyncio.run(service.run(task))
    preview = runtime.load_preview()

    assert result.status == TaskStatus.CANCELLED
    assert result.error_code == TaskErrorCode.CANCELLED
    assert result.message == "任务已取消"
    assert result.context["cancelRequested"] is True
    assert upload_calls == []
    assert preview is not None
    assert preview.status == "cancelled"


def test_video_pipeline_service_returns_cancelled_inside_render_loop(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    service, runtime_store = _build_service(tmp_path)
    fake_agent = _FakeSectionAgent(tmp_path)
    _patch_pipeline_dependencies(monkeypatch, service, tmp_path, fake_agent)

    upload_calls: list[str] = []

    class _TrackingUploadService:
        def __init__(self, **kwargs) -> None:  # noqa: ANN003
            pass

        async def execute(self, task_id, compose_result):  # noqa: ANN001
            upload_calls.append(task_id)
            return SimpleNamespace(
                video_url="https://assets.test.local/video/final.webm",
                cover_url="https://assets.test.local/video/final.jpg",
            )

    monkeypatch.setattr(orchestrator_module, "UploadService", _TrackingUploadService)

    task = _RecordingTask(task_id="video_orchestrator_cancel_mid_render_case")
    runtime = VideoRuntimeStateStore(runtime_store, task.context.task_id)
    original_render_section = fake_agent.render_section

    def render_then_cancel(section):  # noqa: ANN001
        output = original_render_section(section)
        if section.id == "section_1":
            runtime.save_cancel_request(
                {
                    "requestedAt": "2026-04-17T12:10:00Z",
                    "requestedBy": "user_1",
                }
            )
        return output

    fake_agent.render_section = render_then_cancel

    result = asyncio.run(service.run(task))
    preview = runtime.load_preview()

    assert result.status == TaskStatus.CANCELLED
    assert result.error_code == TaskErrorCode.CANCELLED
    assert result.context["cancelRequested"] is True
    assert fake_agent.render_calls == ["section_1"]
    assert upload_calls == []
    assert preview is not None
    assert preview.status == "cancelled"
    assert preview.sections[0].status == VideoPreviewSectionStatus.READY
    assert all(snapshot["event"] != "completed" for snapshot in task.snapshots)


def test_video_task_prepare_short_circuits_cancelled_queue_before_running_snapshot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_store = RuntimeStore(
        backend="memory-runtime-store",
        redis_url="redis://memory",
    )
    metadata_service = _RecordingMetadataService()
    context = TaskContext(
        task_id="video_prepare_cancelled_case",
        task_type="video",
        user_id="user_1",
        request_id="req_video_prepare_cancelled_case",
        source_module="video",
    )
    runtime_store.set_task_state(
        task_id=context.task_id,
        task_type=context.task_type,
        internal_status=TaskInternalStatus.CANCELLING,
        message="任务已取消",
        progress=0,
        request_id=context.request_id,
        user_id=context.user_id,
        error_code=TaskErrorCode.CANCELLED,
        source="video.cancel_task",
        context={"cancelRequested": True},
    )
    VideoRuntimeStateStore(runtime_store, context.task_id).save_cancel_request(
        {
            "requestedAt": "2026-04-17T12:20:00Z",
            "requestedBy": context.user_id,
        }
    )

    class _UnexpectedPipelineService:
        async def run(self, task):  # noqa: ANN001
            raise AssertionError("pipeline should not run for cancelled task")

    monkeypatch.setattr(
        video_task_actor_module,
        "get_video_pipeline_service",
        lambda runtime_store, metadata_service: _UnexpectedPipelineService(),
    )
    monkeypatch.setattr(
        video_task_actor_module,
        "load_video_runtime_auth",
        lambda runtime_store, task_id: None,
    )

    scheduler = TaskScheduler(runtime_store=runtime_store)
    task = VideoTask(
        context,
        runtime_store=runtime_store,
        metadata_service=metadata_service,
    )

    result = asyncio.run(scheduler.dispatch(task))
    events = runtime_store.get_task_events(context.task_id)
    snapshot = runtime_store.get_task_state(context.task_id)

    assert result.status == TaskStatus.CANCELLED
    assert result.error_code == TaskErrorCode.CANCELLED
    assert [event.event for event in events] == ["cancelled"]
    assert snapshot is not None
    assert snapshot["internalStatus"] == TaskInternalStatus.CANCELLED.value
    assert snapshot["status"] == TaskStatus.CANCELLED.value
    assert metadata_service.requests[0].status == TaskStatus.CANCELLED


def test_video_task_finalize_keeps_cancelled_runtime_terminal_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_store = RuntimeStore(
        backend="memory-runtime-store",
        redis_url="redis://memory",
    )
    metadata_service = _RecordingMetadataService()
    context = TaskContext(
        task_id="video_finalize_cancelled_case",
        task_type="video",
        user_id="user_1",
        request_id="req_video_finalize_cancelled_case",
        source_module="video",
    )
    runtime_store.set_task_state(
        task_id=context.task_id,
        task_type=context.task_type,
        internal_status=TaskInternalStatus.CANCELLING,
        message="任务已取消",
        progress=42,
        request_id=context.request_id,
        user_id=context.user_id,
        error_code=TaskErrorCode.CANCELLED,
        source="video.cancel_task",
        context={"currentStage": "render", "cancelRequested": True},
    )
    VideoRuntimeStateStore(runtime_store, context.task_id).save_cancel_request(
        {
            "requestedAt": "2026-04-17T12:30:00Z",
            "requestedBy": context.user_id,
        }
    )

    monkeypatch.setattr(
        video_task_actor_module,
        "load_video_runtime_auth",
        lambda runtime_store, task_id: None,
    )

    task = VideoTask(
        context,
        runtime_store=runtime_store,
        metadata_service=metadata_service,
    )

    result = asyncio.run(
        task.finalize(
            TaskResult.completed(
                "视频生成完成",
                progress=100,
                context={"stage": "completed"},
            )
        )
    )

    assert result.status == TaskStatus.CANCELLED
    assert result.error_code == TaskErrorCode.CANCELLED
    assert result.message == "任务已取消"
    assert result.progress == 42
    assert result.context["cancelRequested"] is True
    assert metadata_service.requests[0].status == TaskStatus.CANCELLED
    assert metadata_service.requests[0].summary == "任务已取消"
    assert metadata_service.requests[0].error_summary is None


def test_compose_section_with_audio_pads_tail_when_audio_longer(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    video_path = tmp_path / "section.webm"
    audio_path = tmp_path / "section.mp3"
    output_path = tmp_path / "section_with_audio.webm"
    video_path.write_bytes(b"video")
    audio_path.write_bytes(b"audio")

    commands: list[list[str]] = []

    def fake_probe(path: Path) -> float:
        if path == video_path:
            return 2.0
        if path == audio_path:
            return 3.1
        return 0.0

    def fake_run(cmd, capture_output=True, text=True, timeout=0):  # noqa: ANN001
        commands.append(cmd)
        output_path.write_bytes(b"merged")
        return SimpleNamespace(returncode=0, stderr="", stdout="")

    from app.features.video.pipeline.orchestration import media_utils
    monkeypatch.setattr(media_utils, "probe_media_duration", fake_probe)
    monkeypatch.setattr(media_utils.subprocess, "run", fake_run)

    result = media_utils.compose_section_with_audio(
        video_path,
        audio_path,
        output_path,
    )

    assert result == output_path
    assert output_path.read_bytes() == b"merged"
    assert len(commands) == 1
    filter_index = commands[0].index("-filter_complex")
    assert "tpad=stop_mode=clone" in commands[0][filter_index + 1]
    assert "libvpx-vp9" in commands[0]


def test_compose_section_with_audio_keeps_fast_path_when_video_is_long_enough(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    video_path = tmp_path / "section.webm"
    audio_path = tmp_path / "section.mp3"
    output_path = tmp_path / "section_with_audio.webm"
    video_path.write_bytes(b"video")
    audio_path.write_bytes(b"audio")

    commands: list[list[str]] = []

    def fake_probe(path: Path) -> float:
        if path == video_path:
            return 4.0
        if path == audio_path:
            return 2.5
        return 0.0

    def fake_run(cmd, capture_output=True, text=True, timeout=0):  # noqa: ANN001
        commands.append(cmd)
        output_path.write_bytes(b"merged-fast")
        return SimpleNamespace(returncode=0, stderr="", stdout="")

    from app.features.video.pipeline.orchestration import media_utils
    monkeypatch.setattr(media_utils, "probe_media_duration", fake_probe)
    monkeypatch.setattr(media_utils.subprocess, "run", fake_run)

    result = media_utils.compose_section_with_audio(
        video_path,
        audio_path,
        output_path,
    )

    assert result == output_path
    assert output_path.read_bytes() == b"merged-fast"
    assert len(commands) == 1
    assert "-filter_complex" not in commands[0]
    video_codec_index = commands[0].index("-c:v")
    assert commands[0][video_codec_index + 1] == "copy"
