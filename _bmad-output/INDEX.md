# Directory Index: _bmad-output

> `_bmad-output/` 是本仓库唯一的事实来源，产品、需求、UX、架构、Epic、Story 与实现状态统一以这里为准。

## Files

- [INDEX.md](./INDEX.md) - BMAD 输出总入口与导航规则

## Subdirectories

### brainstorming/

- [brainstorming-session-2026-03-18-142300.md](./brainstorming/brainstorming-session-2026-03-18-142300.md) - 项目早期产品与技术头脑风暴记录

### implementation-artifacts/

- [index.md](./implementation-artifacts/index.md) - 实施产物总索引与 Story 执行文档入口
- [4-3-manimcat-large-prompt-stream-524修复-20260416.md](./implementation-artifacts/4-3-manimcat-large-prompt-stream-524修复-20260416.md) - Story 4.3 针对大 payload `stream first` 导致的 `524` 风险修复，新增输入大小阈值与 direct non-stream 策略
- [4-3-manimcat-bulk-render-save-sections-收口-20260414.md](./implementation-artifacts/4-3-manimcat-bulk-render-save-sections-收口-20260414.md) - Story 4.3 的 ManimCat 真正 bulk-render 收口与实机复验，固定 `MainScene + --save_sections` 路径、记录 full-code 失败样本，并在 2026-04-15 补齐 fatal failure / errorCode / SSE 收口后追加真实 token 复验（`5m24s` 失败、preview `failedSections=10`、无 section 风暴）
- [4-3-manimcat-review-compat-fix-20260415.md](./implementation-artifacts/4-3-manimcat-review-compat-fix-20260415.md) - Story 4.3 基于 `references/ManimCat-main` 的审查与兼容修复记录，收口测试导入断裂、preview 完成态覆盖、旧 façade 缺失问题，并在 2026-04-16 补齐死代码清理、现架构测试对齐与 `.webm` 输出统一
- [4-11-视频等待页渐进式产物展示与分段预览.md](./implementation-artifacts/4-11-视频等待页渐进式产物展示与分段预览.md) - 等待页“先展示分镜与已完成片段、最终结果页仍只认整片”的渐进体验方案 Story，并补充 2026-04-16 本地 Dramatiq worker 启动稳定性、分镜承接与旁白尾句收口约束
- [4-11-fastapi-渐进预览后端实现说明-20260413.md](./implementation-artifacts/4-11-fastapi-渐进预览后端实现说明-20260413.md) - Story 4.11 的 FastAPI 后端重构收口，记录 per-section streaming、preview endpoint 与 section SSE 事件
- [4-11-视频等待页渐进预览前端接入需求说明-20260416.md](./implementation-artifacts/4-11-视频等待页渐进预览前端接入需求说明-20260416.md) - Story 4.11 的前端接入需求说明，明确等待页三段式能力、preview/status/SSE/result 边界与 student-web 归属点
- [4-8-视频结果页result-detail运行态回退修复-20260412.md](./implementation-artifacts/4-8-视频结果页result-detail运行态回退修复-20260412.md) - 视频结果页“视频不可用”热修记录，补齐 `result_detail` 回退、超时失败语义与 `2026-04-12` 实机全流程验证
- [4-2-4-3-plan-d-编排与契约收口-20260410.md](./implementation-artifacts/4-2-4-3-plan-d-编排与契约收口-20260410.md) - Plan D 剩余编排绕路、前端契约和 SQL 迁移的 2026-04-10 收口记录
- [4-3-manim-429-重试风暴热修复-20260410.md](./implementation-artifacts/4-3-manim-429-重试风暴热修复-20260410.md) - 视频管道 429 重试风暴、健康缓存与 fallback 热修记录，补充 DeepSeek 并发 smoke test 与 auth proxy 阻塞说明
- [4-7-视频等待页SSE实时状态故障调查-20260409.md](./implementation-artifacts/4-7-视频等待页SSE实时状态故障调查-20260409.md) - 视频等待页实时状态丢失问题调查结论
- [4-7-视频等待页SSE实时状态修复-20260409.md](./implementation-artifacts/4-7-视频等待页SSE实时状态修复-20260409.md) - 视频等待页 SSE 流式消费修复与验证记录
- [4-7-并行阶段SSE进度防倒退与性能恢复-20260409.md](./implementation-artifacts/4-7-并行阶段SSE进度防倒退与性能恢复-20260409.md) - 并行阶段进度防倒退、Provider 连接复用与真实链路性能记录


### planning-artifacts/

- [index.md](./planning-artifacts/index.md) - 规划产物总索引
- [architecture/index.md](./planning-artifacts/architecture/index.md) - 架构分片入口
- [epics/index.md](./planning-artifacts/epics/index.md) - Epic / Story 分片入口
- [prd/index.md](./planning-artifacts/prd/index.md) - PRD 分片入口
- [ux-design-specification/index.md](./planning-artifacts/ux-design-specification/index.md) - UX 分片入口
- [product-brief-小麦-2026-03-22.md](./planning-artifacts/product-brief-小麦-2026-03-22.md) - MVP 范围与成功指标简报
- [archive/](./planning-artifacts/archive/) - 原始整篇文档备份
- [research/](./planning-artifacts/research/) - 规划阶段配套研究资料

### research/

- [technical-AI教学视频智能体-research-2026-03-21.md](./research/technical-AI教学视频智能体-research-2026-03-21.md) - 技术方案、部署与复用策略调研
- [openmaic-issue-pr-audit-2026-03-23.md](./research/openmaic-issue-pr-audit-2026-03-23.md) - OpenMAIC Issue 与 PR 审计记录

## Usage Rules

- 任何导航文件若与 `_bmad-output/` 实际内容冲突，以 `_bmad-output/` 当前文件树为准。
- 新的规划、拆解、故事与阶段状态优先写入此目录，再由其他索引回链。
- 仓库根导航请查看 [`../INDEX.md`](../INDEX.md)。
