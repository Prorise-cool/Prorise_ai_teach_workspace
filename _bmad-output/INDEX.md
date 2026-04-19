# Directory Index: _bmad-output

> `_bmad-output/` 是本仓库唯一的事实来源，产品、需求、UX、架构、Epic、Story 与实现状态统一以这里为准。

## Files

- [INDEX.md](./INDEX.md) - BMAD 输出总入口与导航规则

## Subdirectories

### brainstorming/

- [brainstorming-session-2026-03-18-142300.md](./brainstorming/brainstorming-session-2026-03-18-142300.md) - 项目早期产品与技术头脑风暴记录

### implementation-artifacts/

- [index.md](./implementation-artifacts/index.md) - 实施产物总索引与 Story 执行文档入口
- [../docs/01开发人员手册/009-里程碑与进度/0030-fastapi-测试体系规范化-20260417.md](../docs/01开发人员手册/009-里程碑与进度/0030-fastapi-测试体系规范化-20260417.md) - FastAPI 后端测试体系规范化收口记录，包含 pytest 契约、CI 对齐与低价值测试清理
- [4-3-manim-buf-关键词与失败链路收口-20260417.md](./implementation-artifacts/4-3-manim-buf-关键词与失败链路收口-20260417.md) - Story 4.3 收口 `buf` 关键词误用与 render failure 遮蔽问题，明确该类修复必须停留在 prompt/codebook 与失败链路层，不能塞进 `agent.py` 运行时硬改
- [4-3-manimcat-large-prompt-stream-524修复-20260416.md](./implementation-artifacts/4-3-manimcat-large-prompt-stream-524修复-20260416.md) - Story 4.3 针对大 payload `stream first` 导致的 `524` 风险修复，新增输入大小阈值与 direct non-stream 策略
- [4-3-manimcat-bulk-render-save-sections-收口-20260414.md](./implementation-artifacts/4-3-manimcat-bulk-render-save-sections-收口-20260414.md) - Story 4.3 的 ManimCat 真正 bulk-render 收口与实机复验，固定 `MainScene + --save_sections` 路径、记录 full-code 失败样本，并在 2026-04-15 补齐 fatal failure / errorCode / SSE 收口后追加真实 token 复验（`5m24s` 失败、preview `failedSections=10`、无 section 风暴）
- [4-3-manimcat-review-compat-fix-20260415.md](./implementation-artifacts/4-3-manimcat-review-compat-fix-20260415.md) - Story 4.3 基于 `references/ManimCat-main` 的审查与兼容修复记录，收口测试导入断裂、preview 完成态覆盖、旧 façade 缺失问题，并在 2026-04-16 补齐死代码清理、现架构测试对齐与 `.webm` 输出统一
- [4-11-视频等待页渐进式产物展示与分段预览.md](./implementation-artifacts/4-11-视频等待页渐进式产物展示与分段预览.md) - 等待页“先展示分镜与已完成片段、最终结果页仍只认整片”的渐进体验方案 Story，并补充 2026-04-16 本地 Dramatiq worker 启动稳定性、分镜承接与旁白尾句收口约束
- [4-11-fastapi-渐进预览后端实现说明-20260413.md](./implementation-artifacts/4-11-fastapi-渐进预览后端实现说明-20260413.md) - Story 4.11 的 FastAPI 后端重构收口，记录 per-section streaming、preview endpoint 与 section SSE 事件
- [4-11-视频等待页渐进预览前端接入需求说明-20260416.md](./implementation-artifacts/4-11-视频等待页渐进预览前端接入需求说明-20260416.md) - Story 4.11 的 student-web 前端接入与验收说明，现已完成输入页 icon 化预设/高级参数、全量 i18n/亮暗色补齐、preview/status/SSE 三路接入；并在 2026-04-17 追加等待页摘要富文本、summary 优先停留、分段技术字段下线、播放器容器填充/防挤压修复与全局 feedback 收口，状态进入 review
- [4-11-输入页当前任务状态卡与返回聚焦补齐-20260418.md](./implementation-artifacts/4-11-输入页当前任务状态卡与返回聚焦补齐-20260418.md) - Story 4.11 追加修补：把等待页返回输入页后的任务承接从“只在 bell dropdown 里可见”补齐为输入页主体显式当前任务卡，并同步接上 `focusTask/toast` 返回参数与输入页取消入口
- [4-11-首页视频任务承接与任务中心红点修正-20260418.md](./implementation-artifacts/4-11-首页视频任务承接与任务中心红点修正-20260418.md) - Story 4.11 第二轮前端修补：红点改为仅在有活跃任务时显示，并把首页 `/` 也接入当前视频任务状态卡与顶栏任务中心
- [4-11-视频输入页任务中心404容错修复-20260418.md](./implementation-artifacts/4-11-视频输入页任务中心404容错修复-20260418.md) - Story 4.11 第三轮前端修补：活跃任务聚合层改为跳过单条 `status 404` 的过期任务，避免 bell 和当前任务卡被整批清空
- [4-11-视频任务删除500与首页状态404风暴热修复-20260419.md](./implementation-artifacts/4-11-视频任务删除500与首页状态404风暴热修复-20260419.md) - Story 4.11 第四轮热修：删除接口改为先落库再删 Redis，首页/输入页/等待页任务中心会立即清理本地缓存，并抑制 stale taskId 的重复 `/status 404` 轮询
- [4-11-视频输入页私有公开双分区浏览区与轻量卡片改造-20260419.md](./implementation-artifacts/4-11-视频输入页私有公开双分区浏览区与轻量卡片改造-20260419.md) - Story 4.11 输入页浏览区补强：把底部 feed 改成私有 / 公开 tabs 切换，并收口长 summary 导致卡片过高的问题
- [4-11-等待页摘要后端接入与完成态交互修补-20260417.md](./implementation-artifacts/4-11-等待页摘要后端接入与完成态交互修补-20260417.md) - Story 4.11 追加修补：等待页摘要改由后端理解阶段真实产出，preview 提前发布 summary，完成后取消自动跳转并改为用户手动前往结果页；同日已补 system Python 回归验证
- [4-11-理解摘要-json-约束与解析加固-20260417.md](./implementation-artifacts/4-11-理解摘要-json-约束与解析加固-20260417.md) - Story 4.11 进一步修补：UnderstandingService 增加强 JSON 输出约束，并补上语义校验、二次 repair、分镜回填兜底，以及 `dramatiq` 1.x / 2.x 的 Prometheus 兼容
- [4-11-等待页摘要口吻与预览文风优化-20260417.md](./implementation-artifacts/4-11-等待页摘要口吻与预览文风优化-20260417.md) - Story 4.11 第二轮修补：把等待页摘要从“证明提纲”风格改成老师讲题口吻，并把 preview 步骤从编号粗体改成轻量 bullet
- [4-11-等待页暗色主题与输入页对齐-20260417.md](./implementation-artifacts/4-11-等待页暗色主题与输入页对齐-20260417.md) - Story 4.11 等待页暗色主题收口，移除失效的 `.dark` 依赖并把卡片/标签/详情区 surface 对齐到输入页同源的 `:root[data-theme='dark']` + 全局 token 体系
- [4-8-视频结果页主舞台满铺与悬浮控件修复-20260419.md](./implementation-artifacts/4-8-视频结果页主舞台满铺与悬浮控件修复-20260419.md) - Story 4.8 结果页布局收口：播放器重新吃满主舞台，字幕与 Dock 只作为悬浮覆盖层存在
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
