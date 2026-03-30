# Story 2.7: Provider Protocol、工厂与优先级注册骨架

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 后端团队，
I want 建立统一 Provider Protocol、工厂与优先级注册机制，
so that LLM、TTS 与未来外部能力都能在不侵入业务逻辑的前提下切换与扩展。

## Acceptance Criteria

1. 业务代码需要调用 LLM 或 TTS 时，只通过统一 Protocol 与工厂获取能力实例，不直接依赖具体厂商 SDK 或在业务层硬编码 vendor 判断。
2. 系统装配主 Provider 与备 Provider 时，可配置优先级、超时、重试与健康状态来源，后续业务域无需再维护另一套主备逻辑。
3. 新 Provider 实现遵循统一 Protocol 后，可通过注册或配置接入工厂，而不需要改动业务主流程调用代码。

## Tasks / Subtasks

- [x] 定义统一 Provider Protocol（AC: 1, 3）
  - [x] 定义 LLM / TTS 共享的基础能力接口与返回约束。
  - [x] 明确 Provider 标识符、配置项与错误边界。
- [x] 建立工厂与注册骨架（AC: 1, 2, 3）
  - [x] 实现 `ProviderFactory` 与优先级注册表。
  - [x] 支持按配置装配主备 Provider 列表。
- [x] 提供 demo provider 与接入示例（AC: 2, 3）
  - [x] 补齐最小 demo provider，演示注册、实例化与调用流程。
  - [x] 明确业务层只能依赖 Protocol，而不是具体实现类。
- [x] 建立工厂层测试（AC: 1, 2, 3）
  - [x] 覆盖注册顺序、优先级排序、配置驱动装配与未知 Provider 错误。
  - [x] 覆盖新增 Provider 不需要改业务调用代码的示例。

## Dev Notes

### Story Metadata

- Story ID: `2.7`
- Story Type: `Infrastructure Story`
- Epic: `Epic 2`
- Depends On: `2.1`
- Blocks: `2.8`、`4.5`、`5.4`、`7.3`、`8.4` 等所有需要外部能力切换的 Story
- Contract Asset Path: `contracts/tasks/provider-contract.md`
- Mock Asset Path: `mocks/tasks/`
- API / Event / Schema Impact: 定义 Provider 标识符、配置结构、工厂装配与优先级注册约定
- Persistence Impact: 无长期数据落库；只定义运行时装配与后续健康缓存的前置结构
- Frontend States Covered: 间接支撑 `provider_switch` 事件与等待页提示
- Error States Covered: 未注册 Provider、配置缺失、装配失败、协议不兼容
- Acceptance Test Notes: 必须覆盖注册、装配、优先级排序、未知 Provider 与 demo 调用

### Business Context

- `Story 2.7` 是所有多 Provider 能力的结构性前置，没有它，后续 TTS、Evidence、QuizFlow、PathPlanning 等 Story 会被迫直接依赖具体厂商。
- 本 Story 的目标不是实现完整 Failover，而是先把业务层与厂商实现彻底解耦，确保“切换 Provider”只是装配变化，而不是业务代码重写。
- 该 Story 完成后，后续外部能力 Story 应该都围绕统一工厂和 Protocol 扩展。

### Technical Guardrails

- Provider 标识符必须遵循架构约定的 `{vendor}-{model_or_voice}` 格式，不能在不同模块里写出不同命名风格。
- 业务代码只能依赖 Protocol 与工厂返回的抽象对象，不得直接 import 某个厂商实现类。
- 本 Story 优先冻结 LLM / TTS 的基础工厂骨架；Evidence / Retrieval、QuizFlow、PathPlanning 等更高层 Provider 接口可沿用相同模式在后续 Story 中扩展。
- 超时、重试、优先级与健康状态来源需要纳入统一配置，而不是散落在业务代码里硬编码。

### Suggested File Targets

- `packages/fastapi-backend/app/providers/protocols.py`
- `packages/fastapi-backend/app/providers/registry.py`
- `packages/fastapi-backend/app/providers/factory.py`
- `packages/fastapi-backend/app/providers/llm/factory.py`
- `packages/fastapi-backend/app/providers/tts/factory.py`
- `packages/fastapi-backend/app/providers/demo_provider.py`
- `packages/fastapi-backend/tests/unit/providers/test_factory.py`
- `contracts/tasks/provider-contract.md`

### Project Structure Notes

- 架构目标结构已为 `app/providers/` 预留 `protocols.py`、`llm/`、`tts/` 等目录，本 Story 应直接沿用该分层，而不是把所有 Provider 代码堆进单个 service 文件。
- 当前仓库的前端与业务模块还没有正式消费 Provider 层，恰好适合先把接口边界钉住，避免后续每个业务 Story 自己抽象一套“厂商适配器”。
- `Epic 7`、`Epic 8` 会继续扩展 `EvidenceProvider`、`QuizFlowProvider`、`PathPlanningProvider`；本 Story 设计时必须考虑可扩展性，而不是只服务当前 TTS。

### Testing Requirements

- 覆盖注册多个 Provider 后的优先级排序。
- 覆盖通过配置切换主备 Provider 而无需改业务调用层。
- 覆盖未知 Provider 或协议不兼容时的清晰失败。
- 覆盖 demo provider 的最小调用与返回结构。

### References

- `_bmad-output/planning-artifacts/epics/15-epic-2.md`：Story 2.7 AC 与 Deliverables。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-PV-001`。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：Provider 命名与主备/健康检查规则。
- `_bmad-output/planning-artifacts/architecture/07-7-职责边界与集成关系.md`：Provider 实现矩阵与抽象边界。
- `_bmad-output/planning-artifacts/architecture/03-3-核心术语与架构原则.md`：Provider 可插拔原则。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：`app/providers/` 目标结构。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `python3 -m compileall app/providers tests/unit/providers`
- `pytest tests/unit/providers/test_factory.py`

### Completion Notes List

- 已落地统一 Provider Protocol、运行时配置结构与错误边界，补齐 `ProviderRegistry` 与 `ProviderFactory` 的装配骨架。
- 已新增 demo provider 与默认 stub provider 装配入口，业务层可只依赖 Protocol 与工厂获取实例。
- 已补齐 Provider 契约文档与工厂层测试，覆盖优先级排序、配置驱动装配、未知 Provider 与协议不兼容等场景。

### File List

- `_bmad-output/implementation-artifacts/2-7-provider-protocol工厂与优先级注册骨架.md`
- `contracts/tasks/provider-contract.md`
- `packages/fastapi-backend/app/providers/protocols.py`
- `packages/fastapi-backend/app/providers/registry.py`
- `packages/fastapi-backend/app/providers/factory.py`
- `packages/fastapi-backend/app/providers/demo_provider.py`
- `packages/fastapi-backend/app/providers/llm/factory.py`
- `packages/fastapi-backend/app/providers/llm/stub_provider.py`
- `packages/fastapi-backend/app/providers/tts/factory.py`
- `packages/fastapi-backend/app/providers/tts/stub_provider.py`
- `packages/fastapi-backend/tests/unit/providers/test_factory.py`
