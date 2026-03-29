# XIAOMAI_UF2_TASK_ClassroomFlow_Draft_v1.0_20260327_CODEX

## 任务定位
补齐课堂输入、等待、结果浏览、多 Agent 扩展与进入测验的用户流程。

## 执行信息
- 波次：Wave 2
- 可并行：`HomeAuthFlow`、`VideoLearningFlow`、`KnowledgeLearningFlow`
- 依赖：Wave 1 IA 文档
- 建议角色：交互设计 / UX
- 优先模板：`00 设计流程/templates/node_prompts/02核心用户流/*`

## 必须覆盖
- `/classroom/input` 主题输入与提交
- `/classroom/:id/generating` 等待与恢复
- `/classroom/:id` 结果浏览、幻灯片切换、白板阅读
- 多 Agent 讨论片段的挂载位置
- 进入课后小测与返回课堂

## 输出物
- 新增：`01 文档/03-核心用户流/UF2-课堂学习主流程.md`

## 完成标准
- 把当前缺失规格的课堂输入 / 结果页流程补清楚
- 覆盖生成失败、断线恢复、局部数据缺失
- 明确哪些是 P0，哪些是增强槽位
