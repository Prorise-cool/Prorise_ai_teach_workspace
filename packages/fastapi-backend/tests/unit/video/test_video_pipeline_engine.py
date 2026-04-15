from __future__ import annotations

import base64
from types import SimpleNamespace

from app.features.video.pipeline.engine.agent import (
    Section,
    TeachingVideoAgent,
    required_render_successes,
    RunConfig,
)
from app.features.video.pipeline.engine.c2v_utils import topic_to_safe_name
from app.features.video.pipeline.engine.scene_designer import (
    build_vision_user_message,
    check_response_quality,
    generate_scene_design,
    generate_unique_seed,
)
from app.features.video.pipeline.engine.sanitizer import (
    sanitize_render_error,
    infer_error_type,
    truncate_output,
    ErrorType,
)
from app.features.video.pipeline.engine.code_retry import detect_doom_loop, DoomLoopError


def test_required_render_successes_rounds_up_to_quality_gate() -> None:
    assert required_render_successes(0) == 0
    assert required_render_successes(1) == 1
    assert required_render_successes(5) == 3


def test_topic_to_safe_name_falls_back_when_title_is_stripped() -> None:
    assert topic_to_safe_name("一元二次方程组") == "video"


def test_generate_unique_seed_is_unique() -> None:
    seeds = {generate_unique_seed("same-concept") for _ in range(20)}
    assert len(seeds) == 20, "Seeds must be unique due to timestamp+random"


def test_check_response_quality_gemini_style() -> None:
    class FakeCandidate:
        content = SimpleNamespace(parts=[SimpleNamespace(text="hello")])
        finish_reason = "STOP"

    class FakeResponse:
        candidates = [FakeCandidate()]

    diag = check_response_quality(FakeResponse())
    assert diag.content == "hello"
    assert not diag.is_truncated
    assert not diag.is_refused


def test_check_response_quality_openai_truncated() -> None:
    class FakeResponse:
        class choices_:
            class message_:
                content = "partial..."
            message = message_()
            finish_reason = "length"
        choices = [choices_()]
        model = "gpt-4"

    diag = check_response_quality(FakeResponse())
    assert diag.is_truncated
    assert not diag.is_refused


def test_build_vision_user_message_includes_reference_image(tmp_path) -> None:
    image_path = tmp_path / "reference.png"
    image_path.write_bytes(b"fake-image")

    messages = build_vision_user_message("Explain the chart", [image_path])

    assert len(messages) == 1
    content = messages[0]["content"]
    assert isinstance(content, list)
    assert content[0] == {"type": "text", "text": "Explain the chart"}
    assert content[1]["type"] == "image_url"
    assert content[1]["image_url"]["url"] == (
        f"data:image/png;base64,{base64.b64encode(b'fake-image').decode()}"
    )


def test_generate_scene_design_passes_multimodal_messages_to_api(tmp_path) -> None:
    image_path = tmp_path / "reference.png"
    image_path.write_bytes(b"scene-reference")
    captured: dict[str, object] = {}

    class FakeResponse:
        class choices_:
            class message_:
                content = "<design>demo</design>"

            message = message_()
            finish_reason = "stop"

        choices = [choices_()]
        model = "gpt-4.1"

    def fake_api(payload, max_tokens=0, **kwargs):  # noqa: ANN001
        captured["payload"] = payload
        captured["max_tokens"] = max_tokens
        return FakeResponse()

    result = generate_scene_design(
        concept="二次函数",
        reference_images=[image_path],
        api_func=fake_api,
        max_tokens=321,
    )

    assert result == "demo"
    assert captured["max_tokens"] == 321
    payload = captured["payload"]
    assert isinstance(payload, list)
    assert payload[0]["role"] == "system"
    assert isinstance(payload[1]["content"], list)
    assert payload[1]["content"][1]["type"] == "image_url"


def test_sanitize_render_error_truncates() -> None:
    long_stderr = "x" * 10000
    result = sanitize_render_error(long_stderr, code="print(1)")
    assert result.stderr_truncated
    assert len(result.message) <= 500


def test_sanitize_render_error_classifies() -> None:
    assert infer_error_type("SyntaxError: invalid syntax") == ErrorType.SYNTAX
    assert infer_error_type("ModuleNotFoundError: no foo") == ErrorType.IMPORT
    assert infer_error_type("LaTeX compilation error") == ErrorType.LATEX
    assert infer_error_type("something weird") == ErrorType.UNKNOWN


def test_doom_loop_detection() -> None:
    assert not detect_doom_loop(["a", "b", "c"])
    assert not detect_doom_loop(["a", "a"])
    assert detect_doom_loop(["a", "a", "a"])
    assert detect_doom_loop(["a", "b", "a", "a", "a"])


def test_section_dataclass() -> None:
    s = Section(id="s1", title="Test", lecture_lines=["line1"], animations=["anim1"])
    assert s.id == "s1"
