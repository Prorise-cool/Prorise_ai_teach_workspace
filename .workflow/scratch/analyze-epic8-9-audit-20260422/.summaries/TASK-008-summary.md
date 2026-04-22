# TASK-008: 学习中心 3 张 sidebar 换真数据 + 去除 quizScore=86 硬编码

## Changes
- `packages/student-web/src/services/api/adapters/learning-center-adapter.ts`: 增加 `getLearningCenterSummary({userId})` 接口方法、real 实现（调 RuoYi `GET /xiaomai/learning-center/summary`，RuoyiEnvelope 解包）、mock 实现（返回有数据 fixture），导入 `LearningCenterAggregateResponse`。
- `learning-center-page.tsx`: `Promise.allSettled` 增加第三个 call；新增 `summary` state；删除 `?? 86` useMemo 和 `extractFirstNumber` 导入；三张 sidebar 组件按 props 驱动。
- `learning-center-sidebar-recommendation.tsx`: 重写接受 `{recommendation: LatestRecommendation | null}`，有数据渲染 summary+targetRefId 跳转，无数据空态；删除 TODO(epic-9) 与两条硬编码 Link。
- `learning-center-sidebar-path-card.tsx`: 重写接受 `{path: ActiveLearningPath | null}`，动态算 progressPercent；删除 COMPLETED_STEP_COUNT/TOTAL_STEP_COUNT 常量；null 时空态「还没有学习路径」。
- `learning-center-sidebar-quiz-health.tsx`: 签名 `{averageQuizScore: number | null}`；null 时显示「—」+「完成 quiz 解锁能力视图」。
- `history-record-card-quiz.tsx`: `score` 改为 `number | null`，渲染 `{score ?? '—'}` 并条件渲染「分」后缀。

## Verification
- [x] page 无 `?? 86`：grep 计数 0
- [x] recommendation 无 `TODO(epic-9)`：grep 计数 0
- [x] path-card 无 `COMPLETED_STEP_COUNT = 0` / `TOTAL_STEP_COUNT = 0`：grep 计数 0/0
- [x] history-quiz 无 `?? 86`：grep 计数 0
- [x] recommendation 含 `LatestRecommendation`：2 次（import + prop 类型）
- [x] path-card 含 `ActiveLearningPath`：2 次
- [x] adapter 含 `getLearningCenterSummary`：3 次（interface + real + mock）

## Tests
- [x] `cd packages/student-web && pnpm typecheck`: pass（无任何错误输出）

## Deviations
- None。调用新端点采用 RuoYi direct 方式（与 adapter 内其他 9 个方法一致），未走 FastAPI proxy。

## Notes
- Real 实现用 `unwrapRuoyiEnvelope<LearningCenterAggregateResponse>` 解 `{code, msg, data}` 信封，与 `getFavoriteFolderState` 同构。
- Mock 默认返回有数据样本；若后续要测空态，可在 fixtures 里切换；本 task 未改 fixtures 避免影响其他测试。
