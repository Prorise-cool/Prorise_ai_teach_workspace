# XIAOMAI_IA1_TASK_GlobalNavigationRoutes_Draft_v1.0_20260327_CODEX

## 任务定位
产出全局导航、正式路由、受保护路由与非路由交互边界文档。

## 执行信息
- 波次：Wave 1
- 可并行：`XIAOMAI_IA1_TASK_LearningMainlineIA_*`、`XIAOMAI_IA1_TASK_ResultProfileIA_*`
- 依赖：`XIAOMAI_IN0_TASK_DesignInputFreeze_*`
- 建议角色：信息架构 / 产品设计
- 优先模板：`00 设计流程/templates/node_prompts/01信息架构/*`

## 禁止事项
- 不新增独立老师风格页面
- 不把认证对话框、共享等待壳层写成正式主路由
- 不修改现有 `03-线框图` 路径结构

## 本任务必须覆盖
- 首页双入口与最浅导航
- 视频 / 课堂两条平行主链路
- 知识问答、学习中心、历史、个人域入口关系
- 受保护路由与未登录拦截策略
- 正式页面 vs 非路由交互的边界
- P0 / P1 / P2 页面层级

## 输出物
- 新增：`01 文档/02-信息架构/IA1-全局导航与路由骨架.md`

## 完成标准
- 所有 P0 页面可挂到结构中
- 与现有线框正式路由结构不冲突
- 明确哪些页面走 FastAPI，哪些走 RuoYi
