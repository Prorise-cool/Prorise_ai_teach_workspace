# Story 5.4: 课堂生成服务与多 Agent 讨论结果

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 想学习某个主题的用户，
I want 系统基于主题生成结构化课堂与多角色讨论结果，
so that 我能够获得比纯文本回答更完整的课堂体验。

## Acceptance Criteria

1. 当课堂任务已创建时，系统执行课堂生成流程后至少产出课堂摘要、幻灯片结构、多角色讨论片段与白板所需基础内容，且输出结果符合已冻结 schema，而不是随运行时自由漂移字段结构。
2. 当课堂包含多 Agent 讨论时，系统必须为每个讨论片段返回角色身份、内容顺序与最小可展示信息，前端可以直接稳定渲染，不需要额外拼装语义。
3. 当课堂生成失败时，系统必须返回统一失败状态与错误码，不出现“任务已完成但结果结构严重缺失”的伪成功场景。

## Tasks / Subtasks

- [ ] 搭建课堂生成主链路与阶段推进（AC: 1, 3）
  - [ ] 基于统一任务框架创建 classroom generation orchestration。
  - [ ] 定义初始化、主题理解、课堂结构生成、讨论编排、白板准备、结果整理等内部阶段。
  - [ ] 通过统一错误码与任务状态回传执行结果。
- [ ] 产出课堂主结果结构（AC: 1, 2）
  - [ ] 生成课堂摘要与章节 / slide 结构。
  - [ ] 生成多 Agent discussion turns，保证角色、顺序、最小展示字段完整。
  - [ ] 为白板布局提供最小步骤化输入，供 `5.5` 继续处理。
- [ ] 消费输入配置而不丢字段（AC: 1, 2）
  - [ ] 处理 `userProfile` 对 Agent 风格 / 课堂语义的影响。
  - [ ] 处理 `webSearchEnabled` 与 `evidenceScope` 等生成前增强输入，但不越界实现 Evidence 面板。
  - [ ] 对未提供增强输入时返回稳定默认行为，而不是隐式猜测。
- [ ] 建立生成失败与不完整结果的防线（AC: 3）
  - [ ] 对 discussion 为空、whiteboard 缺失或 slide 不完整做结构校验。
  - [ ] 关键结果不完整时收敛为失败或明确降级，不写伪成功 completed。
- [ ] 补齐测试与示例 payload（AC: 1, 2, 3）
  - [ ] 覆盖成功生成、讨论缺失、外部能力失败与统一错误映射。
  - [ ] 覆盖最小结果示例，供前端结果页与 mock 资产复用。

### Story Metadata

- Story ID: `5.4`
- Story Type: `Backend Story`
- Epic: `Epic 5`
- Depends On: `2.2`、`2.7`、`5.1`
- Blocks: `5.5`、`5.6`、`5.7`、`5.8`
- Contract Asset Path: `contracts/classroom/v1/`、`contracts/tasks/`
- Mock Asset Path: `mocks/classroom/v1/`
- API / Event / Schema Impact: 新增 classroom generation 结果 payload、阶段语义、失败映射与最小 OpenAPI 示例
- Persistence Impact: 运行时生成结果先落任务结果对象，长期回写由 `5.8` 与 `10.4` 承接
- Frontend States Covered: 课堂摘要可展示、slides 可展示、discussion 可展示、whiteboard 输入已准备、失败可解释
- Error States Covered: discussion 缺失、结果结构不完整、Provider 不可用、伪成功 completed
- Acceptance Test Notes: 必须验证“结构不完整时不得 completed”这一条，避免后续结果页拿到坏数据再兜底

## Dev Notes

### Business Context

- 课堂生成服务是 Epic 5 的核心后端 Story，决定课堂是否从“主题输入”走到“结构化结果”。
- 它和视频流水线共享基础设施，但不能把视频生成主链路硬套到课堂域。
- 多 Agent discussion 是课堂差异化体验之一，但本 Story 只负责主链可消费结构，不负责会话内 Companion 问答。

### Technical Guardrails

- Classroom Engine 必须复用统一任务框架、Provider 工厂与错误码体系，不得直接绑定某个外部平台返回结构。
- 多 Agent discussion 输出必须是结构化结果，禁止把整段混合对话文本交给前端自行切分。
- web search / evidence scope 只作为生成前增强输入，不在本 Story 越界实现资料抽屉或独立知识路由。
- 课堂生成成功率与时延必须对齐 `NFR-PF-003`、`NFR-PF-006`。

### Suggested File Targets

- `packages/fastapi-backend/app/features/classroom/routes.py`
- `packages/fastapi-backend/app/features/classroom/service.py`
- `packages/fastapi-backend/app/features/classroom/`
- `packages/fastapi-backend/app/shared/task_framework/`
- `packages/fastapi-backend/app/providers/`
- `contracts/classroom/v1/examples/`
- `mocks/classroom/v1/`

### Project Structure Notes

- 当前 FastAPI classroom feature 主要是元数据读写骨架，尚未承接真实课堂生成链。
- 架构文档明确 Classroom Engine 为自研主流程，可共享 Provider 与任务基础设施，但业务独立。
- 参考项目 OpenMAIC 采用“两阶段课堂生成 + 轮询 job”思路可借鉴，但当前仓库真值仍以 `_bmad-output/` 边界为准。

### Testing Requirements

- 覆盖主题输入生成课堂摘要、slides、discussion、whiteboard 输入四类核心结果。
- 覆盖外部能力不可用、讨论为空、结构校验失败与统一错误码映射。
- 覆盖 `userProfile`、`webSearchEnabled`、`evidenceScope` 等输入在服务层不被静默丢弃。
- 覆盖 completed 结果最小结构校验，防止伪成功。

### References

- `_bmad-output/planning-artifacts/epics/18-epic-5.md`：Story 5.4 摘要
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-CS-001`、`FR-CS-003`、`FR-CS-005`、`FR-CS-006`、`FR-CS-008`
- `_bmad-output/planning-artifacts/architecture/08-8-模块划分与实现策略.md`：课堂服务模块实现矩阵
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：课堂生成与结果产出链路
- `_bmad-output/project-context.md`：FastAPI feature-module 与 Provider 抽象现状
- `references/OpenMAIC/README-zh.md`：课堂生成、讨论、多智能体互动参考
- `references/OpenMAIC/lib/server/classroom-generation.ts`：课堂生成输入与阶段设计参考
- `references/OpenMAIC/lib/server/classroom-job-runner.ts`：异步课堂 job runner 参考

## Change Log

- 2026-04-06：创建 Story 5.4 完整开发卡片，明确课堂生成服务的结果边界、失败收敛与多 Agent discussion 要求。
