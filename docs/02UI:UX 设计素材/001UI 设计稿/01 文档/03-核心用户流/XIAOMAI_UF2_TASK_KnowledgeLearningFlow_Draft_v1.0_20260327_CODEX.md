# XIAOMAI_UF2_TASK_KnowledgeLearningFlow_Draft_v1.0_20260327_CODEX

## 任务定位
补齐知识问答、课后小测、学习路径、历史回看等学习沉淀相关流程。

## 执行信息
- 波次：Wave 2
- 可并行：`HomeAuthFlow`、`VideoLearningFlow`、`ClassroomFlow`
- 依赖：Wave 1 IA 文档
- 建议角色：交互设计 / UX
- 优先模板：`00 设计流程/templates/node_prompts/02核心用户流/*`

## 必须覆盖
- `/knowledge` 提问、流式回答、引用来源、术语解释、上传解析
- `/quiz/:sessionId` 开始、作答、即时反馈、完成统计
- `/path` 目标、生成、保存、调整
- `/history` 结果回看、删除确认、空态

## 输出物
- 新增：`01 文档/03-核心用户流/UF2-知识问答与学习沉淀主流程.md`

## 完成标准
- 明确哪些流程是 MVP，哪些是后置扩展
- 覆盖来源不足、解析失败、空列表、删除确认等状态
- 历史回看与学习路径不与主任务等待流混淆
