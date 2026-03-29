# Story 0.6: Story 交付门禁与并行开发 DoR / DoD 冻结

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 项目协作团队，
I want 明确 Story 的进入条件和退出条件，
so that 团队不会把“半成品页面”、“口头契约”或“不可联调接口”误判为已完成。

## Acceptance Criteria

1. 当一个 Story 被标记为 Ready 时，团队可以确认其 Story 类型、依赖、最小契约、状态说明和验收口径已明确，不会把需求模糊、字段未定、状态未列举的工作直接推给开发实现。
2. 当一个 Story 被标记为 Done 时，团队可以确认其交付物、AC、测试或状态闭环已经满足，不会把“只写了页面壳”或“只写了接口路由”误判为完成。
3. 并行开发的门禁被明确区分为契约冻结、mock 可运行、测试通过、联调前门禁、合并前门禁和发布前门禁，避免“前端等后端”或“后端等视觉稿”这种口头依赖重新出现。

## Tasks / Subtasks

- [x] 冻结 Story 类型对应的 DoR（AC: 1, 3）
  - [x] 区分 Contract Story、Infrastructure Story、Backend Story、Frontend Story、Persistence Story、Integration Story 的最小输入条件。
  - [x] 明确契约、mock、错误码、状态枚举、测试夹具和依赖识别要求。
  - [x] 明确正式前端页面 Story 的视觉稿和关键状态要求。
- [x] 冻结 Story 类型对应的 DoD（AC: 2, 3）
  - [x] 明确代码、测试、文档、AC、状态闭环和环境验证要求。
  - [x] 明确“只有页面壳”“只有接口路由”“只有 README”均不算完成。
  - [x] 明确哪些 Story 允许以文档 / 契约交付为完成形态。
- [x] 冻结并行开发门禁（AC: 1, 2, 3）
  - [x] 区分真实接口联调前门禁、主分支合并前门禁、发布前门禁。
  - [x] 明确 mock 先行、adapter 隔离和真实接口联调的边界。
  - [x] 明确禁止写法与常见伪完成模式。
- [x] 输出执行模板与检查清单（AC: 1, 2, 3）
  - [x] 提供 Story 评审 checklist 与交付 checklist。
  - [x] 让后续 BMAD Story 文件可直接复用统一元数据字段。

## Dev Notes

### Story Metadata

- Story ID: `0.6`
- Story Type: `Contract Story`
- Epic: `Epic 0`
- Depends On: `0.2`、`0.3`、`0.4`、`0.5`
- Blocks: 所有后续 Story 的 Ready / Done 判定与联调收口
- Contract Asset Path: `docs/01开发人员手册/004-开发规范/`
- Mock Asset Path: `mocks/`
- API / Event / Schema Impact: 无直接业务契约；定义 Story 层面的交付门禁与校验模板
- Persistence Impact: 无
- Frontend States Covered: mock 可运行、关键状态齐备、真实接口待联调
- Error States Covered: 需求模糊即开发、只做 happy path、联调前结构漂移、文档缺失
- Acceptance Test Notes: 以检查表、评审样例与门禁流程验证为主

### Business Context

- `Story 0.6` 是 Epic 0 的收口 Story，它把“什么叫可以开始做”和“什么叫真的做完了”从口头共识升级为工程规则。
- 没有这张卡，前面的目录、契约、mock 和日志基线都会在实际交付时失去约束力。
- 它不交付用户功能，但决定后续每个 Story 是否真的可进入开发、联调、合并和发布。

### Technical Guardrails

- DoR / DoD 必须直接继承 PRD 中已冻结的要求，不能另起一套口径。
- 并行开发门禁必须显式区分“mock 可开发”和“真实接口可联调”，避免把两者混为一谈。
- 必须把禁止写法显式写入规范，例如“等后端好了前端再做”“先把页面画出来联调时再改结构”“先不定义 schema”。
- 该 Story 不负责实现具体 CI 流程，但应为后续测试、合并和发版门禁提供明确检查项。

### Suggested File Targets

- `docs/01开发人员手册/004-开发规范/0008-story-交付门禁与-dor-dod.md`
- `docs/01开发人员手册/004-开发规范/0009-并行开发联调门禁.md`
- `docs/01开发人员手册/007-测试策略/0005-故事级验收清单.md`
- `_bmad-output/implementation-artifacts/story-template-checklist.md`

### Project Structure Notes

- 当前仓库已存在 `docs/01开发人员手册/004-开发规范/`、`007-测试策略/`、`009-里程碑与进度/` 等目录，适合作为门禁规则和检查清单的沉淀位置。
- Epic 1、2、10 的 Story 文件已经采用较完整的 BMAD 上下文字段，这张卡应把这种做法制度化，而不是继续依赖个别 Story 的临时发挥。
- 本 Story 先冻结规则与模板，不强行回写历史 Story 状态。

### Testing Requirements

- 验证每类 Story 都有可操作的 Ready / Done 判断标准。
- 验证正式前端页面 Story 与后端 / 契约 Story 的门禁差异被清楚区分。
- 验证“mock 可开发”“真实接口可联调”“可合并”“可发布”四层门禁不混淆。
- 验证禁止写法与伪完成模式被显式列出，评审时可直接检查。

### References

- `_bmad-output/planning-artifacts/epics/13-epic-0.md`：Story 0.6 AC 与交付物。
- `_bmad-output/planning-artifacts/prd/11-11-测试与上线门禁.md`：E2E 与上线门禁。
- `_bmad-output/planning-artifacts/prd/12-12-definition-of-ready-definition-of-done.md`：统一 DoR / DoD 基线。
- `_bmad-output/planning-artifacts/epics/31-final-validation-checklist.md`：跨架构、并行开发与数据边界收口检查项。
- `_bmad-output/planning-artifacts/epics/32-final-notes-for-story-writers.md`：Story 文件必备字段与禁止写法。
- `_bmad-output/planning-artifacts/architecture/03-3-核心术语与架构原则.md`：契约先行、双端并行原则。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `git diff --check`
- `rg -n "DoR|DoD|门禁|checklist" docs/01开发人员手册 _bmad-output/implementation-artifacts`

### Completion Notes List

- 已新增 Story 类型化 DoR / DoD 规范，明确 Contract / Infrastructure / Backend / Frontend / Persistence / Integration Story 的最小输入与完成口径。
- 已新增并行开发联调门禁文档，区分契约冻结、mock 可运行、测试通过、联调前、合并前、发布前六层门禁。
- 已新增故事级验收清单与 Story 模板检查清单，便于后续 Story 文件直接复用统一元数据字段。
- 已将新的门禁规则接入 Git 工作流、代码审查标准、BMAD 流程、测试总体策略与里程碑文档入口。

### File List

- `_bmad-output/implementation-artifacts/0-6-story-交付门禁与并行开发-dor-dod-冻结.md`
- `_bmad-output/implementation-artifacts/story-template-checklist.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/01开发人员手册/0000-AI快速导航索引.md`
- `docs/01开发人员手册/INDEX.md`
- `docs/01开发人员手册/004-开发规范/0002-Git工作流.md`
- `docs/01开发人员手册/004-开发规范/0003-代码审查标准.md`
- `docs/01开发人员手册/004-开发规范/0004-BMAD开发流程.md`
- `docs/01开发人员手册/004-开发规范/0008-story-交付门禁与-dor-dod.md`
- `docs/01开发人员手册/004-开发规范/0009-并行开发联调门禁.md`
- `docs/01开发人员手册/007-测试策略/0001-测试总体策略.md`
- `docs/01开发人员手册/007-测试策略/0005-故事级验收清单.md`
- `docs/01开发人员手册/009-里程碑与进度/0001-里程碑总览.md`
- `docs/01开发人员手册/009-里程碑与进度/0004-M3-测试上线.md`

### Change Log

- 2026-03-29：补齐 Story 交付门禁、并行开发门禁、故事级检查清单与 Story 模板清单，状态更新为 `review`。
