# Video Pipeline Stages

Story 4.1 冻结的视频流水线阶段、进度区间与显示语义。

## Stages

| stage | displayLabel | progressStart | progressEnd | estimatedDurationSeconds | conditional |
|------|--------------|---------------|-------------|--------------------------|-------------|
| `understanding` | `理解题目` | `0` | `12` | `3-8` | `false` |
| `storyboard` | `生成分镜` | `13` | `25` | `5-10` | `false` |
| `manim_gen` | `生成动画脚本` | `26` | `45` | `8-20` | `false` |
| `manim_fix` | `修复动画脚本` | `46` | `55` | `5-15` | `true` |
| `render` | `渲染动画` | `56` | `70` | `15-40` | `false` |
| `tts` | `生成旁白` | `71` | `84` | `8-20` | `false` |
| `compose` | `合成视频` | `85` | `94` | `5-12` | `false` |
| `upload` | `上传结果` | `95` | `100` | `3-10` | `false` |

## Rules

- 所有阶段总进度区间连续、不重叠，并完整覆盖 `0-100`。
- `stageProgress` 表示当前阶段内部的 `0-100` 进度。
- `progress` 表示整个任务的全局进度。
- `manim_fix` 为条件阶段。若首次渲染成功，可直接从 `manim_gen` 进入 `render` 或 `tts`。
- `/api/v1/tasks/:id/status` 与 SSE `progress` 事件使用相同的阶段语义：
  - `stage`
  - `currentStage`
  - `stageLabel`
  - `stageProgress`
  - `progress`

## SSE Context Example

```json
{
  "stage": "render",
  "currentStage": "render",
  "stageLabel": "渲染动画",
  "stageProgress": 50,
  "progress": 63
}
```
