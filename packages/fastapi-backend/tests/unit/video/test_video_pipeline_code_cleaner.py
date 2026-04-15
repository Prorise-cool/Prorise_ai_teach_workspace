from app.features.video.pipeline.engine.code_cleaner import clean_manim_code


def test_clean_manim_code_strips_markdown_fences_before_guard() -> None:
    raw = """```python
from manim import *

class DemoScene(Scene):
    def construct(self):
        self.wait(0.1)
```"""

    result = clean_manim_code(raw)

    assert result.code.startswith("from manim import *")
    assert "```" not in result.code
    assert "Stripped response wrapper / markdown fences" in result.changes
