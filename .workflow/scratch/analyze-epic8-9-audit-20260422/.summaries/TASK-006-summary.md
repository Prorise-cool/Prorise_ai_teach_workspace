# TASK-006: 测验回看前端页 + history 卡片拆双按钮

## Changes
- `packages/student-web/src/types/learning.ts`: 新增 `QuizHistoryItem` / `QuizHistoryPayload`，与后端 `QuizHistoryEnvelope.data` 对齐（camelCase）。
- `packages/student-web/src/services/api/adapters/learning-coach-adapter.ts`:
  - `LearningCoachAdapter` 接口加 `getQuizHistory({ quizId })`。
  - Real 实现：`GET /api/v1/learning-coach/quiz/history/{quizId}`（路径参数 `encodeURIComponent`）。
  - Mock 实现：调用 fixtures 的 `historySuccess({ quizId })` 工厂。
- `packages/student-web/src/services/mock/fixtures/learning-coach.ts`: 新增 `quiz.historySuccess` 工厂（接受 `quizId` 返回 2 题样例，含对错各一条）。
- `packages/student-web/src/features/learning-coach/pages/learning-quiz-review-page.tsx` (新建):
  - `useParams` 拿 `sessionId/quizId`。
  - `adapter.getQuizHistory({ quizId })`，`ApiClientError` 分 `404 → not_found`、`503 → unavailable`、其他 → error。
  - 只读渲染：总分头、逐题卡（正确选项绿色 + Check，错选红色 + X，其余灰），每题智能解析；所有 option 用 `div` + `aria-disabled`。
- `packages/student-web/src/app/routes/index.tsx`: 新增 `loadLearningQuizReviewRoute`；在 `quiz/:sessionId` 旁注册 `quiz/:sessionId/review/:quizId`。
- `packages/student-web/src/features/learning-center/pages/history/history-record-card-quiz.tsx`:
  - quizId 从 `record.detailRef` 回退到 `record.sourceResultId`。
  - 单个 Link 拆成两按钮：「查看原卷」→ `/quiz/{sessionId}/review/{quizId}`（若 quizId 缺失则禁用展示）、「再测一次」→ `/coach/{sessionId}?sourceType=quiz&sourceSessionId=...&topicHint=...&returnTo=/history`。

## Verification
- [x] C1-C8 convergence.criteria grep 全部通过。
- [x] `pnpm typecheck` exit 0。
- [x] 不再存在裸 `/quiz/${record.sourceSessionId}`（不带 `/review/`）。

## Tests
- [x] `cd packages/student-web && pnpm typecheck` — pass。

## Deviations
- None.

## Notes
- 旧 i18n key `learningCenter.history.quizReview` 现未被使用（保留未删，后续清理）。
- `record.detailRef` / `record.sourceResultId` 在 RuoYi `LearningCenterRecordVo` 已返回；若真实数据里 detailRef 不是 quizId，而只有 sourceResultId 是，则回退链仍可用。若两者都缺，按钮会以 disabled 形态展示「查看原卷」而不是跳坏链接。
- `ApiClientError` 从 `@/services/api/client` 导出（已验证 index.ts）。
