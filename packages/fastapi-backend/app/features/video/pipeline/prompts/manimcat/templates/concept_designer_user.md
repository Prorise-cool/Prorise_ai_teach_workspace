Design an executable storyboard for this concept.

Concept: {{concept}}
Seed: {{seed}}
Output mode: {{outputMode}}
Target duration: {{duration}} minutes
Target sections: {{sectionCount}}
Layout constraint: {{layoutHint}}

## Goal Layer
### Input Expectation
- The concept is the core teaching target.
- If the input already contains an upstream structure, preserve its order and intent.
- Design exactly {{sectionCount}} shots (one per section), each approximately {{sectionDuration}} seconds.
- If a layout constraint is specified, you MUST use that layout template for all shots.
- The entire storyboard must stay inside one layout family only; do not switch families between shots.

### Output Requirement
- Produce a director-ready storyboard for code generation.
- The storyboard must make placement, transforms, persistence, and exits precise enough to implement directly.
- Each shot maps to one video section. Use `self.clear()` at the start of each shot to prevent cross-section overlap.

## Knowledge Layer
### Useful Context
- Use English command language in the storyboard.
- Use mixed placement:
  - exact coordinates for important anchors
  - relative placement for secondary relations
- Stable layouts are preferred.

## Behavior Layer
### Workflow
1. define the teaching target
2. define the global layout
3. define the persistent and temporary objects
4. define the shot-by-shot commands
5. review overlap, focus, and lifecycle

### Working Principles
- If a scene is crowded, split it.
- Prefer visual reasoning over formula stacking.
- Prefer explicit exits over lingering objects.
- End every shot with a stable end state that can hold for about 0.3-0.8 seconds without adding new information.
- Make Shot N+1 visually acknowledge Shot N before introducing new complexity.
- Every `narration_hint` must be fully speakable on its own. No half-sentence carry-over to the next shot.
- If an explanation needs two shots, split it at a natural sentence boundary and let the next shot restart with a short recap phrase.

## Protocol Layer
### Command Language
Use command lines such as:
- `duration 30s`
- `layout left_panel graph_main at (-3.2, 0), right_panel formula_main at (3.1, 0)`
- `focus area_transfer`
- `enter square_left and square_right`
- `keep axes and title`
- `exit helper_grid and temp_label`
- `transform cut_piece -> filled_gap`
- `scale formula_main 0.9, helper_label 0.7`
- `note no overlap with graph_main`

### Layout Templates
Only use one of these stable layout families for the entire task:
- `center_stage`
- `two_column`

Subtitle safe zone rule:
- Reserve the bottom subtitle band for front-end DOM subtitles.
- Important formulas, labels, graphs, and arrows must stay above the subtitle band.
- Add a `note` line when needed to confirm the subtitle safe zone is preserved.

### Narration Hint（旁白提示 — 中文口语化）
For each shot, include a `narration_hint` line (1-2 sentences) in **Chinese** describing what the teacher should say. This will be used for TTS generation.

中文口语化规则（必须遵守）：
- 数学符号必须转换为口语：x² → "x的平方"，√x → "根号x"，∫ → "积分"，∑ → "求和"，≤ → "小于等于"
- LaTeX 公式不在旁白中出现，用自然语言描述
- 使用自然的教学语气，不要书面化
- 示例：narration_hint: "我们来看，当x的平方加上2x的时候，这个函数的图像是什么样子的呢？"
- 每个 `narration_hint` 必须在当前 Shot 内语义闭合，不能把一句话拆到下一个 Shot 继续说
- 句尾尽量是结论、追问或自然停顿，不要以“所以接下来我们”“然后我们再来”这类未完成连接词结尾

### Output Format
Wrap everything in `<design>` and `</design>`.
Inside, use exactly this structure:

<design>
# Design

## Goal
- what the viewer should understand
- the main obstacle
- the visual strategy

## Layout
- the global screen layout
- the main zones
- the important anchor coordinates

## Object Rules
- persistent core objects
- temporary helper objects
- default exit behavior for non-core objects

## Shot Plan
### Shot 1: [section title]
duration 30s
narration_hint: "..."
layout ...
focus ...
enter ...
keep ...
exit ...
transform ...
scale ...
note ...
- start state: ...
- action: ...
- end state: ...
- transition bridge: which visual anchor carries into the next shot, and how the ending frame stays readable during a short hold

### Shot 2: [section title]
...

## Review
- overlap check
- lifecycle check
- focus check
- pacing check
</design>

## Constraint Layer
### Must Not Do
- Do not write long motivational explanation.
- Do not leave object exits unclear.
- Do not allow object overlap.
- Do not let the storyboard become loose prose.
- Do not let a shot end on an unresolved narration clause.
- Do not make adjacent shots look like unrelated cold opens.

### Scene Description Rules（场景描述规则）
- 每个镜头的场景描述必须具体到：显示什么Manim对象（MathTex/Text/Circle/Arrow等）、放在什么位置、什么颜色
- 禁止抽象描述，如"展示相关概念"→ 必须改为"在画面中心显示 MathTex('\\\\int_0^1 x^2 dx')，颜色#FFD700"
- 每个动画变换必须明确：什么对象变成什么对象，用transform还是replace

### Shot Granularity（分镜粒度）
- 每个Shot内最多2个同时活跃的复杂对象（公式、图形）
- 如果一个概念需要超过3步才能讲清楚，考虑拆成2个Shot
- 复杂公式分步显示：先显示一部分，再追加，不要一次性全部出现
- 每个Shot的duration建议15-30秒

### Visual Complexity Guard（视觉复杂度守卫 — 防止公式重叠）
- 在引入新公式前，必须先明确exit或FadeOut不再需要的旧公式
- 公式之间间距至少1个网格单位
- 同一时刻画面上最多2个MathTex对象
- 使用`note`命令标注复杂度检查结果
