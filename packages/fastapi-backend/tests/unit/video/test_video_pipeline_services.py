from __future__ import annotations

import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.models import (
    AudioSegment,
    ComposeResult,
    ExecutionResult,
    ManimCodeResult,
    Scene,
    Storyboard,
    UnderstandingResult,
)
from app.features.video.pipeline.runtime import VideoRuntimeStateStore
from app.features.video.pipeline.services import (
    ArtifactWritebackService,
    ComposeService,
    LLMBasedFixer,
    ManimGenerationService,
    RuleBasedFixer,
    StoryboardService,
    TTSService,
    UnderstandingService,
    UploadService,
)
from app.infra.redis_client import RuntimeStore
from app.shared.cos_client import CosClient


class FakeFailoverService:
    def __init__(self, *, generate_results=None, synthesize_results=None) -> None:
        self._generate_results = list(generate_results or [])
        self._synthesize_results = list(synthesize_results or [])

    async def generate(self, providers, prompt: str, emit_switch=None):  # noqa: ANN001
        if not self._generate_results:
            raise AssertionError("missing fake generate result")
        return self._generate_results.pop(0)

    async def synthesize(self, providers, text: str, emit_switch=None):  # noqa: ANN001
        if not self._synthesize_results:
            raise AssertionError("missing fake synthesize result")
        return self._synthesize_results.pop(0)


def _build_runtime(task_id: str = "video_unit_case") -> VideoRuntimeStateStore:
    return VideoRuntimeStateStore(
        RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory"),
        task_id,
    )


def _build_settings(**overrides) -> SimpleNamespace:
    payload = {
        "video_target_duration_seconds": 120,
        "video_min_duration_seconds": 90,
        "video_max_duration_seconds": 180,
        "video_output_audio_format": "mp3",
        "video_output_audio_sample_rate": 44100,
        "video_output_audio_bitrate": "192k",
        "video_ffmpeg_timeout_seconds": 1,
        "video_upload_retry_attempts": 1,
    }
    payload.update(overrides)
    return SimpleNamespace(**payload)


def _build_understanding() -> UnderstandingResult:
    return UnderstandingResult.model_validate(
        {
            "topicSummary": "勾股定理证明",
            "knowledgePoints": ["直角三角形", "面积法"],
            "solutionSteps": [
                {"stepId": "step_1", "title": "构造辅助图形", "explanation": "先构造一个大正方形。"},
                {"stepId": "step_2", "title": "比较面积", "explanation": "再比较两个表达式的面积。"},
            ],
            "difficulty": "medium",
            "subject": "math",
            "providerUsed": "stub-llm",
        }
    )


def _build_storyboard() -> Storyboard:
    return Storyboard(
        scenes=[
            Scene(
                scene_id="scene_1",
                title="题目引入",
                narration="先理解题目条件。",
                visual_description="展示题干。",
                duration_hint=40,
                order=1,
            ),
            Scene(
                scene_id="scene_2",
                title="方法展开",
                narration="用面积法建立关系。",
                visual_description="画出大正方形。",
                duration_hint=40,
                order=2,
            ),
            Scene(
                scene_id="scene_3",
                title="结论总结",
                narration="回顾关键结论。",
                visual_description="高亮公式。",
                duration_hint=40,
                order=3,
            ),
        ],
        total_duration=120,
        target_duration=120,
        provider_used="stub-llm",
    )


def test_understanding_service_parses_json_and_persists_runtime() -> None:
    runtime = _build_runtime("video_understanding_case")
    service = UnderstandingService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[
                SimpleNamespace(
                    provider="stub-llm",
                    content=(
                        '{"topicSummary":"一次函数图像","knowledgePoints":["斜率","截距"],'
                        '"solutionSteps":[{"stepId":"step_1","title":"读图","explanation":"先读出截距"}],'
                        '"difficulty":"easy","subject":"math"}'
                    ),
                )
            ]
        ),
        runtime=runtime,
    )

    result = asyncio.run(
        service.execute(source_payload={"text": "已知一次函数图像，求解析式。"}, user_profile={"grade": "junior"})
    )

    assert result.topic_summary == "一次函数图像"
    assert result.knowledge_points == ["斜率", "截距"]
    persisted = runtime.load_model("understanding", UnderstandingResult)
    assert persisted is not None
    assert persisted.topic_summary == "一次函数图像"


def test_storyboard_service_normalizes_scene_duration_to_target_range() -> None:
    runtime = _build_runtime("video_storyboard_case")
    service = StoryboardService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[
                SimpleNamespace(
                    provider="stub-llm",
                    content=(
                        '{"scenes":['
                        '{"sceneId":"scene_1","title":"引入","narration":"开场","visualDescription":"展示题目","durationHint":100,"order":1},'
                        '{"sceneId":"scene_2","title":"分析","narration":"分析条件","visualDescription":"标注条件","durationHint":100,"order":2},'
                        '{"sceneId":"scene_3","title":"总结","narration":"总结结论","visualDescription":"展示结果","durationHint":100,"order":3}'
                        "],\"totalDuration\":300,\"targetDuration\":120}"
                    ),
                )
            ]
        ),
        runtime=runtime,
        settings=_build_settings(video_target_duration_seconds=120),
    )

    result = asyncio.run(service.execute(understanding=_build_understanding()))

    assert result.total_duration == 120
    assert [scene.order for scene in result.scenes] == [1, 2, 3]
    persisted = runtime.load_model("storyboard", Storyboard)
    assert persisted is not None
    assert persisted.total_duration == 120


def test_rule_based_fixer_wraps_script_with_safe_scene_defaults() -> None:
    fixer = RuleBasedFixer()

    result = fixer.fix(script_content="class Demo:\n    pass\n", error_log="NameError: ShowCreation")

    assert result.fixed is True
    assert result.fixed_script is not None
    assert "from manim import *" in result.fixed_script
    assert "(Scene)" in result.fixed_script


def test_manim_generation_service_persists_generated_script() -> None:
    runtime = _build_runtime("video_manim_case")
    service = ManimGenerationService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[
                SimpleNamespace(
                    provider="stub-llm",
                    content="```python\nfrom manim import *\n\nclass Demo(Scene):\n    def construct(self):\n        self.wait(1)\n```",
                )
            ]
        ),
        runtime=runtime,
    )

    result = asyncio.run(service.execute(storyboard=_build_storyboard()))

    assert "class Demo(Scene)" in result.script_content
    persisted = runtime.load_value("manim_code")
    assert isinstance(persisted, dict)


def test_llm_based_fixer_uses_provider_output_when_available() -> None:
    fixer = LLMBasedFixer(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[
                SimpleNamespace(
                    provider="stub-llm",
                    content="```python\nfrom manim import *\n\nclass Fixed(Scene):\n    def construct(self):\n        self.wait(1)\n```",
                )
            ]
        ),
    )

    result = asyncio.run(
        fixer.fix(
            storyboard=_build_storyboard(),
            script_content="class Broken:\n    pass\n",
            error_log="NameError: Text is not defined",
        )
    )

    assert result.fixed is True
    assert result.fixed_script is not None
    assert "class Fixed(Scene)" in result.fixed_script


def test_tts_service_marks_failover_and_persists_segments() -> None:
    runtime = _build_runtime("video_tts_case")
    service = TTSService(
        providers=[SimpleNamespace(provider_id="primary-tts"), SimpleNamespace(provider_id="backup-tts")],
        failover_service=FakeFailoverService(
            synthesize_results=[
                SimpleNamespace(provider="primary-tts", content="audio-1"),
                SimpleNamespace(provider="backup-tts", content="audio-2"),
                SimpleNamespace(provider="backup-tts", content="audio-3"),
            ]
        ),
        runtime=runtime,
        settings=_build_settings(),
    )

    result = asyncio.run(service.execute(task_id="video_tts_case", storyboard=_build_storyboard()))

    assert len(result.audio_segments) == 3
    assert result.failover_occurred is True
    assert result.provider_used == ["primary-tts", "backup-tts", "backup-tts"]
    persisted = runtime.load_value("tts_result")
    assert isinstance(persisted, dict)


def test_compose_service_builds_expected_ffmpeg_commands() -> None:
    service = ComposeService(settings=_build_settings(), runtime=_build_runtime("video_compose_case"))

    compose_command = service.build_compose_command("video.mp4", "audio.mp3", "output.mp4")
    cover_command = service.build_cover_command("output.mp4", "cover.jpg")

    assert compose_command == [
        "ffmpeg",
        "-y",
        "-i",
        "video.mp4",
        "-i",
        "audio.mp3",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        "output.mp4",
    ]
    assert cover_command == [
        "ffmpeg",
        "-y",
        "-ss",
        "1",
        "-i",
        "output.mp4",
        "-frames:v",
        "1",
        "-q:v",
        "2",
        "cover.jpg",
    ]


def test_upload_service_retries_and_persists_result(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    runtime = _build_runtime("video_upload_case")
    asset_store = LocalAssetStore(root_dir=tmp_path / "assets", cos_client=CosClient("https://cos.test.local"))
    service = UploadService(asset_store=asset_store, settings=_build_settings(video_upload_retry_attempts=1), runtime=runtime)

    compose_dir = tmp_path / "video_compose_upload_case"
    compose_dir.mkdir()
    video_path = compose_dir / "output.mp4"
    cover_path = compose_dir / "cover.jpg"
    video_path.write_bytes(b"video")
    cover_path.write_bytes(b"cover")

    compose_result = ComposeResult(
        video_path=str(video_path),
        cover_path=str(cover_path),
        duration=12,
        file_size=video_path.stat().st_size,
    )

    original_copy_file = asset_store.copy_file
    state = {"calls": 0}
    retry_events: list[tuple[int, int, str]] = []
    sleep_calls: list[int] = []

    def flaky_copy_file(source_path: str | Path, key: str):  # noqa: ANN001
        state["calls"] += 1
        if state["calls"] == 1:
            raise RuntimeError("temporary upload failure")
        return original_copy_file(source_path, key)

    async def fake_sleep(seconds: int) -> None:
        sleep_calls.append(seconds)

    async def on_retry(retry_attempt: int, total_retries: int, exc: Exception) -> None:
        retry_events.append((retry_attempt, total_retries, str(exc)))

    monkeypatch.setattr(asset_store, "copy_file", flaky_copy_file)
    monkeypatch.setattr("app.features.video.pipeline.services.asyncio.sleep", fake_sleep)

    result = asyncio.run(
        service.execute(task_id="video_upload_case", compose_result=compose_result, on_retry=on_retry)
    )

    assert result.video_url.endswith("/video/video_upload_case/output.mp4")
    assert result.cover_url.endswith("/video/video_upload_case/cover.jpg")
    assert retry_events == [(1, 1, "temporary upload failure")]
    assert sleep_calls == [1]
    persisted = runtime.load_value("upload_result")
    assert isinstance(persisted, dict)


def test_artifact_writeback_service_outputs_required_artifact_types(tmp_path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path / "assets", cos_client=CosClient("https://cos.test.local"))
    service = ArtifactWritebackService(asset_store=asset_store)
    storyboard = _build_storyboard()
    tts_result = SimpleNamespace(
        audio_segments=[
            AudioSegment(scene_id="scene_1", audio_path="audio-1.mp3", duration=40, format="mp3"),
            AudioSegment(scene_id="scene_2", audio_path="audio-2.mp3", duration=40, format="mp3"),
            AudioSegment(scene_id="scene_3", audio_path="audio-3.mp3", duration=40, format="mp3"),
        ]
    )
    manim_code = ManimCodeResult(
        script_content="from manim import *\nclass GeneratedLesson(Scene):\n    pass\n",
        scene_mapping=[],
        provider_used="stub-llm",
    )

    graph, ref = service.execute(
        task_id="video_artifact_case",
        understanding=_build_understanding(),
        storyboard=storyboard,
        tts_result=tts_result,
        manim_code=manim_code,
    )

    artifact_types = {artifact.artifact_type.value for artifact in graph.artifacts}
    assert artifact_types == {
        "timeline",
        "storyboard",
        "narration",
        "knowledge_points",
        "solution_steps",
        "manim_code",
    }
    assert asset_store.exists(ref) is True
