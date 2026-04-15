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
You may use stable layout templates such as:
- `two_column`
- `left_graph_right_formula`
- `center_focus_side_note`
- `top_statement_bottom_derivation`

### Narration Hint
For each shot, include a brief `narration_hint` line (1-2 sentences) describing what the teacher should say during this section. This will be used downstream for TTS generation.

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
