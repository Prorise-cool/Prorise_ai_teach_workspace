# XIAOMAI_PL3_TASK_StateAndDataHostMatrix_Draft_v1.0_20260327_CODEX

## 任务定位
产出页面状态矩阵与数据宿主矩阵，给等待态、结果页、个人域和开发标注任务做统一输入。

## 执行信息
- 波次：Wave 3
- 可并行：`PageInventory`
- 依赖：Wave 2 流程文档
- 建议角色：服务设计 / 交互设计
- 优先模板：`00 设计流程/templates/node_prompts/03页面清单/*`

## 必须覆盖
- 页面级状态：加载、空、错、禁用、未登录、无权限
- 任务级状态：`pending / processing / completed / failed / cancelled`
- SSE 事件与页面呈现映射
- FastAPI / RuoYi / Redis / COS 数据宿主
- 401 / 403 / 超时 / Provider 切换 / snapshot 恢复

## 输出物
- 新增：`01 文档/05-页面清单/PL3-页面状态与数据宿主矩阵.md`

## 完成标准
- 同一状态命名不冲突
- 页面知道该去哪一个后端取数
- 等待态与长期历史态被清晰区分
