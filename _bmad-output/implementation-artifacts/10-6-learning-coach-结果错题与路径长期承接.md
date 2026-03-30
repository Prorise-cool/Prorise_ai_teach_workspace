# Story 10.6: Learning Coach 结果、错题与路径长期承接

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 学习中心与平台，
I want checkpoint、quiz、wrongbook、recommendation 与 path 结果被长期承接，
so that 学后巩固结果能够持续沉淀而不是一次性消费。

## Acceptance Criteria

1. 用户完成 checkpoint 或 quiz 时，结果、得分、解析摘要、来源会话与时间信息进入长期业务表，学习中心能够稳定查询这些结果。
2. 错题、推荐或学习路径被生成时，它们拥有清晰的结果类型、来源、状态与打开详情所需字段，不会混入普通历史记录导致前端难以区分展示逻辑。
3. 用户后续调整学习路径时，系统能保留版本或最后更新时间等必要信息，不会因简单覆盖写入导致历史路径状态完全不可追溯。

## Tasks / Subtasks

- [x] 定义 Learning Coach 结果实体与字段基线（AC: 1, 2, 3）
  - [x] 明确 `xm_quiz_result`、`xm_learning_path` 的最小字段集以及 wrongbook / recommendation 的挂接字段。
  - [x] 为 checkpoint、quiz、wrongbook、recommendation、path 设计统一的结果类型与来源字段。
  - [x] 定义得分、解析摘要、来源会话、状态、版本号 / 更新时间等公共字段。
- [x] 建立结果写回与更新策略（AC: 1, 2, 3）
  - [x] 将 checkpoint、quiz、path、recommendation 的完成节点映射到长期回写动作。
  - [x] 约束错题本与推荐结果进入学习中心域，不混入个人资料域。
  - [x] 为学习路径调整定义版本保留或最后更新时间更新策略。
- [x] 补齐回看与聚合查询所需字段（AC: 1, 2）
  - [x] 确保学习中心可以按类型打开 checkpoint、quiz、错题解析、路径与推荐详情。
  - [x] 为后续 `/learning` 聚合留出类型区分、来源跳转与摘要展示字段。
  - [x] 避免把 Learning Coach 各类结果简单压平到无法区分的通用历史记录。
- [x] 增加持久化与版本测试（AC: 1, 2, 3）
  - [x] 覆盖 checkpoint / quiz 完成后的结果写回。
  - [x] 覆盖错题本生成、推荐结果生成和学习路径保存 / 更新。
  - [x] 覆盖学习路径版本或更新时间可追溯，不因覆盖写入丢失关键历史信息。

### Story Metadata

- Story ID: `10.6`
- Story Type: `Persistence Story`
- Epic: `Epic 10`
- Depends On: `10.1`、`10.2`、`10.3`
- Blocks: `8.7`、`9.1`、`9.2`、`10.7`、`10.8`
- Contract Asset Path: `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_learning_result.sql`
- Mock Asset Path: `N/A`
- API / Event / Schema Impact: 冻结 `checkpoint / quiz / wrongbook / recommendation / path` 的结果类型、来源字段、详情定位与版本 / 更新时间语义
- Persistence Impact: `xm_quiz_result`、`xm_learning_path` 及相关结果字段承接 Learning Coach 长期结果
- Frontend States Covered: checkpoint 完成、quiz 完成、错题生成、推荐生成、路径保存 / 更新、学习中心重开
- Error States Covered: 结果类型混淆、路径历史不可追溯、推荐 / 错题被误归类为普通历史、详情定位字段缺失
- Acceptance Test Notes: 必须覆盖五类结果持久化、路径版本追溯与学习中心按类型区分消费

## Dev Notes

### Business Context

- 该 Story 为 Epic 8 的 Learning Coach 结果沉淀提供长期宿主，也是 Epic 9 学习中心聚合的重要数据来源。
- Learning Coach 的结果类型很多，但用户在学习中心看到的应该是“可区分、可重开、可追溯”的长期记录，而不是混乱的通用历史。
- 错题本、推荐和学习路径属于长期学习资产，必须从一开始就按长期数据设计，而不是先做运行态临时结果。

### Technical Guardrails

- `checkpoint`、`quiz`、`wrongbook`、`recommendation`、`path` 必须有清晰的类型标识、来源标识与详情定位字段。
- 错题本属于学习中心域长期数据，不得回落到 `/profile` 或临时会话缓存。
- 学习路径更新必须保留版本或至少可追溯的最后更新时间，避免“最后一次覆盖”吞掉历史状态。
- 结果持久化后应可直接支撑学习中心回看，不要求再次运行工作流或重新解析上下文。
- 长期结果与推荐内容需要考虑学生数据隐私边界，避免不必要的敏感信息泄露。

### Suggested File Targets

- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_learning_result.sql`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/`
- `packages/fastapi-backend/app/features/learning/`
- `packages/fastapi-backend/app/shared/ruoyi_client.py`
- `packages/fastapi-backend/tests/integration/test_learning_result_persistence.py`

### Project Structure Notes

- 架构文档把 Learning Coach 后端规划为 `packages/fastapi-backend/app/features/learning/`，但当前仓库内仍未落地该目录。
- `student-web` 已经有 `features/learning-coach/` 与 `features/learning-center/` 目录壳层，长期结果字段设计需要兼顾“单项结果页”和“学习中心聚合页”的消费需求。
- `ruoyi-xiaomai` 模块尚未创建，因此该 Story 的实施应与 `10.2` 的模块落位、`10.3` 的防腐层设计协同推进。

### Testing Requirements

- 覆盖 checkpoint、quiz、wrongbook、recommendation、path 五类结果的持久化样例。
- 覆盖学习中心按类型区分展示时所需的最小字段。
- 覆盖学习路径更新后版本号或最后更新时间可追溯。
- 覆盖错题本和推荐结果不会被误归类为普通历史记录。

### References

- `_bmad-output/planning-artifacts/epics/27-epic-10-ruoyi.md`：Story 10.6 AC 与交付物。
- `_bmad-output/planning-artifacts/epics/25-epic-8.md`：Learning Coach 结果、错题、路径与长期回写上下文。
- `_bmad-output/planning-artifacts/epics/28-cross-epic-integration-matrix.md`：Learning Coach 与学习中心 / Epic 10 的数据交叉点。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-LA-005`、`FR-LA-006`。
- `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`：`NFR-CO-001`、`NFR-AR-002`。
- `_bmad-output/planning-artifacts/architecture/06-6-数据分层与存储策略.md`：长期结果宿主与学习中心可见数据规则。
- `_bmad-output/planning-artifacts/architecture/07-7-职责边界与集成关系.md`：`xm_quiz_result` 等 Learning 结果宿主定义。
- `_bmad-output/planning-artifacts/architecture/09-9-外部平台集成策略.md`：quiz 与 learning path 回写时机。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已落地 FastAPI `learning` 长期结果预览接口，覆盖 `checkpoint / quiz / wrongbook / recommendation / path` 五类结果的归一化与表目录映射。
- 已补齐 RuoYi 小麦模块的学习结果服务、控制器、VO/BO、enum、mapper 骨架、SQL 结构与本地测试。
- 已新增学习结果持久化与 OpenAPI 断言测试，并验证通过。

### File List

- `_bmad-output/implementation-artifacts/10-6-learning-coach-结果错题与路径长期承接.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/fastapi-backend/app/features/learning/__init__.py`
- `packages/fastapi-backend/app/features/learning/routes.py`
- `packages/fastapi-backend/app/features/learning/schemas.py`
- `packages/fastapi-backend/app/features/learning/service.py`
- `packages/fastapi-backend/tests/integration/test_learning_result_persistence.py`
- `packages/fastapi-backend/tests/test_openapi_contracts.py`
- `packages/fastapi-backend/tests/unit/test_learning_result_service.py`
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_learning_result.sql`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/controller/admin/LearningResultController.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/domain/bo/LearningResultBo.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/domain/vo/LearningResultVo.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/enums/LearningResultStatus.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/enums/LearningResultType.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/enums/LearningSourceType.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/mapper/LearningResultMapper.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/service/ILearningResultService.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/service/impl/LearningResultServiceImpl.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/resources/mapper/xiaomai/learning/README.md`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/resources/mapper/xiaomai/learning/LearningResultMapper.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/test/java/org/dromara/xiaomai/learning/service/LearningResultServiceImplTest.java`

## Change Log

- 2026-03-29：完成 Story 10.6 的后端长期承接实现，补齐 FastAPI 学习结果预览、RuoYi 学习结果骨架、SQL 结构与测试覆盖。
