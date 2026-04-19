Design an executable storyboard for this concept.

Concept: {{concept}}
Seed: {{seed}}
Output mode: {{outputMode}}
Target duration: {{duration}} minutes
Minimum sections: {{sectionCount}} (design MORE if needed to explain thoroughly)
Layout constraint: {{layoutHint}}

## Goal Layer
### Input Expectation
- The concept is the core teaching target.
- If the input already contains an upstream structure, preserve its order and intent.
- Design AT LEAST {{sectionCount}} shots (one per section), each approximately {{sectionDuration}} seconds.
- **CRITICAL: You MUST design MORE sections if the concept needs deeper explanation. Never truncate an explanation to fit the section count.**
- If a layout constraint is specified, you MUST use that layout template for all shots.
- The entire storyboard must stay inside one layout family only; do not switch families between shots.

### Thoroughness Requirement (MANDATORY — 最高优先级)
- EVERY knowledge point MUST be explained THOROUGHLY. Superficial treatment is the #1 quality failure.
- 宁可多花2-3个section讲透一个知识点，也不要蜻蜓点水式地每个知识点只提一句。
- If a concept needs intuition → derivation → example → common mistake → conclusion to be understood, design ALL those steps as separate shots.
- NEVER compress or skip explanation steps. Add more sections instead of rushing.
- The viewer should feel "this teacher explains things thoroughly" not "this video rushes through everything".

### Narration Requirement (MANDATORY — 直接决定视频时长)
- Each `narration_hint` MUST contain 3-5 complete sentences, at least {{narrationCharTarget}} Chinese characters.
- Chinese TTS reads at approximately 5 characters/second. For a {{sectionDuration}}-second section, you need {{narrationCharTarget}} characters of narration to fill the time.
- Narration style: natural teacher's oral style, as if explaining to students in class. Use phrases like "我们来看一下...", "注意观察...", "这里有一个关键点...".
- Narration structure per shot: 引入问题/概念(1句) → 详细解释/推导(2-3句) → 示例/直观理解(1句) → 小结/过渡(1句)
- Each `narration_hint` must be semantically complete within the current Shot. No half-sentence carry-over.

### Animation Step Requirement (MANDATORY — 动画必须足够丰富)
- Each Shot MUST list at least 3-5 distinct animation sub-steps (not just "enter X and keep").
- Break down each shot into granular steps:
  1. enter title/label (run_time ~1-2s)
  2. enter or build core visual object (run_time ~2-4s)
  3. animate/transform to demonstrate the concept (run_time ~3-8s)
  4. add annotations, formulas, or highlights (run_time ~2-3s)
  5. settle on final state with brief hold (run_time ~1-2s)
- The total run_time across all sub-steps should approximate the Shot's duration ({{sectionDuration}}s).
- If a concept requires a complex multi-step animation, split it into multiple shots rather than compressing.

### Output Requirement
- Produce a director-ready storyboard for code generation.
- The storyboard must make placement, transforms, persistence, and exits precise enough to implement directly.
- Each shot maps to one video section. Use `self.clear()` at the start of each shot to prevent cross-section occlusion.

## Knowledge Layer
### Useful Context
- Use English command language in the storyboard.
- Use mixed placement:
  - exact coordinates for important anchors
  - relative placement for secondary relations
- Stable layouts are preferred.

## Behavior Layer
### Workflow
1. analyze the concept deeply — identify ALL sub-topics that need explanation
2. determine how many shots are needed to explain each sub-topic thoroughly (likely MORE than {{sectionCount}})
3. define the teaching target
4. define the global layout
5. define the persistent and temporary objects
6. define the shot-by-shot commands with granular sub-steps
7. review overlap, focus, lifecycle, and pacing

### Working Principles
- If a scene is crowded, split it into two shots.
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
For each shot, include a `narration_hint` line (3-5 sentences, at least {{narrationCharTarget}} characters) in **Chinese** describing what the teacher should say. This will be used for TTS generation.

中文口语化规则（必须遵守）：
- 数学符号必须转换为口语：x² → "x的平方"，√x → "根号x"，∫ → "积分"，∑ → "求和"，≤ → "小于等于"
- LaTeX 公式不在旁白中出现，用自然语言描述
- 使用自然的教学语气，像老师上课一样："我们来看一下..."、"注意观察..."、"这里有个很关键的点..."
- 示例（这是好的旁白长度和风格）：narration_hint: "我们来看，当x的平方加上2x的时候，这个函数的图像是什么样子的呢？注意观察这条抛物线，它的开口方向是向上的。当x取不同的值时，函数值会怎么变化？我们代入几个具体的数字来感受一下。最后大家注意，这个最低点就是函数的极小值。"
- 每个 `narration_hint` 必须在当前 Shot 内语义闭合，不能把一句话拆到下一个 Shot 继续说
- 句尾尽量是结论、追问或自然停顿，不要以"所以接下来我们""然后我们再来"这类未完成连接词结尾

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
narration_hint: "..."（3-5 sentences, at least {{narrationCharTarget}} chars）
layout ...
focus ...
enter ...
keep ...
exit ...
transform ...
scale ...
note ...
- start state: ...
- action (break into sub-steps with run_time):
  - step 1: enter title_text, run_time ~1s
  - step 2: build graph_axes, run_time ~3s
  - step 3: animate curve growing, run_time ~5s
  - step 4: add annotation label, run_time ~2s
  - step 5: settle, run_time ~1s
- end state: ...
- transition bridge: which visual anchor carries into the next shot, and how the ending frame stays readable during a short hold

### Shot 2: [section title]
...

## Review
- overlap check
- lifecycle check
- focus check
- pacing check
- thoroughness check: every knowledge point explained in depth?
</design>

## Constraint Layer
### Must Not Do
- Do NOT write short 1-sentence narration hints. Each must be 3-5 sentences, at least {{narrationCharTarget}} characters.
- Do NOT compress explanation steps to fit a section count. Add more sections.
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
- 如果一个概念需要超过3步才能讲清楚，必须拆成2个Shot
- 复杂公式分步显示：先显示一部分，再追加，不要一次性全部出现
- 每个Shot的duration建议15-30秒
- 每个Shot的sub-step至少3-5个，确保动画足够丰富

### Visual Complexity Guard（视觉复杂度守卫 — 防止公式重叠）
- 在引入新公式前，必须先明确exit或FadeOut不再需要的旧公式
- 公式之间间距至少1个网格单位
- 同一时刻画面上最多2个MathTex对象
- 使用`note`命令标注复杂度检查结果
