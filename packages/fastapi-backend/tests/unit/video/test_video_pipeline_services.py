from __future__ import annotations

import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.features.video.pipeline.auto_fix import ast_fix_code
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.manim_runtime_prelude import (
    MANIM_RUNTIME_PRELUDE,
    MANIM_RUNTIME_TEX_TEMPLATE_NAME,
)
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
from app.features.video.pipeline.script_templates import (
    build_default_fix_script,
    build_default_manim_script,
)
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
from app.providers.failover import ProviderAllFailedError
from app.shared.cos_client import CosClient


class FakeFailoverService:
    def __init__(self, *, generate_results=None, synthesize_results=None) -> None:
        self._generate_results = list(generate_results or [])
        self._synthesize_results = list(synthesize_results or [])
        self.generate_calls: list[dict[str, object]] = []
        self.synthesize_calls: list[dict[str, object]] = []

    async def generate(  # noqa: ANN001
        self,
        providers,
        prompt: str,
        emit_switch=None,
        ignore_cached_unhealthy: bool = False,
    ):
        self.generate_calls.append(
            {
                "provider_ids": [provider.provider_id for provider in providers],
                "prompt": prompt,
                "ignore_cached_unhealthy": ignore_cached_unhealthy,
            }
        )
        if not self._generate_results:
            raise AssertionError("missing fake generate result")
        return self._generate_results.pop(0)

    async def synthesize(self, providers, text: str, voice_config=None, emit_switch=None):  # noqa: ANN001
        self.synthesize_calls.append(
            {
                "provider_ids": [provider.provider_id for provider in providers],
                "text": text,
                "voice_config": voice_config,
            }
        )
        if not self._synthesize_results:
            raise AssertionError("missing fake synthesize result")
        return self._synthesize_results.pop(0)


class RecordingTtsProvider:
    def __init__(self, provider_id: str, *, voice_code: str, sample_rate: int, should_fail: bool = False) -> None:
        self.provider_id = provider_id
        self.config = SimpleNamespace(
            timeout_seconds=1,
            retry_attempts=0,
            settings={
                "voice_code": voice_code,
                "sample_rate": sample_rate,
            },
        )
        self._should_fail = should_fail
        self.received_voice_ids: list[str | None] = []
        self.received_sample_rates: list[int | None] = []

    async def synthesize(self, text: str, voice_config=None):  # noqa: ANN001
        self.received_voice_ids.append(getattr(voice_config, "voice_id", None))
        self.received_sample_rates.append(getattr(voice_config, "sample_rate", None))
        if self._should_fail:
            raise TimeoutError(f"{self.provider_id} timeout for {text}")
        return SimpleNamespace(provider=self.provider_id, content=f"audio:{text}")


class SequentialFailoverService:
    async def synthesize(self, providers, text: str, voice_config=None, emit_switch=None):  # noqa: ANN001
        for provider in providers:
            try:
                return await provider.synthesize(text, voice_config=voice_config)
            except TimeoutError:
                continue
        raise ProviderAllFailedError(())


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
        "video_manim_scene_by_scene_max_scenes": 3,
        "video_manim_parallel_scene_concurrency": 3,
        "video_output_audio_format": "mp3",
        "video_output_audio_sample_rate": 44100,
        "video_output_audio_bitrate": "192k",
        "video_narration_chars_per_second": 4.8,
        "video_narration_sentence_pause_seconds": 0.35,
        "video_scene_min_duration_seconds": 4,
        "video_scene_max_duration_seconds": 28,
        "video_scene_ambient_motion_chunk_seconds": 4.0,
        "video_compose_max_pad_seconds": 12.0,
        "video_compose_max_pad_ratio": 0.25,
        "video_compose_max_stretch_ratio": 2.5,
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


def test_understanding_service_normalizes_solution_step_aliases() -> None:
    runtime = _build_runtime("video_understanding_alias_case")
    service = UnderstandingService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[
                SimpleNamespace(
                    provider="stub-llm",
                    content=(
                        '{"topicSummary":"苹果加法","knowledgePoints":["加法"],'
                        '"solutionSteps":[{"step":1,"action":"先展示一个苹果"},{"step":2,"action":"再展示另一个苹果"}],'
                        '"difficulty":"easy","subject":"math"}'
                    ),
                )
            ]
        ),
        runtime=runtime,
    )

    result = asyncio.run(
        service.execute(source_payload={"text": "用苹果解释一加一等于二。"}, user_profile={"grade": "primary"})
    )

    assert [step.step_id for step in result.solution_steps] == ["step_1", "step_2"]
    assert [step.title for step in result.solution_steps] == ["步骤 1", "步骤 2"]
    assert [step.explanation for step in result.solution_steps] == ["先展示一个苹果", "再展示另一个苹果"]


def test_storyboard_service_normalizes_scene_duration_to_target_range() -> None:
    runtime = _build_runtime("video_storyboard_case")
    storyboard_json = (
        '{"scenes":['
        '{"sceneId":"scene_1","title":"引入","narration":"开场","visualDescription":"展示题目","durationHint":100,"order":1},'
        '{"sceneId":"scene_2","title":"分析","narration":"分析条件","visualDescription":"标注条件","durationHint":100,"order":2},'
        '{"sceneId":"scene_3","title":"总结","narration":"总结结论","visualDescription":"展示结果","durationHint":100,"order":3}'
        '],"totalDuration":300,"targetDuration":120}'
    )
    service = StoryboardService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[
                SimpleNamespace(provider="stub-llm", content=storyboard_json),
            ]
        ),
        runtime=runtime,
        settings=_build_settings(video_target_duration_seconds=120),
    )

    result = asyncio.run(service.execute(understanding=_build_understanding()))

    assert result.total_duration == 120
    assert result.target_duration == 120
    assert sum(scene.duration_hint for scene in result.scenes) == 120
    assert [scene.order for scene in result.scenes] == [1, 2, 3]
    persisted = runtime.load_model("storyboard", Storyboard)
    assert persisted is not None


def test_storyboard_service_tolerates_partial_scene_fields_from_real_llm_output() -> None:
    runtime = _build_runtime("video_storyboard_partial_case")
    partial_json = (
        '{"scenes":['
        '{"sceneId":"scene_1","narration":"先回顾平方差公式","content":"展示公式 a²-b²=(a+b)(a-b)"},'
        '{"sceneId":"scene_2","voiceover":"再用例题演示","description":"代入 x²-9"}'
        '],"totalDuration":60,"targetDuration":120}'
    )
    service = StoryboardService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[
                SimpleNamespace(provider="stub-llm", content=partial_json),
            ]
        ),
        runtime=runtime,
        settings=_build_settings(video_target_duration_seconds=120),
    )

    result = asyncio.run(service.execute(understanding=_build_understanding()))

    assert len(result.scenes) == 2
    assert result.scenes[0].title == "步骤 1"
    assert result.scenes[0].visual_description == "展示公式 a²-b²=(a+b)(a-b)"
    assert result.scenes[1].narration == "再用例题演示"
    assert result.scenes[1].duration_hint >= 1
    assert result.total_duration == sum(scene.duration_hint for scene in result.scenes)
    assert result.total_duration >= 90


def test_storyboard_service_maps_prompt_native_voice_text_and_image_desc_fields() -> None:
    runtime = _build_runtime("video_storyboard_prompt_native_case")
    prompt_native_json = (
        '{"scenes":['
        '{"sceneId":"scene_1","title":"引入","voiceText":"先观察题目条件","imageDesc":"高亮题干中的已知条件","durationHint":18},'
        '{"sceneId":"scene_2","title":"总结","voiceText":"最后总结解题方法","imageDesc":"高亮最终结论","durationHint":16}'
        '],"targetDuration":120}'
    )
    service = StoryboardService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[SimpleNamespace(provider="stub-llm", content=prompt_native_json)]
        ),
        runtime=runtime,
        settings=_build_settings(video_target_duration_seconds=120),
    )

    result = asyncio.run(service.execute(understanding=_build_understanding()))

    assert result.scenes[0].narration == "先观察题目条件"
    assert result.scenes[0].visual_description == "高亮题干中的已知条件"
    assert result.scenes[1].voice_text == "最后总结解题方法"
    assert result.scenes[1].image_desc == "高亮最终结论"


def test_rule_based_fixer_wraps_script_with_safe_scene_defaults() -> None:
    fixer = RuleBasedFixer()

    result = fixer.fix(script_content="class Demo:\n    pass\n", error_log="NameError: ShowCreation")

    assert result.fixed is True
    assert result.fixed_script is not None
    assert "from manim import *" in result.fixed_script
    assert "(Scene)" in result.fixed_script


def test_ast_fix_normalizes_legacy_ctex_reference_without_injecting_prelude() -> None:
    fragment = 'formula = MathTex("1+1=?", tex_template=TexTemplateLibrary.ctex)'

    fixed = ast_fix_code(fragment)

    assert "TexTemplateLibrary.ctex" not in fixed
    assert f"tex_template={MANIM_RUNTIME_TEX_TEMPLATE_NAME}" in fixed
    assert MANIM_RUNTIME_PRELUDE not in fixed


def test_build_default_fix_script_injects_runtime_prelude_for_tex_template_usage() -> None:
    script = (
        "from manim import *\n\n"
        "class Demo(Scene):\n"
        "    def construct(self):\n"
        "        formula = MathTex('1+1=?', tex_template=TexTemplateLibrary.ctex)\n"
        "        self.add(formula)\n"
    )

    fixed = build_default_fix_script(script)

    assert MANIM_RUNTIME_PRELUDE in fixed
    assert "TexTemplateLibrary.ctex" not in fixed
    assert f"tex_template={MANIM_RUNTIME_TEX_TEMPLATE_NAME}" in fixed


def test_manim_generation_service_persists_generated_script() -> None:
    from app.core.config import Settings

    runtime = _build_runtime("video_manim_case")
    scene_code = "title_1 = Text('题目引入', font_size=32)\nself.add_elements(title_1)"
    # Provide enough results for scene-by-scene generation (3 scenes) + fallback (1)
    service = ManimGenerationService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[
                # Scene 1
                SimpleNamespace(provider="stub-llm", content=f"```python\n{scene_code}\n```"),
                # Scene 2
                SimpleNamespace(provider="stub-llm", content=f"```python\n{scene_code}\n```"),
                # Scene 3
                SimpleNamespace(provider="stub-llm", content=f"```python\n{scene_code}\n```"),
                # Fallback (if scene-by-scene fails)
                SimpleNamespace(
                    provider="stub-llm",
                    content="```python\nfrom manim import *\n\nclass Demo(Scene):\n    def construct(self):\n        self.wait(1)\n```",
                ),
            ]
        ),
        runtime=runtime,
        settings=Settings(),
    )

    result = asyncio.run(service.execute(storyboard=_build_storyboard()))

    assert result.script_content  # Non-empty script
    assert result.provider_used == "scene-by-scene"
    assert "self.hold_scene(" in result.script_content
    assert "self.clear_scene()" in result.script_content
    persisted = runtime.load_value("manim_code")
    assert isinstance(persisted, dict)


def test_manim_generation_service_uses_parallel_scene_generation_for_large_storyboards() -> None:
    from app.core.config import Settings

    runtime = _build_runtime("video_manim_parallel_case")
    failover = FakeFailoverService(
        generate_results=[
            SimpleNamespace(
                provider="stub-llm",
                content="```python\ntitle_1 = Text('题目引入', font_size=32)\nself.add_elements(title_1)\n```",
            ),
            SimpleNamespace(
                provider="stub-llm",
                content="```python\nformula_2 = MathTex('a^2+b^2=c^2')\nself.add_elements(formula_2)\n```",
            ),
            SimpleNamespace(
                provider="stub-llm",
                content="```python\nsummary_3 = Text('结论成立', font_size=30)\nself.add_elements(summary_3)\n```",
            )
        ]
    )
    service = ManimGenerationService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=failover,
        runtime=runtime,
        settings=Settings(
            video_manim_scene_by_scene_max_scenes=2,
            video_manim_parallel_scene_concurrency=2,
        ),
    )

    result = asyncio.run(service.execute(storyboard=_build_storyboard()))

    assert result.script_content
    assert result.provider_used == "scene-parallel"
    assert len(failover.generate_calls) == 3
    assert "self.clear_scene()" in result.script_content


def test_manim_generation_service_falls_back_to_single_pass_when_parallel_scene_invalid() -> None:
    from app.core.config import Settings

    runtime = _build_runtime("video_manim_parallel_fallback_case")
    failover = FakeFailoverService(
        generate_results=[
            SimpleNamespace(provider="stub-llm", content="```python\nif True print('broken')\n```"),
            SimpleNamespace(provider="stub-llm", content="```python\na = Text('scene 2', font_size=30)\nself.add_elements(a)\n```"),
            SimpleNamespace(provider="stub-llm", content="```python\na = Text('scene 3', font_size=30)\nself.add_elements(a)\n```"),
            SimpleNamespace(
                provider="fallback-llm",
                content=(
                    "```python\nfrom manim import *\n\n"
                    "class Demo(Scene):\n"
                    "    def construct(self):\n"
                    "        self.wait(1)\n```"
                ),
            ),
        ]
    )
    service = ManimGenerationService(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=failover,
        runtime=runtime,
        settings=Settings(video_manim_scene_by_scene_max_scenes=2),
    )

    result = asyncio.run(service.execute(storyboard=_build_storyboard()))

    assert result.script_content
    assert result.provider_used == "fallback-llm"
    assert len(failover.generate_calls) == 4
    assert failover.generate_calls[-1]["ignore_cached_unhealthy"] is True


def test_build_default_manim_script_uses_scene_duration_helpers() -> None:
    script = build_default_manim_script(_build_storyboard())

    assert "self.hold_scene(" in script
    assert "self.clear_scene()" in script
    assert "self.add_elements(title_1, body_1, run_time=0.5)" in script


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


def test_llm_based_fixer_normalizes_legacy_ctex_template_refs() -> None:
    fixer = LLMBasedFixer(
        providers=[SimpleNamespace(provider_id="stub-llm")],
        failover_service=FakeFailoverService(
            generate_results=[
                SimpleNamespace(
                    provider="stub-llm",
                    content=(
                        "```python\nfrom manim import *\n\n"
                        "class Fixed(Scene):\n"
                        "    def construct(self):\n"
                        "        formula = MathTex('a^2+b^2=c^2', tex_template=TexTemplateLibrary.ctex)\n"
                        "        self.add(formula)\n```"
                    ),
                )
            ]
        ),
    )

    result = asyncio.run(
        fixer.fix(
            storyboard=_build_storyboard(),
            script_content="class Broken:\n    pass\n",
            error_log="ValueError: xelatex error converting to xdv",
        )
    )

    assert result.fixed is True
    assert result.fixed_script is not None
    assert MANIM_RUNTIME_PRELUDE in result.fixed_script
    assert "TexTemplateLibrary.ctex" not in result.fixed_script
    assert f"tex_template={MANIM_RUNTIME_TEX_TEMPLATE_NAME}" in result.fixed_script


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
    assert Path(result.audio_segments[0].audio_path).suffix == ".wav"
    assert Path(result.audio_segments[0].audio_path).read_bytes()[:4] == b"RIFF"
    persisted = runtime.load_value("tts_result")
    assert isinstance(persisted, dict)


def test_tts_service_prefers_base64_audio_payload_when_provider_returns_real_audio() -> None:
    runtime = _build_runtime("video_tts_real_audio_case")
    service = TTSService(
        providers=[SimpleNamespace(provider_id="primary-tts")],
        failover_service=FakeFailoverService(
            synthesize_results=[
                SimpleNamespace(
                    provider="primary-tts",
                    content="ignored transcript",
                    metadata={"audioBase64": "SUQz", "audioFormat": "mp3"},
                ),
                SimpleNamespace(
                    provider="primary-tts",
                    content="ignored transcript",
                    metadata={"audioBase64": "SUQz", "audioFormat": "mp3"},
                ),
                SimpleNamespace(
                    provider="primary-tts",
                    content="ignored transcript",
                    metadata={"audioBase64": "SUQz", "audioFormat": "mp3"},
                ),
            ]
        ),
        runtime=runtime,
        settings=_build_settings(),
    )

    result = asyncio.run(service.execute(task_id="video_tts_real_audio_case", storyboard=_build_storyboard()))

    first_segment = Path(result.audio_segments[0].audio_path)
    assert first_segment.suffix == ".mp3"
    assert first_segment.read_bytes() == b"ID3"


def test_tts_service_uses_provider_specific_voice_config_after_failover() -> None:
    runtime = _build_runtime("video_tts_provider_specific_config_case")
    primary = RecordingTtsProvider(
        "primary-tts",
        voice_code="voice-primary",
        sample_rate=22050,
        should_fail=True,
    )
    backup = RecordingTtsProvider(
        "backup-tts",
        voice_code="voice-backup",
        sample_rate=48000,
    )
    service = TTSService(
        providers=[primary, backup],
        failover_service=SequentialFailoverService(),
        runtime=runtime,
        settings=_build_settings(),
    )

    result = asyncio.run(
        service.execute(
            task_id="video_tts_provider_specific_config_case",
            storyboard=_build_storyboard(),
        )
    )

    assert result.failover_occurred is True
    assert result.provider_used == ["backup-tts", "backup-tts", "backup-tts"]
    assert set(primary.received_voice_ids) == {"voice-primary"}
    assert set(backup.received_voice_ids) == {"voice-backup"}
    assert set(primary.received_sample_rates) == {22050}
    assert set(backup.received_sample_rates) == {48000}


def test_tts_service_filters_provider_chain_by_requested_voice_preference() -> None:
    runtime = _build_runtime("video_tts_voice_preference_case")
    failover = FakeFailoverService(
        synthesize_results=[
            SimpleNamespace(provider="volcengine-zh_female_yingyujiaoxue_uranus_bigtts", content="audio-1"),
            SimpleNamespace(provider="volcengine-zh_female_yingyujiaoxue_uranus_bigtts", content="audio-2"),
            SimpleNamespace(provider="volcengine-zh_female_yingyujiaoxue_uranus_bigtts", content="audio-3"),
        ]
    )
    service = TTSService(
        providers=[
            SimpleNamespace(
                provider_id="volcengine-bv001",
                config=SimpleNamespace(settings={"voice_code": "BV001", "resource_name": "标准女声 BV001"}),
            ),
            SimpleNamespace(
                provider_id="volcengine-zh_female_yingyujiaoxue_uranus_bigtts",
                config=SimpleNamespace(
                    settings={
                        "voice_code": "zh_female_yingyujiaoxue_uranus_bigtts",
                        "resource_name": "tina老师 2.0",
                        "provider_name": "豆包标准语音播报",
                        "resource_code": "doubao-voice-tina-2-0",
                    }
                ),
            ),
        ],
        failover_service=failover,
        runtime=runtime,
        settings=_build_settings(),
    )

    result = asyncio.run(
        service.execute(
            task_id="video_tts_voice_preference_case",
            storyboard=_build_storyboard(),
            voice_preference={"voiceCode": "zh_female_yingyujiaoxue_uranus_bigtts"},
        )
    )

    assert result.failover_occurred is False
    assert all(call["provider_ids"] == ["volcengine-zh_female_yingyujiaoxue_uranus_bigtts"] for call in failover.synthesize_calls)
    assert failover.synthesize_calls[0]["voice_config"].voice_id == "zh_female_yingyujiaoxue_uranus_bigtts"
    selected_voice = runtime.load_value("tts_selected_voice")
    assert selected_voice["voiceCode"] == "zh_female_yingyujiaoxue_uranus_bigtts"
    assert selected_voice["resourceCode"] == "doubao-voice-tina-2-0"


def test_compose_service_builds_expected_ffmpeg_commands() -> None:
    service = ComposeService(settings=_build_settings(), runtime=_build_runtime("video_compose_case"))

    concat_command = service.build_audio_concat_command(["scene-1.mp3", "scene-2.mp3"], "narration.m4a")
    compose_command = service.build_compose_command(
        "video.mp4",
        "narration.m4a",
        "output.mp4",
        subtitle_path="subtitles.ass",
        extend_seconds=2.5,
    )
    stretch_command = service.build_compose_command(
        "video.mp4",
        "narration.m4a",
        "output.mp4",
        subtitle_path="subtitles.ass",
        stretch_ratio=2.2,
    )
    cover_command = service.build_cover_command("output.mp4", "cover.jpg")

    assert concat_command == [
        "ffmpeg",
        "-y",
        "-i",
        "scene-1.mp3",
        "-i",
        "scene-2.mp3",
        "-filter_complex",
        "[0:a]aresample=44100,aformat=sample_rates=44100:channel_layouts=mono,asetpts=N/SR/TB[a0];"
        "[1:a]aresample=44100,aformat=sample_rates=44100:channel_layouts=mono,asetpts=N/SR/TB[a1];"
        "[a0][a1]concat=n=2:v=0:a=1[aout]",
        "-map",
        "[aout]",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "narration.m4a",
    ]
    assert compose_command == [
        "ffmpeg",
        "-y",
        "-i",
        "video.mp4",
        "-i",
        "narration.m4a",
        "-vf",
        "tpad=stop_mode=clone:stop_duration=2.500,ass=subtitles.ass",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        "output.mp4",
    ]
    assert stretch_command == [
        "ffmpeg",
        "-y",
        "-i",
        "video.mp4",
        "-i",
        "narration.m4a",
        "-vf",
        "setpts=2.200000*PTS,ass=subtitles.ass",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
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


def test_compose_service_builds_subtitle_entries_and_writes_srt(tmp_path) -> None:
    service = ComposeService(settings=_build_settings(), runtime=_build_runtime("video_compose_subtitle_case"))

    entries = service.build_subtitle_entries(
        storyboard=_build_storyboard(),
        scene_durations=[4.2, 5.0, 3.1],
        max_chars_per_line=32,
    )
    srt_path = tmp_path / "subtitles.srt"
    service.write_srt(entries, srt_path)

    assert len(entries) == 3
    assert entries[0].start_seconds == pytest.approx(0.0)
    assert entries[0].end_seconds == pytest.approx(4.2)
    assert entries[1].start_seconds == pytest.approx(4.2)
    assert entries[1].end_seconds == pytest.approx(9.2)
    assert entries[2].start_seconds == pytest.approx(9.2)
    assert entries[2].end_seconds == pytest.approx(12.3)
    assert "00:00:00,000 --> 00:00:04,200" in srt_path.read_text(encoding="utf-8")


def test_compose_service_uses_stretch_alignment_for_large_render_audio_gap() -> None:
    service = ComposeService(
        settings=_build_settings(video_compose_max_pad_seconds=12.0, video_compose_max_pad_ratio=0.25),
        runtime=_build_runtime("video_compose_alignment_case"),
    )

    alignment = service.resolve_duration_alignment(
        source_video_duration=51.8,
        merged_audio_duration=114.17,
    )

    assert alignment.mode == "stretch"
    assert alignment.extend_seconds == pytest.approx(0.0)
    assert alignment.stretch_ratio == pytest.approx(114.17 / 51.8)
    assert alignment.max_allowed_pad_seconds == pytest.approx(12.0)


def test_compose_service_rejects_gap_when_stretch_ratio_exceeds_limit() -> None:
    service = ComposeService(
        settings=_build_settings(video_compose_max_stretch_ratio=1.5),
        runtime=_build_runtime("video_compose_alignment_limit_case"),
    )

    with pytest.raises(Exception) as exc_info:
        service.resolve_duration_alignment(
            source_video_duration=51.8,
            merged_audio_duration=114.17,
        )

    assert "stretch_limit=1.50x" in str(exc_info.value)


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


def test_cos_client_from_settings_falls_back_to_local_asset_route(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = SimpleNamespace(
        environment="development",
        cos_base_url="https://cos.example.local",
        host="0.0.0.0",
        port=8090,
        api_v1_prefix="/api/v1",
    )

    monkeypatch.setattr("app.shared.cos_client.get_settings", lambda: settings)

    client = CosClient.from_settings()
    asset = client.build_asset("video/video_upload_case/output.mp4")

    assert client.base_url == "http://127.0.0.1:8090/api/v1/video/assets"
    assert asset.public_url == "http://127.0.0.1:8090/api/v1/video/assets/video/video_upload_case/output.mp4"


def test_local_asset_store_round_trips_local_asset_route_refs(tmp_path) -> None:
    asset_store = LocalAssetStore(
        root_dir=tmp_path / "assets",
        cos_client=CosClient("http://127.0.0.1:8090/api/v1/video/assets"),
    )

    asset = asset_store.write_text("video/video_upload_case/output.mp4", "video")

    assert asset_store.ref_to_key(asset.public_url) == "video/video_upload_case/output.mp4"
    assert asset_store.resolve_ref(asset.public_url).read_text(encoding="utf-8") == "video"


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
    timeline_artifact = next(artifact for artifact in graph.artifacts if artifact.artifact_type.value == "timeline")
    narration_artifact = next(artifact for artifact in graph.artifacts if artifact.artifact_type.value == "narration")
    assert timeline_artifact.data["scenes"][0]["startTime"] == 0
    assert timeline_artifact.data["scenes"][0]["endTime"] == 40
    assert timeline_artifact.data["scenes"][1]["startTime"] == 40
    assert narration_artifact.data["segments"][0]["text"] == (storyboard.scenes[0].voice_text or storyboard.scenes[0].narration)
    assert asset_store.exists(ref) is True


def test_local_asset_store_rejects_path_traversal(tmp_path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path / "assets", cos_client=CosClient("https://cos.test.local"))

    with pytest.raises(ValueError):
        asset_store.resolve_path_from_key("../secrets.txt")
