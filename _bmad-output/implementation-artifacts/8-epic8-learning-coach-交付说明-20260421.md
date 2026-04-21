# Epic 8 Learning Coach 交付说明（Checkpoint / Quiz / Path）

对应 Epic：[`../planning-artifacts/epics/25-epic-8.md`](../planning-artifacts/epics/25-epic-8.md)

## 本次交付范围

- Learning Coach 会话后入口（Entry）
- Checkpoint（轻量热身）
- Quiz（正式测验，含判分与解析）
- 学习路径规划（Path plan + 保存）
- Quiz 提交后最小 wrongbook / recommendation 长期回写（MVP：基于 questionId 的占位沉淀）

## 学生端路由（student-web）

- `/coach/:sessionId`
- `/checkpoint/:sessionId`
- `/quiz/:sessionId`
- `/path`

补充约束：当缺少 `returnTo` 时，返回动作会回到 `/video/input`，不依赖学习中心聚合页（避免跨 Epic 断链）。

## 后端接口（fastapi-backend）

- `GET /api/v1/learning-coach/entry`
- `POST /api/v1/learning-coach/checkpoint/generate`
- `POST /api/v1/learning-coach/checkpoint/submit`
- `POST /api/v1/learning-coach/quiz/generate`
- `POST /api/v1/learning-coach/quiz/submit`
- `POST /api/v1/learning-coach/path/plan`
- `POST /api/v1/learning-coach/path/save`

运行态存储：Redis runtime keys，TTL=2h（checkpoint/quiz 题目与 answerKey）。

## 关键行为

- Checkpoint / Quiz 页面支持刷新恢复（sessionStorage snapshot）。
- Path 结果会缓存到 localStorage，并支持刷新后再次打开（基于 `pathId`）。
- Quiz 提交会 best-effort 调用 `LearningService.persist_results` 写入长期数据；失败不阻塞前端主流程，但会返回 `persisted=false`。

## 前端验收清单

- [`../../docs/01开发人员手册/009-里程碑与进度/0035-Epic8-LearningCoach-前端点击验收清单-20260421.md`](../../docs/01开发人员手册/009-里程碑与进度/0035-Epic8-LearningCoach-前端点击验收清单-20260421.md)

