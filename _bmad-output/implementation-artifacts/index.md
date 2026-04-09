# Implementation Artifacts 索引

本目录包含各 Epic/Story 的详细实施文档，是开发执行的主要参考。

## Epic 1: 用户接入、统一入口与启动配置

### Story 1.1: 统一认证契约、会话 payload 与 mock 基线
- [文档](./1-1-统一认证契约会话-payload-与-mock-基线.md)
- **状态**: 已完成
- **说明**: 定义认证接口 schema、mock session 样例、401/403 行为说明

### Story 1.2: 独立认证页中的注册登录与回跳
- [文档](./1-2-独立认证页中的注册登录与回跳.md)
- **状态**: 已完成
- **说明**: 实现账密登录、GitHub/QQ 三方登录、注册开关控制

### Story 1.3: 登出、401 处理与受保护访问一致性
- [文档](./1-3-登出401-处理与受保护访问一致性.md)
- **状态**: 已完成
- **说明**: 前端、FastAPI 与 RuoYi 认证态一致性处理

### Story 1.4: 首页课堂直达入口与顶栏导航分发
- [文档](./1-4-首页课堂直达入口与顶栏导航分发.md)
- **状态**: 已完成
- **说明**: 首页单主入口 Hero/CTA、顶边栏导航分发

### Story 1.5: 用户配置系统（个人简介与学习偏好）⭐
- [文档](./1-5-用户配置系统（个人简介与学习偏好）.md)
- **状态**: ready-for-dev
- **说明**: 三页渐进式引导（个人信息简介 → 信息收集 → 导览页）
- **关键点**:
  - 使用 RuoYi 代码生成器快速实现 CRUD
  - 字段与 OpenMAIC UserRequirements 对齐
  - 5 种性格类型 + 12 种导师标签
- **数据库**: `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260404_xm_user_profile.sql`

### Story 1.6: 角色边界与入口级权限可见性
- [文档](./1-6-角色边界与入口级权限可见性.md)
- **状态**: 已有初步实现
- **说明**: 基于角色的入口显示与权限不足处理

### Story 1.7: 营销落地页与 home 首页分流
- [文档](./1-7-营销落地页与-home-首页分流.md)
- **状态**: in-progress
- **说明**:
  - `/landing` 独立营销页与 `/` 默认首页分流
  - 现有联系表单需从 `mailto:` 升级为真实 RuoYi 提交
  - 新增营销线索表与后台最小查询 / 导出闭环
  - 保留现有落地页视觉与首页分流成果，不重新打开整页视觉返工

## Epic 1 实施基线文档

### OpenMAIC 对齐基线
- [文档](../planning-artifacts/epics/epic-1-openmaic-alignment-baseline.md)
- **说明**: Epic 1 与 OpenMAIC 智能师生匹配系统的对齐设计
- **核心原则**: 用户填写个人特点 → 系统智能生成/匹配 AI agents

### 实施基线与执行计划
- [文档](../planning-artifacts/epics/epic-1-implementation-baseline.md)
- **说明**: 数据库、后端、前端详细实施步骤
- **包含**: 依赖关系图、代码示例、验收标准

## Epic 5: 主题课堂学习闭环

### Story 5.1: 课堂任务契约、结果 schema 与 mock session 基线
- [文档](./5-1-课堂任务契约结果-schema-与-mock-session-基线.md)
- **状态**: ready-for-dev
- **说明**: 冻结课堂创建、结果、completion signal 与 mock session 契约

### Story 5.2: 主题输入与课堂任务创建
- [文档](./5-2-主题输入与课堂任务创建.md)
- **状态**: ready-for-dev
- **说明**: 打通 `/classroom/input` 的主题输入、`userProfile` 透传与任务创建跳转

### Story 5.3: 课堂等待页与统一进度复用
- [文档](./5-3-课堂等待页与统一进度复用.md)
- **状态**: ready-for-dev
- **说明**: 基于统一任务契约落地课堂等待页、SSE 恢复与 `/status` 降级

### Story 5.4: 课堂生成服务与多 Agent 讨论结果
- [文档](./5-4-课堂生成服务与多-agent-讨论结果.md)
- **状态**: ready-for-dev
- **说明**: 建立课堂生成主链路，产出 slides、discussion、whiteboard 输入与统一失败语义

### Story 5.5: 白板布局与基础可读性规则
- [文档](./5-5-白板布局与基础可读性规则.md)
- **状态**: ready-for-dev
- **说明**: 冻结 whiteboard layout schema，并以“基础可读 + 结构化降级”为目标实现

### Story 5.6: 课堂结果页中的幻灯片、讨论与白板浏览
- [文档](./5-6-课堂结果页中的幻灯片讨论与白板浏览.md)
- **状态**: ready-for-dev
- **说明**: 落地 `/classroom/:id` 结果页与三类 viewer，同时固定后续入口边界

### Story 5.7: 会话结束信号与课后触发出口
- [文档](./5-7-会话结束信号与课后触发出口.md)
- **状态**: ready-for-dev
- **说明**: 定义 completion signal、课后 CTA 与对 Epic 8 的 handoff 参数

### Story 5.8: 课堂侧 SessionArtifactGraph 回写
- [文档](./5-8-课堂侧-sessionartifactgraph-回写.md)
- **状态**: ready-for-dev
- **说明**: 将课堂 artifact、章节摘要与 learning signal 回写到长期宿主

### Story 5.9: 课堂输入页联网搜索增强与证据范围配置
- [文档](./5-9-课堂输入页联网搜索增强与证据范围配置.md)
- **状态**: ready-for-dev
- **说明**: 在课堂输入页增加显式联网搜索开关、最小证据范围与可降级透传

### Story 5.10: 课堂结果导出与分享产物
- [文档](./5-10-课堂结果导出与分享产物.md)
- **状态**: ready-for-dev
- **说明**: 以 `PPTX` 或等效教学分享文件为优先目标，补齐导出状态与失败闭环

## Epic 3: 单题视频输入与任务创建

### Story 3.1: 视频任务创建契约与 mock task 基线
- [文档](./3-1-视频任务创建契约与-mock-task-基线.md)
- **状态**: ready-for-dev
- **说明**: 冻结 `POST /api/v1/video/tasks` schema、错误码、mock 样例与前端 mock handler

### Story 3.2: 视频输入页壳层与多模态输入交互
- [文档](./3-2-视频输入页壳层与多模态输入交互.md)
- **状态**: ready-for-dev
- **说明**: 重构输入页表单管理（react-hook-form + zod），对接创建 adapter，实现提交态/错误态

### Story 3.3: 图片 / OCR 前置预处理接口
- [文档](./3-3-图片-ocr-前置预处理接口.md)
- **状态**: ready-for-dev
- **说明**: 实现图片校验、存储与 OCR 预处理，OCR 失败降级不阻断主流程

### Story 3.4: 视频任务创建接口与初始化运行态
- [文档](./3-4-视频任务创建接口与初始化运行态.md)
- **状态**: ready-for-dev
- **说明**: 实现 `POST /api/v1/video/tasks`，含幂等处理、Redis 运行态、Dramatiq 分发

### Story 3.5: 创建后跳转等待页与任务上下文承接
- [文档](./3-5-创建后跳转等待页与任务上下文承接.md)
- **状态**: done
- **说明**: 实现视频等待页、SSE 事件消费、任务上下文恢复与失败重试

### Story 3.6: 视频输入页公开视频广场与复用入口
- [文档](./3-6-视频输入页公开视频广场与复用入口.md)
- **状态**: ready-for-dev
- **说明**: 实现公开视频发现区、卡片数据消费、"查看讲解"与"复用题目"动作

## Epic 4: 单题视频生成、结果消费与失败恢复

### Story 4.1: 视频流水线阶段、进度区间与结果契约冻结
- [文档](./4-1-视频流水线阶段进度区间与结果契约冻结.md)
- **状态**: ready-for-dev
- **说明**: 冻结 VideoStage 枚举（8 阶段）、进度 0-100 区间、VideoResult/VideoFailure schema 与 mock SSE stage 流

### Story 4.2: 题目理解与分镜生成服务
- [文档](./4-2-题目理解与分镜生成服务.md)
- **状态**: ready-for-dev
- **说明**: 实现 understanding service（主题摘要、知识点、解题步骤）与 storyboard service（场景分镜、旁白、时长约束 90-180s）

### Story 4.3: Manim 代码生成与自动修复链
- [文档](./4-3-manim-代码生成与自动修复链.md)
- **状态**: ready-for-dev
- **说明**: 实现 manim_gen service 与 FixChain（RuleBasedFixer → LLMBasedFixer），最大修复 2 次

### Story 4.4: Manim 沙箱执行与资源限制
- [文档](./4-4-manim-沙箱执行与资源限制.md)
- **状态**: ready-for-dev
- **说明**: 实现 SandboxExecutor 抽象与 DockerSandboxExecutor，含 AST 安全扫描与资源限制（1vCPU/2GiB/120s）

### Story 4.5: TTS 合成与 Provider Failover 落地
- [文档](./4-5-tts-合成与-provider-failover-落地.md)
- **状态**: ready-for-dev
- **说明**: 实现 TTS 服务与 Provider Failover（Story 2.8），按场景粒度处理，支持 MP3 44100Hz 192kbps

### Story 4.6: FFmpeg 合成、COS 上传与完成结果回写
- [文档](./4-6-ffmpeg-合成cos-上传与完成结果回写.md)
- **状态**: ready-for-dev
- **说明**: FFmpeg 合成（H.264+AAC）、COS 上传重试、封面帧提取、VideoResult 回写 Redis/RuoYi

### Story 4.7: 视频等待页前端状态机、恢复与降级
- [文档](./4-7-视频等待页前端状态机恢复与降级.md)
- **状态**: review
- **说明**: zustand 状态机、SSE 事件消费、status 轮询降级、manim_fix 修复态 UI
- [调查记录](./4-7-视频等待页SSE实时状态故障调查-20260409.md)
- [修复记录](./4-7-视频等待页SSE实时状态修复-20260409.md)
- [补充修复记录](./4-7-并行阶段SSE进度防倒退与性能恢复-20260409.md)
- **调查结论**: 当前实时状态丢失的主因是前端把 `text/event-stream` 用 `response.text()` 整体读完后再解析，导致长连接期间不会产出任何事件；同时后端 `connected` / `heartbeat` 缺少 `id` / `sequence`，会被前端 parser 丢弃
- **修复摘要**: `student-web` 已改为基于 `ReadableStream` 的增量 SSE 解析，并为缺失契约身份的 `connected` / `heartbeat` 生成仅本地使用的 transient id，避免等待页卡死且不污染 `Last-Event-ID`
- **补充摘要**: 2026-04-10 已补齐后端并行阶段的防倒退处理与 Provider 连接复用：恢复性能优化后，同步调整 stage 区间、在 `_emit_stage` 中阻止 `progress` 回退，并记录真实链路下 `181.26s` 的成功样本与重载样本观察

### Story 4.8: 视频结果页、播放器与结果操作
- [文档](./4-8-视频结果页播放器与结果操作.md)
- **状态**: ready-for-dev
- **说明**: Video.js 播放器封装、结果页布局、后续动作入口（disabled）、结果操作区壳层

### Story 4.9: 视频侧 SessionArtifactGraph 回写
- [文档](./4-9-视频侧-sessionartifactgraph-回写.md)
- **状态**: ready-for-dev
- **说明**: VideoArtifactGraph 组装与 RuoYi 回写，含 timeline/storyboard/narration/knowledge_points/solution_steps 五类 artifact

### Story 4.10: 视频结果公开发布与输入页复用卡片
- [文档](./4-10-视频结果公开发布与输入页复用卡片.md)
- **状态**: ready-for-dev
- **说明**: publish/unpublish API、PublishedVideoCard schema、公开列表分页与 Story 3.6 发现区对接

## 快速导航

- [Epic 1 执行清单](../../../docs/01开发人员手册/0000-AI快速导航索引/epic-1-execution-checklist.md)
- [Epic/Story 总索引](../planning-artifacts/epics/index.md)
