{{#if sceneDesign}}
Storyboard:

{{sceneDesign}}

{{/if}}
Concept: {{concept}}
Seed: {{seed}}
Output mode: {{outputMode}}
Layout family: {{layoutFamily}}
Target section duration: {{sectionDuration}} seconds

## Goal Layer
### Input Expectation
- The storyboard is the primary source of truth.
- Each section has a target duration of {{sectionDuration}} seconds.

### Output Requirement
- Convert the storyboard into runnable Manim code.
- Prioritize faithful execution over reinterpretation.
- **TIMING (MANDATORY): The total animation run_time per section must approximate {{sectionDuration}} seconds.**
  - If the storyboard lists sub-steps with run_time estimates, follow them.
  - If animations complete before {{sectionDuration}} seconds, add `self.wait(remaining_seconds)` at the end of the section to reach the target.
  - remaining_seconds = {{sectionDuration}} - (sum of all animation run_times in this section)
  - Example: if animations total 18s and target is 30s, add `self.wait(12)` before `self.clear()`.

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
5. check that total run_time per section approximates {{sectionDuration}} seconds
6. add `self.wait()` at the end if needed to reach the target duration

### Working Principles
- Prefer explicit cleanup over lingering temporary objects.
- Keep geometry readable before adding extra text.
- Keep layout stable across adjacent shots.
- Respect any `transition bridge` note from the storyboard. Recreate the shared anchor first, then continue the explanation.
- After each section's final key transform, add a brief settle/hold so the cut into the next section does not feel abrupt.
- Do not let the visual section finish before the corresponding spoken thought has clearly landed.

## Protocol Layer
### Output Rules
- Start with `### START ###`
- End with `### END ###`
- Use `from manim import *`
- Use `MainScene` as the main class
- Use `self.next_section("section_N")` at the start of each section
- Use `self.clear()` between sections to prevent cross-section occlusion
- Never set an opaque fullscreen background; the exported WebM must keep transparency
- When a section ends on an important formula or diagram, leave a short hold on that final frame before the section ends
- If the next section inherits context, rebuild the shared anchor in the same layout slot before adding new objects

### Timing Rules (MANDATORY)
- Each section's total animation time (sum of all run_time values) must approximate {{sectionDuration}} seconds.
- Use `self.wait(remaining)` at the END of each section (before `self.clear()`) to fill any gap between actual animation time and the target duration.
- Do NOT skip the `self.wait()` — it ensures the video matches the narration audio length.

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
- Do not cut away on an unfinished spoken clause or unresolved visual transition.
- Do NOT omit `self.wait()` at the end of a section if the animation run_time falls short of {{sectionDuration}} seconds.
