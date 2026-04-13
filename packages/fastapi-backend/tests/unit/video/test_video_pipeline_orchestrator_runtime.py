from __future__ import annotations

import asyncio
from pathlib import Path
from types import SimpleNamespace

from app.features.video.pipeline.orchestration import orchestrator as orchestrator_module
from app.features.video.pipeline.orchestration.orchestrator import VideoPipelineService
from app.infra.redis_client import RuntimeStore


class _FakeAssembly:
    def provider_summary(self) -> dict[str, object]:
        return {"source": "test"}


class _FakeAgent:
    def __init__(self, work_dir: Path) -> None:
        self.work_dir = work_dir
        self.sections = [
            SimpleNamespace(id="section_1"),
            SimpleNamespace(id="section_2"),
        ]
        self.outline = SimpleNamespace(
            sections=[
                {"title": "知识点 1"},
                {"title": "知识点 2"},
            ]
        )
        self.render_summary: dict[str, object] = {}

    def generate_outline(self) -> None:
        return None

    def generate_storyboard(self) -> list[SimpleNamespace]:
        return self.sections

    def generate_codes(self) -> dict[str, str]:
        return {}

    def render_all_sections(self, **_: object) -> dict[str, str]:
        section_1 = self.work_dir / "section_1.mp4"
        section_2 = self.work_dir / "section_2.mp4"
        section_1.write_bytes(b"section-1")
        section_2.write_bytes(b"section-2")
        self.render_summary = {
            "totalSections": 2,
            "successfulSections": 2,
            "incompleteSections": 0,
            "requiredSuccesses": 2,
            "allSectionsRendered": True,
            "completionMode": "full",
            "stopReason": None,
        }
        return {
            "section_1": str(section_1),
            "section_2": str(section_2),
        }

    def merge_videos(self, *, video_map: dict[str, str]) -> str:
        assert set(video_map) == {"section_1", "section_2"}
        final_video = self.work_dir / "final.mp4"
        final_video.write_bytes(b"final-video")
        return str(final_video)


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


def test_video_pipeline_service_emits_stage_progress_and_reports_wall_clock_time(
    monkeypatch,
    tmp_path: Path,
) -> None:
    service = VideoPipelineService(
        runtime_store=RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory"),
        metadata_service=SimpleNamespace(),
        settings=SimpleNamespace(
            video_asset_root=str(tmp_path),
            dramatiq_task_time_limit_ms=1_200_000,
        ),
    )

    fake_agent = _FakeAgent(tmp_path)

    async def fake_resolve_providers(task) -> _FakeAssembly:  # noqa: ANN001
        return _FakeAssembly()

    async def fake_run_tts(agent, assembly, work_dir) -> dict[str, Path]:  # noqa: ANN001
        audio_1 = tmp_path / "section_1.mp3"
        audio_2 = tmp_path / "section_2.mp3"
        audio_1.write_bytes(b"audio-1")
        audio_2.write_bytes(b"audio-2")
        return {
            "section_1": audio_1,
            "section_2": audio_2,
        }

    async def fake_upload_execute(self, task_id, compose_result):  # noqa: ANN001
        return SimpleNamespace(
            video_url="http://127.0.0.1:8090/video.mp4",
            cover_url="http://127.0.0.1:8090/cover.jpg",
        )

    def fake_compose_final(agent, final_video_path, tts_audio_map, work_dir):  # noqa: ANN001
        cover = tmp_path / "cover.jpg"
        cover.write_bytes(b"cover")
        return Path(final_video_path), cover

    monkeypatch.setattr(service, "_resolve_providers", fake_resolve_providers)
    monkeypatch.setattr(service, "_build_bridge", lambda assembly: object())
    monkeypatch.setattr(service, "_create_c2v_agent", lambda **kwargs: fake_agent)
    monkeypatch.setattr(service, "_run_tts", fake_run_tts)
    monkeypatch.setattr(service, "_compose_final", fake_compose_final)
    monkeypatch.setattr(orchestrator_module, "configure_bridge", lambda bridge: None)
    monkeypatch.setattr(orchestrator_module, "_probe_duration", lambda video_path: 42)
    monkeypatch.setattr(
        orchestrator_module.LocalAssetStore,
        "from_settings",
        classmethod(lambda cls, settings: SimpleNamespace()),
    )
    monkeypatch.setattr(orchestrator_module, "UploadService", type("FakeUploadService", (), {"__init__": lambda self, **kwargs: None, "execute": fake_upload_execute}))

    task = _RecordingTask()
    result = asyncio.run(service.run(task))

    stages = [snapshot["context"]["stage"] for snapshot in task.snapshots]
    assert stages[:3] == ["understanding", "understanding", "understanding"]
    assert "storyboard" in stages
    assert "manim_gen" in stages
    assert "render" in stages
    assert "tts" in stages
    assert "compose" in stages
    assert stages[-2:] == ["upload", "upload"]

    assert result.status.value == "completed"
    assert result.context["duration"] == 42
    assert result.context["taskElapsedSeconds"] >= 1
    assert result.context["taskElapsedSeconds"] != result.context["duration"]
    assert result.context["renderSummary"]["allSectionsRendered"] is True
