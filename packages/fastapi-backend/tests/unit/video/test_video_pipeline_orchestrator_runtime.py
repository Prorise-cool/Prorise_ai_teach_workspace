from __future__ import annotations

import asyncio
from pathlib import Path
from types import SimpleNamespace

from app.features.video.pipeline.models import VideoPreviewSectionStatus
from app.features.video.pipeline.orchestration import orchestrator as orchestrator_module
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration.orchestrator import VideoPipelineService
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.infra.redis_client import RuntimeStore
from app.shared.cos_client import CosClient


class _FakeAssembly:
    def provider_summary(self) -> dict[str, object]:
        return {"source": "test"}


class _FakeAgent:
    def __init__(self, work_dir: Path) -> None:
        self.work_dir = work_dir
        self.sections = [
            SimpleNamespace(id="section_1", title="认识题目", lecture_lines=["先看条件"]),
            SimpleNamespace(id="section_2", title="中间推导", lecture_lines=["整理公式"]),
            SimpleNamespace(id="section_3", title="得出结论", lecture_lines=["写出答案"]),
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
        self.generated_sections: list[str] = []
        self.rendered_sections: list[str] = []
        self.section_status_callback = None

    def generate_outline(self) -> None:
        return None

    def generate_storyboard(self) -> list[SimpleNamespace]:
        return self.sections

    def generate_section_code(self, section: SimpleNamespace) -> str:
        self.generated_sections.append(section.id)
        return f"code-{section.id}"

    def render_section(self, section: SimpleNamespace) -> bool:
        self.rendered_sections.append(section.id)
        if section.id == "section_2":
            if self.section_status_callback is not None:
                self.section_status_callback(
                    {
                        "sectionId": section.id,
                        "status": "fixing",
                        "attemptNo": 1,
                        "maxFixAttempts": 5,
                    }
                )
            return False

        video_path = self.work_dir / f"{section.id}.mp4"
        video_path.write_bytes(f"video-{section.id}".encode("utf-8"))
        self.section_videos[section.id] = str(video_path)
        return True


class _RecordingTask:
    def __init__(self) -> None:
        self.context = SimpleNamespace(
            task_id="video_orchestrator_runtime_case",
            metadata={"sourcePayload": {"text": "一元二次方程组"}},
            request_id="req_orchestrator_runtime_case",
            user_id="user_1",
        )
        self.snapshots: list[dict[str, object]] = []

    async def emit_runtime_snapshot(self, **payload) -> None:  # noqa: ANN003
        self.snapshots.append(payload)


def test_video_pipeline_service_streams_sections_and_persists_preview_runtime(
    monkeypatch,
    tmp_path: Path,
) -> None:
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    service = VideoPipelineService(
        runtime_store=runtime_store,
        metadata_service=SimpleNamespace(),
        settings=SimpleNamespace(
            video_asset_root=str(tmp_path),
            dramatiq_task_time_limit_ms=1_200_000,
        ),
    )

    fake_agent = _FakeAgent(tmp_path)
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
            video_url="https://assets.test.local/video/final.mp4",
            cover_url="https://assets.test.local/video/final.jpg",
        )

    def fake_compose_section_clip(*, section_id, section_video_path, audio_path, work_dir):  # noqa: ANN001
        preview_dir = work_dir / "preview_sections"
        preview_dir.mkdir(exist_ok=True)
        output_path = preview_dir / f"{section_id}_with_audio.mp4"
        output_path.write_bytes(section_video_path.read_bytes())
        return output_path

    def fake_concatenate_section_clips(section_clips, *, work_dir):  # noqa: ANN001
        composed_dir = work_dir / "composed"
        composed_dir.mkdir(exist_ok=True)
        final_video = composed_dir / "final_with_audio.mp4"
        final_video.write_bytes(b"final-video")
        cover = composed_dir / "cover.jpg"
        cover.write_bytes(b"cover")
        return final_video, cover

    monkeypatch.setattr(service, "_resolve_providers", fake_resolve_providers)
    monkeypatch.setattr(service, "_build_bridge", lambda assembly: object())
    monkeypatch.setattr(service, "_create_c2v_agent", lambda **kwargs: fake_agent)
    monkeypatch.setattr(service, "_run_tts", fake_run_tts)
    monkeypatch.setattr(service, "_compose_section_clip", fake_compose_section_clip)
    monkeypatch.setattr(service, "_concatenate_section_clips", fake_concatenate_section_clips)
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

    task = _RecordingTask()
    result = asyncio.run(service.run(task))

    assert fake_agent.generated_sections == ["section_1", "section_2", "section_3"]
    assert fake_agent.rendered_sections == ["section_1", "section_2", "section_3"]

    event_names = [snapshot["event"] for snapshot in task.snapshots]
    assert "section_progress" in event_names
    assert "section_ready" in event_names
    assert event_names.index("section_progress") > event_names.index("progress")

    preview = VideoRuntimeStateStore(runtime_store, task.context.task_id).load_preview()
    assert preview is not None
    assert preview.status == "completed"
    assert preview.preview_available is True
    assert preview.ready_sections == 2
    assert preview.failed_sections == 1
    assert preview.sections[0].status == VideoPreviewSectionStatus.READY
    assert preview.sections[0].clip_url == "https://assets.test.local/video/video_orchestrator_runtime_case/sections/section_1.mp4"
    assert preview.sections[0].audio_url == "https://assets.test.local/video/video_orchestrator_runtime_case/tts/section_1.mp3"
    assert preview.sections[1].status == VideoPreviewSectionStatus.FAILED
    assert preview.sections[2].status == VideoPreviewSectionStatus.READY

    assert result.status.value == "completed"
    assert result.context["duration"] == 42
    assert result.context["renderSummary"]["completionMode"] == "degraded"
    assert result.context["renderSummary"]["successfulSections"] == 2
    assert result.context["renderSummary"]["requiredSuccesses"] == 2
