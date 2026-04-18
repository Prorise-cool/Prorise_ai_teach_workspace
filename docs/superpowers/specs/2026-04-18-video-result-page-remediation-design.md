# Video Result Page Remediation Design

> Issue: `#169 fix(epic-4): 视频结果页结果契约、设计稿还原与公开分享链路收口`
> Branch: `codex/issue-169-video-result-page-remediation`
> Scope: `student-web` + `fastapi-backend` + `RuoYi-Vue-Plus-5.X` + `_bmad-output` / `docs`

## Goal

在不偏离当前 Epic 3 / 4 主链路的前提下，收口 `/video/:id` 结果页的四类核心缺陷：布局偏离设计稿、字幕来源错误、section/timeline 未进入结果页正式契约、公开分享链路未真正打通。

## Problem Statement

当前结果页已经不是 Story 4.8 冻结的“结果消费端”实现，而是一套偏离设计稿的新壳层：

- 页面丢失题目摘要、知识点摘要、AI 标识与后续动作壳层。
- 底部字幕错误地消费 `result.summary`，而不是时间驱动的 narration/TTS 文本。
- 设计稿中的 section marker、tooltip、jump-point 没有接入当前结果页。
- publish / published list 仍依赖 `detail_ref`，但当前完成态主链路更多依赖 runtime `result_detail` 回退。
- “复制公开链接”复制的是当前私有结果页 URL，不是 public/share URL。
- 已公开内容目前只进入登录态发现区，不存在稳定的公开详情页链路。

这些问题跨越前端、FastAPI 契约与 RuoYi 发布承接，不能用单文件热修方式解决。

## Constraints

- `_bmad-output/` 是唯一事实来源；涉及 Story 4.8 / 4.9 / 4.10 / 4.11 的收口必须回写实施文档与 `sprint-status.yaml`。
- 按仓库规范采用 `Issue -> 短分支 -> Draft PR -> Review -> Squash and merge`。
- 本次不扩展视频生成算法，也不把 Companion / Evidence / Learning Coach 的完整业务功能塞进同一轮。
- 结果页必须尽量回到设计稿的页面结构，而不是继续在当前“全屏播放器壳层”上打补丁。

## Approaches

### Option A — 单 PR 大爆改

一次性同时改 student-web、FastAPI、RuoYi、文档和测试，在一个长生命周期 PR 内收口所有问题。

优点：
- 最终形态完整。
- 不需要处理中间兼容层。

缺点：
- 风险最高，前后端互相阻塞。
- reviewer 难以判定每一段变更的真实影响。
- 回归出错时难定位责任边界。

### Option B — 单 Issue / 单主分支 / 三条并行工作流

保持一个母 issue 和一个主修复分支，在同一 Draft PR 下拆成三条并行工作流：

1. `Track A`：结果页布局与交互还原
2. `Track B`：结果契约、字幕、timeline/section 承接
3. `Track C`：publish/public share/public detail 链路收口

优点：
- 满足当前项目规范的单 issue / 单 PR 流程。
- 可以并行推进，又保留统一收口点。
- 适合当前这类跨端但目标高度耦合的修复。

缺点：
- 需要严格控制合并顺序。
- Track A 在 Track B 完成前只能先接壳层或兼容字段。

### Option C — 多子 Issue + 多个 Stack PR

先拆多个子 issue，再做 stacked PR 或多个独立 PR。

优点：
- 每个 PR 更小、更纯。
- 每条线 review 边界最清晰。

缺点：
- 当前仓库实践并不以 stacked PR 为主。
- 对 release / merge / docs 回写的协调成本更高。
- 会把一次集中修复拆成过多管理动作。

## Recommended Approach

采用 `Option B`。

原因：

- 这次修复的本质是“一个学生侧结果消费面”的整体收口，而不是三件互不相关的功能。
- 单 issue + 单主分支 + 多团队并行，最符合仓库现有 GitHub Flow 和 `_bmad-output` 回写方式。
- 可以在一个 Draft PR 里透明展示整体进度，同时仍然让每条工作流保持相对独立。

## Execution Model

### Track A — Student Web 结果页还原

目标：

- 结果页结构回到设计稿语义：header、marker 进度条、发布区、中心舞台、字幕、Dock、固定右侧栏。
- 恢复结果元数据区与后续动作壳层。
- 修正播放器定位和侧栏压缩问题。

边界：

- 不自己创造新的后端字段语义。
- 在 Track B 完成前，可先做壳层与兼容接线，但最终字段以结果契约为准。

### Track B — 结果契约 / 字幕 / Timeline

目标：

- 把 `timeline` / `narration` / section 数据正式接入结果页消费链路。
- 明确 `summary` 是结果摘要，`narration` 才是字幕来源。
- 打通 preview / artifact / result detail 的承接关系。

边界：

- 不直接定义 public page 路由语义。
- 不改变视频生成核心算法，只负责结果消费所需字段的正式承接。

### Track C — Publish / Public Share

目标：

- 修复 `detail_ref` 断点。
- 统一 `taskId` / `resultId` / public page identifier / `publicUrl` 的语义。
- 让发布横幅和发现区不再依赖私有 URL 复制。
- 给出至少一条稳定公开详情页链路。

边界：

- 公开详情页只覆盖 MVP 所需展示面，不扩展社区互动能力。

## Dependency Order

### Phase 1 — 契约冻结

- 先冻结 Track B 与 Track C 的最小结果字段集合。
- 输出 student-web 最终要消费的结果结构。

### Phase 2 — 后端承接

- 先落 FastAPI / RuoYi 的结果与发布承接。
- 保证 `GET /result`、publish、published list、public detail 至少在契约层自洽。

### Phase 3 — 前端对接

- Track A 基于 Phase 1/2 的正式结构接结果页。
- 优先让布局回归和数据语义对齐一起落地，避免再做一次 adapter 热修。

### Phase 4 — 集成与文档收口

- 回写 `_bmad-output`、`docs/01开发人员手册/`、`sprint-status.yaml`。
- 补充真实用户点击验收清单。

## Draft PR Strategy

- 使用单个 Draft PR 承载本次修复。
- PR 描述按 Track A / B / C 组织。
- 每次合入子工作流后更新 PR checklist，而不是等全部完成后一次性补写。

建议 PR checklist：

- [ ] Track A 结果页结构与样式回归设计稿
- [ ] Track B 结果契约补齐 narration / timeline / section
- [ ] Track C publish / public detail / publicUrl 收口
- [ ] student-web 回归测试通过
- [ ] fastapi-backend 回归测试通过
- [ ] 文档与 sprint status 已回写
- [ ] 用户验收清单已附在 docs

## Testing Strategy

### Frontend

- 结果页渲染状态测试
- 字幕随时间切换测试
- marker / tooltip / jump-point 测试
- publish banner / public URL / public detail 路由测试

### Backend

- `GET /api/v1/video/tasks/{id}/result` 契约测试
- publish / unpublish / published list / public detail 测试
- `detail_ref` 缺失但 runtime 存在时的承接测试
- artifact / narration / timeline 承接测试

### Integration

- 真实完成态结果页可播放、可显示字幕、可跳 section
- 公开发布后可从输入页发现区进入公开详情页
- 取消公开后发现区与公开详情链路同步失效

## Documentation Impact

本次必须更新：

- `_bmad-output/implementation-artifacts/4-8-视频结果页播放器与结果操作.md`
- `_bmad-output/implementation-artifacts/4-9-视频侧-sessionartifactgraph-回写.md`
- `_bmad-output/implementation-artifacts/4-10-视频结果公开发布与输入页复用卡片.md`
- `_bmad-output/implementation-artifacts/4-11-视频等待页渐进式产物展示与分段预览.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/01开发人员手册/` 下对应进度/验收记录

## Risks

- 如果 Track B 只补字段、不修 finalize 承接，Track C 仍会被 `detail_ref` 断点击穿。
- 如果 Track A 先重做 UI 而没有正式结果字段，容易再次出现“先上壳层，后补契约”的回归。
- 如果 public detail route 不冻结语义，前端可能再次复制私有 URL 冒充公开链接。

## Success Criteria

- 结果页视觉结构与设计稿核心语义一致。
- 字幕、section 跳转、公开链接三条能力都使用真实业务数据。
- 发布与公开详情链路不再依赖脆弱的 runtime-only 行为。
- 文档、issue、branch、PR、验收清单全部在同一条修复轨道内可追溯。
