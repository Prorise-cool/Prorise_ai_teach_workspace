{{#if sceneDesign}}
Storyboard:

{{sceneDesign}}

{{/if}}
Concept: {{concept}}
Seed: {{seed}}
Output mode: {{outputMode}}

## Goal Layer
### Input Expectation
- The storyboard is the primary source of truth.

### Output Requirement
- Convert the storyboard into runnable Manim code.
- Prioritize faithful execution over reinterpretation.

## Knowledge Layer
### Useful Context
- Use the storyboard commands directly.
- Preserve fixed layout templates when present.
- Respect exact anchors and relative placement.
- Keep the bottom subtitle safe zone clear because subtitles are rendered by the front-end DOM layer.

## Behavior Layer
### Workflow
1. determine active objects before each shot
2. implement enter, keep, exit, and transform for the shot
3. update active objects after the shot
4. verify the final visible state

### Working Principles
- Prefer explicit cleanup over lingering temporary objects.
- Keep geometry readable before adding extra text.
- Keep layout stable across adjacent shots.

## Protocol Layer
### Output Rules
- Start with `### START ###`
- End with `### END ###`
- Use `from manim import *`
- Use `MainScene` as the main class
- Use `self.next_section("section_N")` at the start of each section
- Use `self.clear()` between sections to prevent cross-section occlusion
- Never set an opaque fullscreen background; the exported WebM must keep transparency

### Language Rule（强制中文模式）
- 所有标签、字幕、标题、说明性屏幕文字必须是中文
- 数学公式使用 MathTex() 对象（LaTeX 格式）
- 非数学文字使用 Text() 对象（中文内容）
- 变量名和内部命令用英文，面向用户的文字用中文
- 示例：`Text("我们来计算这个积分", font_size=24)` 而不是 `Text("Let's calculate this integral", font_size=24)`

## Constraint Layer
### Must Not Do
- Do not output explanation.
- Do not use Markdown code fences.
- Do not leave temporary objects without cleanup if they are no longer needed.
- Do not ignore the storyboard's placement and transform intent.
- Do not place critical content in the subtitle safe zone near the bottom edge.
