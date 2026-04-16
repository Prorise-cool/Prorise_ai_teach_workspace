from __future__ import annotations

import asyncio
import time
from pathlib import Path
from types import SimpleNamespace

import pytest
from app.features.video.pipeline.models import (
    VideoPreviewSectionStatus,
    VideoResultDetail,
)
from app.features.video.pipeline.orchestration import (
    orchestrator as orchestrator_module,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration.orchestrator import VideoPipelineService
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.infra.redis_client import RuntimeStore
from app.shared.cos_client import CosClient


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
            dramatiq_task_time_limit_ms=1_200_000,
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

    monkeypatch.setattr(orchestrator_module, "_probe_media_duration", fake_probe)
    monkeypatch.setattr(orchestrator_module.subprocess, "run", fake_run)

    result = orchestrator_module._compose_section_with_audio(
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

    monkeypatch.setattr(orchestrator_module, "_probe_media_duration", fake_probe)
    monkeypatch.setattr(orchestrator_module.subprocess, "run", fake_run)

    result = orchestrator_module._compose_section_with_audio(
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
