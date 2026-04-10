# AGENTS.md — Workspace Agent Instructions

## first things
你首要目的就是使用 mempalace mcp 搜索项目规范相关的任务，每一次对话开始前都必须读取一遍项目规范，这是必须遵守的点

## Canonical Source of Truth
- `_bmad-output/` 是本仓库**唯一的事实来源**（PRD、架构、Epic、Story、实现状态、sprint-status.yaml 全部以此为准）。
- 其他文件仅作导航。若与 `_bmad-output/` 冲突，以 `_bmad-output/INDEX.md` 为准。
- 阅读任何文档前**必须先查 MemPalace**。

## MCP 调用规则（Agent 必须严格遵守）
每次思考前，先判断当前场景，**优先调用以下 MCP**：

| 场景                          | 优先调用 MCP                          | 用途说明                                      | 备选 MCP                  |
|-------------------------------|---------------------------------------|-----------------------------------------------|---------------------------|
| 需要检索项目记忆、规范、_bmad-output、文档、sprint 状态 | **mempalace**                        | wake-up / search / list_wings                 | -                         |
| 需要快速编辑、应用代码变更    | **morphllm-fast-apply**              | 批量修改文件、生成补丁                        | filesystem                |
| 需要联网搜索最新信息          | **tavily-remote-mcp** 或 **exa-ai**  | 外部知识、API 文档、技术方案                  | -                         |
| 需要 GitHub 操作（Issue、PR） | **github**                           | 创建 Issue、Draft PR、Review、merge           | -                         |
| 需要读写本地文件              | **filesystem**                       | 大范围文件浏览、创建目录                      | -                         |
| 需要增强上下文或长期记忆      | **augment-context-engine** 或 **context7** | 上下文压缩、长期记忆注入                      | mempalace                 |
| 需要 Excel / 数据处理         | **excel**                            | 数据表格处理                                  | -                         |
| 需要浏览器自动化/调试         | **chrome-devtools**                  | 前端调试、页面验证                            | -                         |
| 需要 Redis 操作               | **redis-mcp**                        | 缓存、队列检查                                | -                         |
| 其他复杂任务                  | 先用 **mempalace** 检索记忆，再决定 | -                                             | -                         |

**MCP 使用铁律**：
- 任何与**项目历史、规范、_bmad-output** 相关的问题 → **必须先调用 mempalace**。
- 不要凭空猜测，先查记忆再行动。
- 调用 MCP 后，必须把结果总结后继续思考。

## Memory & Document Management（Agent 主动职责）
1. **任务开始前**：必须调用 `mempalace wake-up --wing ProriseAI_Teach` 或 `mempalace_search`。
2. **任务结束后**：主动更新 `_bmad-output/INDEX.md`、`sprint-status.yaml` 和 `docs/01开发人员手册/`。
3. 重要决策、变更、验收清单必须回写文档。

## GitHub Flow & 收口规则
- 除非用户明显提示在 master分支上开发，否则严格：Issue → 短分支 → Draft PR → Review → Squash and merge去修改项目级代码
- 收口前必须完成自测 + 文档回写 + 更新 _bmad-output 状态。
- 一个大模块若涉及到前端实际验收时必须要在 docs 里给一个真正的用户实际验收清单让用户去验收，用户只负责前端点击操作功能式的验收，其他验收需要你自行做

## Done 定义
任务只有在以下全部满足时才算完成：
- 代码 + 测试 + 文档 + 记忆更新全部完成
- MemPalace 已正确调用并回写
- 用户明确验收通过（或明确授权直接 merge）
