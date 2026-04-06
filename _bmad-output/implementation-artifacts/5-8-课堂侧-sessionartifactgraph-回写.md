# Story 5.8: 课堂侧 SessionArtifactGraph 回写

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 后续需要 Companion 与 Learning Coach 消费课堂内容的系统，
I want 在课堂完成时回写结构化 artifact 索引，
so that 会话后能力不需要反向依赖课堂引擎内部实现。

## Acceptance Criteria

1. 当课堂生成成功时，系统进入回写阶段后至少回写 slide 结构、讨论步骤、白板步骤、章节摘要与学习信号，这些数据进入长期业务存储，而不是只停留在运行时对象中。
2. 当 Companion 需要围绕 slide、白板步骤或讨论片段发起解释时，能够获取统一、可索引、可定位的课堂上下文，不需要直接依赖课堂生成服务内部对象或临时缓存。
3. 当 Learning Coach 需要基于会话结束信号与知识点摘要生成后续内容时，能够通过 artifact 与 completion signal 获得最小可用上下文，不需要重新解析整份课堂原始输出文本。

## Tasks / Subtasks

- [ ] 冻结课堂 artifact 的长期字段映射（AC: 1, 2, 3）
  - [ ] 定义 slide、discussion、whiteboard、chapter summary、learning signal 的最小长期字段。
  - [ ] 明确运行态字段、长期字段与 COS 引用的边界。
  - [ ] 为 Companion 与 Learning Coach 标注可消费的定位键。
- [ ] 建立课堂完成后的 artifact 回写逻辑（AC: 1, 2, 3）
  - [ ] 在课堂 completed 收敛点触发 artifact writeback，而不是依赖页面侧补写。
  - [ ] 通过 RuoYi 防腐层写入长期宿主，避免 FastAPI 直接操作 RuoYi 领域模型。
  - [ ] 失败回写时记录明确错误并避免把未回写完成的结果误判为 fully ready。
- [ ] 提供下游消费的最小查询 / 映射入口（AC: 2, 3）
  - [ ] 为 Companion context adapter 准备可检索的课堂 artifact 结构。
  - [ ] 为 Learning Coach 准备 completion signal + chapter summary 的读取形状。
- [ ] 补齐持久化测试与跨 Epic 示例（AC: 1, 2, 3）
  - [ ] 覆盖 artifact 回写成功、回写失败、部分字段缺失与查询消费。
  - [ ] 覆盖“不依赖 Redis 运行态回放”的约束。

### Story Metadata

- Story ID: `5.8`
- Story Type: `Persistence Story`
- Epic: `Epic 5`
- Depends On: `5.1`、`5.4`、`10.1`、`10.3`、`10.4`
- Blocks: `6.3`、`8.1`、`9.2`
- Contract Asset Path: `contracts/classroom/v1/`
- Mock Asset Path: `mocks/classroom/v1/`
- API / Event / Schema Impact: 新增 classroom artifact summary、artifact writeback 示例与下游消费字段说明
- Persistence Impact: 课堂 artifact、chapter summary 与 learning signal 进入长期宿主；禁止仅依赖 Redis 运行态
- Frontend States Covered: 无直接页面态，但为结果页回看、Companion、Learning Coach 提供稳定数据底座
- Error States Covered: 回写失败、artifact 字段缺失、下游无法定位、Redis-only 回看依赖
- Acceptance Test Notes: 必须验证 artifact 可被下游消费而非仅成功写库；同时验证失败回写不会被静默吞掉

## Dev Notes

### Business Context

- Classroom Engine 的运行态对象只适合短时生成过程，不适合作为长期产品能力的唯一数据来源。
- 没有本 Story，Companion 与 Learning Coach 会被迫反向依赖课堂引擎内部对象，破坏模块边界。
- 这是 Epic 5 连接 Epic 6、Epic 8、Epic 9 与 Epic 10 的关键持久化 Story。

### Technical Guardrails

- artifact 必须进入长期宿主，不得以“后面再落库”为理由长期滞留 Redis。
- FastAPI 与 RuoYi 的交互必须通过防腐层完成，避免直接耦合 RuoYi 业务模型。
- artifact 结构应以可索引、可定位为目标，而非存整份原始大文本让下游重新解析。
- completion signal 与 artifact 回写要么共同成功，要么明确记录部分失败状态，不能伪装成全量完成。

### Suggested File Targets

- `packages/fastapi-backend/app/features/classroom/`
- `packages/fastapi-backend/app/shared/ruoyi_client.py`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/`
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/`
- `contracts/classroom/v1/`
- `mocks/classroom/v1/`

### Project Structure Notes

- `10.4` 已为课堂任务元数据长期承接打底，但课堂 artifact 与学习信号仍需要本 Story 明确落位。
- 现有 FastAPI `app/features/classroom/service.py` 主要围绕元数据读写，本 Story 需要把结果层 artifact 继续向长期宿主推进。
- `app/features/companion/context_adapter/classroom_adapter.py` 已存在目录落点，说明下游确实需要课堂 artifact 作为消费来源。

### Testing Requirements

- 覆盖课堂 artifact 回写成功、失败与部分字段缺失。
- 覆盖 Companion 与 Learning Coach 的最小消费查询场景。
- 覆盖 Redis 运行态过期后，长期 artifact 仍可支撑回看与消费。
- 覆盖课堂结果与 artifact summary 的字段一致性，避免双轨语义漂移。

### References

- `_bmad-output/planning-artifacts/epics/18-epic-5.md`：Story 5.8 摘要
- `_bmad-output/planning-artifacts/epics/27-epic-10-ruoyi.md`：长期承接边界
- `_bmad-output/planning-artifacts/architecture/06-6-数据分层与存储策略.md`：SessionArtifactGraph 与长期存储规则
- `_bmad-output/planning-artifacts/architecture/07-7-职责边界与集成关系.md`：FastAPI ↔ RuoYi 防腐层边界
- `_bmad-output/planning-artifacts/epics/28-cross-epic-integration-matrix.md`：Epic 5 向 Epic 6 / 8 / 9 / 10 的输出矩阵
- `packages/fastapi-backend/app/features/companion/context_adapter/classroom_adapter.py`：课堂 artifact 的现有下游落点
- `_bmad-output/implementation-artifacts/10-4-视频与课堂任务元数据长期承接.md`：已完成的长期元数据承接模式

## Change Log

- 2026-04-06：创建 Story 5.8 完整开发卡片，明确课堂结果如何从运行态对象沉淀为长期 artifact。
