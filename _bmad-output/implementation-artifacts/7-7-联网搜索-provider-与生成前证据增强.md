# Story 7.7: 联网搜索 Provider 与生成前证据增强

Status: backlog

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 需要公开资料增强的课堂生成链路，
I want 通过统一的 Evidence Provider 接入联网搜索并把结果映射为可消费证据，
so that 课堂输入页开启联网搜索后，生成前链路可以稳定使用公开资料而不破坏现有 Evidence 边界。

## Acceptance Criteria

1. 课堂输入页开启联网搜索后，Evidence / Retrieval 层通过统一 Provider 接口执行公开资料检索，并返回内部统一的 citation / snippet 结构。
2. 用户关闭联网搜索或当前任务不允许使用公开资料时，系统不会隐式调用联网搜索。
3. Provider 超时、失败或返回低可信结果时，系统返回明确降级信号、错误语义或空结果说明，不伪造依据。

## Tasks / Subtasks

- [ ] 增加联网搜索 Provider 适配（AC: 1, 3）
  - [ ] 在 `EvidenceProvider` 体系下补齐联网搜索能力。
  - [ ] 统一外部搜索结果到内部 citation / snippet 语义。
  - [ ] 处理超时、失败与低可信结果。
- [ ] 接入生成前证据增强链路（AC: 1, 2, 3）
  - [ ] 消费课堂输入页透传的联网搜索配置。
  - [ ] 关闭时不调用公开资料检索。
  - [ ] 开启时将公开资料结果提供给课堂生成前链路。
- [ ] 固定降级规则（AC: 2, 3）
  - [ ] 明确关闭时的静默路径。
  - [ ] 明确失败时的错误语义与空结果语义。
  - [ ] 禁止把无可靠来源包装成已有依据。
- [ ] 增加集成测试（AC: 1, 2, 3）
  - [ ] 覆盖开启、关闭、超时、失败与低可信结果。

## Dev Notes

### Business Context

- 联网搜索已正式进入 Evidence / Retrieval 事实范围。
- 该能力服务于课堂生成前 / 生成时的证据增强，不构成学生端独立资料页面。
- 输入页是否联网搜索由用户显式控制，而不是后端自行决定。

### Technical Guardrails

- 必须复用统一 `EvidenceProvider` 抽象，避免业务层直接耦合具体搜索平台。
- 所有公开资料结果都要映射到内部统一 citation / snippet 结构。
- 失败时只能返回降级信号或空结果，不能伪造来源。

### Suggested File Targets

- `packages/fastapi-backend/app/features/knowledge/routes.py`
- `packages/fastapi-backend/app/features/knowledge/service.py`
- `packages/fastapi-backend/app/features/knowledge/schemas.py`
- `packages/fastapi-backend/app/providers/protocols.py`
- `packages/fastapi-backend/app/providers/registry.py`
- `packages/fastapi-backend/app/providers/factory.py`
- `packages/fastapi-backend/app/features/classroom/service.py`
- `packages/fastapi-backend/tests/integration/test_classroom_search_enrichment.py`

### Project Structure Notes

- 本 Story 需要与 `Story 5.9` 对齐输入配置字段。
- `knowledge/` 目录名是历史工程命名，当前产品语义统一对应 Evidence / Retrieval 服务层。
- 联网搜索结果只通过课堂链路与证据面板消费，不新增独立 `/knowledge` 路由。
- 当前代码真实存在的是 `knowledge/routes.py`、`knowledge/service.py` 和共享 provider 抽象；新增实现应沿用这些落点，而不是假设尚未存在的 `services/` 子目录。
- 在 `7.1` Evidence 契约和 `5.9` 输入配置仍未冻结前，本 Story 维持 `backlog`。

### Testing Requirements

- 覆盖开启联网搜索时的 Provider 调用与 citation 映射。
- 覆盖关闭联网搜索时完全不触发公开资料检索。
- 覆盖超时、失败与低可信结果的降级语义。

### References

- `_bmad-output/planning-artifacts/epics/24-epic-7.md`：Story 7.7 AC。
- `_bmad-output/planning-artifacts/epics/18-epic-5.md`：Story 5.9 对输入配置透传的要求。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-KQ-007`、`FR-CS-008`。
- `_bmad-output/planning-artifacts/architecture/08-8-模块划分与实现策略.md`：Evidence / Retrieval 模块与联网搜索定位。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：`knowledge/` 模块与 classroom 协同边界。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已将联网搜索 Provider、citation 映射与生成前证据增强边界固定为开发执行文档。

### File List

- `_bmad-output/implementation-artifacts/7-7-联网搜索-provider-与生成前证据增强.md`
