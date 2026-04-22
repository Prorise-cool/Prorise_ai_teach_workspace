# TASK-002: 前端在 generation_source=fallback 时展示显式警示条

## Changes
- `packages/student-web/src/types/learning.ts`: 新增 `LearningCoachGenerationSource` 字面量联合类型 `'llm' | 'fallback'`，并为 `CheckpointGeneratePayload` / `QuizGeneratePayload` / `LearningPathPlanPayload` 追加可选 `generationSource` 字段（对齐后端 `CamelCaseModel` 的 `generation_source`）。
- `packages/student-web/src/features/learning-coach/pages/fallback-banner.tsx`（新）: 抽出 `FallbackBanner` 组件，`mode: 'quiz' | 'checkpoint' | 'path'`，使用 `bg-warning/10 border-warning/30 text-warning` token + `AlertTriangle` 图标；文案按规范三条分别固化。
- `packages/student-web/src/features/learning-coach/pages/learning-assessment-page.tsx`: `AssessmentState` 扩展 `generationSource`，`generateCheckpoint` / `generateQuiz` 成功后回填；在题卡容器上方条件渲染 `<FallbackBanner mode={mode} />`。
- `packages/student-web/src/features/learning-coach/pages/learning-path-page.tsx`: `view-path` 顶部条件渲染 `<FallbackBanner mode="path" />`，依赖 `plan.generationSource`。

## Verification
- [x] learning-assessment-page.tsx contains `generationSource` & `fallback`: grep 命中 6 次
- [x] learning-path-page.tsx contains `generationSource`: grep 命中 1 次
- [x] `AI 出题服务暂不可用` 命中 ≥1: 命中 1 个文件（fallback-banner.tsx）
- [x] `pnpm typecheck` exits 0: 通过，tsc 无错误

## Tests
- [x] `cd packages/student-web && pnpm typecheck`: PASS（无输出即成功）

## Deviations
- None. 未写死色值，全部复用 `warning` / `text-primary` token。checkpoint 与 quiz 共用同一文案（任务描述允许两者一致）。

## Notes
- 持久化 sessionStorage 里旧快照不含 `generationSource`，恢复后为 `undefined`，banner 不出现，属预期行为（回看场景）。
- 后续若后端把 `generation_source` 暴露在 `CheckpointSubmitPayload` / `QuizSubmitPayload`，可在 submit 回填后继续驱动 banner，当前只基于 generate 阶段即可覆盖用户关键疑虑。
- **Commit 归属**：因 wave1 并行执行，TASK-003 的提交 `fffdb7d` 在 `git add` 阶段把本任务所有修改一起吸收打包；working tree 已包含 TASK-002 全部变更，但 commit message 显示为 TASK-003。未做 amend（遵循 git safety protocol: never amend prior commits）。本任务内容已完全落盘，审计时通过 `git show fffdb7d -- packages/student-web/...` 可看到对应 diff。
