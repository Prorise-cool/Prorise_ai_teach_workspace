# Workspace Agent Instructions

## Canonical Source

- `_bmad-output/` 是本仓库唯一的事实来源。
- 产品、PRD、UX、架构、Epic、Story 与实现状态，统一以 `_bmad-output/` 为准。
- 所有导航文件仅作入口使用；若与 `_bmad-output/` 冲突，以 `_bmad-output/` 为准。

## Documentation Output

- 开发过程中的总结文档、排查结论、实现说明与维护记录，统一沉淀到 `docs/01开发人员手册/`。
- 快速导航入口优先查看 `docs/01开发人员手册/0000-AI快速导航索引.md`。
- 如果需要新增过程约定，优先补充到 `docs/01开发人员手册/004-开发规范/`。
- 如果需要新增阶段性总结，优先补充到 `docs/01开发人员手册/009-里程碑与进度/`。

## Workspaces

- 主代码工作区：`packages/`
- 参考或照抄来源：`references/`
- `references/` 默认按只读参考处理；实际业务代码不要直接写在这里。
- 借鉴或照抄外部项目时，需同时记录来源项目与许可证约束。

## Entry Points

- 全局索引：`INDEX.md`
- 架构导航：`ARCHITECTURE.md`
- BMAD 输出索引：`_bmad-output/INDEX.md`
- 代码工作区索引：`packages/INDEX.md`
- 参考项目索引：`references/INDEX.md`

## GitHub Flow 对接方式

实施阶段默认与 GitHub Flow 绑定执行：

1. `Create Story` 或现有 Story 文档确认后，先创建对应 GitHub Issue。
2. 基于 Issue / Story 拉出短分支，例如 `feature/story-1-1-auth-entry`。
3. `Dev Story` 阶段通过 Draft PR 持续暴露实现进度。
4. `Code Review` 阶段以 GitHub PR 为载体执行，审查结论回写到 PR。
5. 审查通过后以 `Squash and merge` 合回 `master`。

### Story 进入开发前的最小前置条件

1. PRD、架构、Epic / Story 已完成并相互对齐。
2. `004-开发规范` 与 `005-环境搭建` 已初始化。
3. GitHub 仓库已按 `0002-Git工作流.md` 启用受保护分支与 PR 流程。
4. 对于 `story 1-1`，已明确认证由 RuoYi 承载，业务前端承载路径采用架构默认方案。