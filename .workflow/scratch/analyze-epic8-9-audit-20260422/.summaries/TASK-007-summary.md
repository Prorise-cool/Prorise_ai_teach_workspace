# TASK-007: 学习中心聚合接口扩展真实字段

## Changes
- `packages/fastapi-backend/app/features/learning/schemas.py`：新增 `LatestRecommendation`、`ActiveLearningPath`、`LearningCenterAggregateResponse` 三个 pydantic 模型，所有字段使用 camelCase alias（`averageQuizScore` / `latestRecommendation` / `activeLearningPath` / `completedStepCount` / `totalStepCount` / `versionNo`），三字段均 `Optional`，缺数据时为 `None`。
- `packages/fastapi-backend/app/features/learning/service.py`：新增 `LearningService.build_learning_center_aggregate(payload)` 类方法，从 RuoYi 聚合响应提取三字段；同时接受 camelCase 与 snake_case 键名；半截数据（如 recommendation 缺 targetRefId）整体置 None，绝不硬编码占位。将 `_first_present` 参数类型从 `dict` 放宽到 `Mapping`，不影响既有调用方。
- `packages/student-web/src/types/learning-center.ts`：新增 `LatestRecommendation`、`ActiveLearningPath`、`LearningCenterAggregateResponse` TS 类型，三字段均 `| null`。
- `packages/fastapi-backend/tests/unit/learning/test_learning_center_aggregate.py`：新增 6 个单元测试覆盖 upstream 全字段透传 / 缺字段置 None / None payload / by_alias 序列化 / 半截数据被丢弃 / snake_case 向后兼容。

## Verification
- [x] schemas.py 含 `average_quiz_score` / `latest_recommendation` / `active_learning_path` / `completed_step_count` / `total_step_count`（均为 snake_case 字段名，配合 camelCase alias）。
- [x] `cd packages/fastapi-backend && uv run pytest tests/unit/learning -x` → 15 passed（其中新增 6 个）。
- [x] `cd packages/student-web && pnpm typecheck` → exit 0。

## Tests
- [x] FastAPI pytest 15/15 绿。
- [x] student-web tsc --noEmit 无错。

## Deviations
- 现有 `learning-center-adapter.ts` 前端直连 RuoYi，并没有 FastAPI 聚合 endpoint。本 task 作用域仅 FastAPI 侧（TASK-009 负责 RuoYi Java 侧），故**只落了 schema + 构造器**，未新增 FastAPI route。后续等 RuoYi 接口就绪后再由独立 task 在 routes.py 里串联 RuoYi 代理调用 + `build_learning_center_aggregate`。
- 未改 service.py 的 `persist_results` 流程：三新字段只通过新增的 `build_learning_center_aggregate` 构造器支持，与持久化路径解耦。

## Notes
- 前端侧 TASK-008 消费 `LearningCenterAggregateResponse` 时请务必按 `null` 做空态渲染，不要复写回硬编码 86 / 0/0 / i18n 文案。
- RuoYi Java（TASK-009）侧需让聚合端点返回 `averageQuizScore` / `latestRecommendation{ summary, targetRefId, sourceTime }` / `activeLearningPath{ pathId, title, completedStepCount, totalStepCount, versionNo }`；任一字段空缺允许省略或显式 null。
