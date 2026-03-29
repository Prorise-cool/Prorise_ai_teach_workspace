# XIAOMAI_IA1_TASK_LearningMainlineIA_Draft_v1.0_20260327_CODEX

## 任务定位
产出学习主链路的信息架构，重点覆盖视频、课堂、知识问答、等待态与结果页之间的关系。

## 执行信息
- 波次：Wave 1
- 可并行：`GlobalNavigationRoutes`、`ResultProfileIA`
- 依赖：`DesignInputFreeze`
- 建议角色：信息架构 / 交互设计
- 优先模板：`00 设计流程/templates/node_prompts/01信息架构/*`

## 本任务必须覆盖
- `/video/input -> /video/:id/generating -> /video/:id`
- `/classroom/input -> /classroom/:id/generating -> /classroom/:id`
- `/knowledge`
- `/quiz/:sessionId`
- `/path`
- 共享等待壳层、风格面板、认证对话框的挂载位置

## 输出物
- 新增：`01 文档/02-信息架构/IA1-学习主链路信息架构.md`

## 完成标准
- 课堂与视频是平行链路，不被混成一条
- 等待态与结果态的关系清晰
- 标出哪些能力是 P2 后置，不阻塞 MVP
