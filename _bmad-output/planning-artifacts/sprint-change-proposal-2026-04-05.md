# Sprint 变更提案：Story 1.7 收口为落地页线索表单联动

**日期:** 2026-04-05  
**提案人:** Bob / Correct Course Workflow  
**变更范围:** Moderate  
**影响 Epic:** Epic 1: 用户接入、统一入口与启动配置

---

## 一、问题摘要

### 触发 Story

- Story 1.7：`营销落地页与 home 首页分流`

### 核心问题

当前 Story 1.7 的实施文档把重点放在“营销文案修正”“智能匹配演示模块”“CTA 展示扩展”上，但 2026-04-05 的实际代码和任务现状表明：

1. `/landing` 页面结构、`/` 默认首页、路由分流、导航和基础 CTA 已由 Story 1.4 实际交付。
2. 当前真正阻塞业务价值的缺口，是落地页联系表单仍然使用 `mailto:`，没有任何真实后端提交与 RuoYi 持久化。
3. `xm_dev.sql` 中不存在可直接承接匿名营销线索的现成 `xm_*` 业务表。

### 问题归类

- 类型：`Misunderstanding of original implementation priority`
- 本质：Story 1.7 的“剩余工作”被错误定义，导致团队可能继续在视觉模块上投入，而不是补齐真实线索闭环。

### 支撑证据

- `packages/student-web/src/features/home/landing-page.tsx`
  - 当前仍通过 `window.location.assign(buildMailToLink(...))` 提交。
- `packages/student-web/src/features/home/schemas/landing-contact-form-schema.ts`
  - 当前表单字段已冻结为 `firstName`、`lastName`、`email`、`subject`、`message`。
- `_bmad-output/implementation-artifacts/1-4-首页课堂直达入口与顶栏导航分发.md`
  - 明确记录 `/landing`、`/`、导航和回跳已完成，Story 1.4 状态为 `review`。
- `packages/RuoYi-Vue-Plus-5.X/script/sql/xm_dev.sql`
  - 现有 `xm_*` 表包括 `xm_user_profile`、`xm_video_task`、`xm_classroom_session`、`xm_user_work` 等。
  - 不存在营销线索表。
  - `xm_user_profile` 要求 `user_id NOT NULL` 且 `UNIQUE`，不适合作为匿名访客线索池。

---

## 二、影响分析

### Epic Impact

- Epic 1 目标不变。
- Story 1.7 的业务价值不变，仍属于 `/landing` 与 `/` 分流后的营销转化承接。
- 需要修正的是 Story 1.7 的**执行焦点**，不是 Epic 1 的总体边界。

### Story Impact

| Story | 当前状态 | 影响 |
|------|---------|------|
| 1.4 | `review` | 已完成分流与落地页主体实现，不应被重新打开做视觉返工 |
| 1.5 | `in-progress` | 提供了 `RuoYi 表 + App Controller + student-web adapter` 的复用模式 |
| 1.6 | `in-progress` | 与当前纠偏无直接阻塞关系，可继续并行 |
| 1.7 | `ready-for-dev` | 需要改写为“RuoYi 线索表 + 公共提交 API + 前端联动” |

### PRD / UX / Architecture 影响

- PRD：无核心目标冲突。`FR-UI-R01` 与 `FR-UI-009` 仍成立。
- UX：页面结构不需重做，只需把联系表单从静态降级升级为真实提交闭环。
- Architecture：新增 RuoYi 业务表与匿名公共提交接口；不需要引入 FastAPI 中转。

### Secondary Artifact Impact

- `_bmad-output/implementation-artifacts/1-7-营销落地页与-home-首页分流.md`
  - 需重写为真实可开发 Story。
- `_bmad-output/implementation-artifacts/index.md`
  - 需同步更新 Story 1.7 说明，避免继续误导成“演示模块”优先。
- 若后续实施：
  - 需新增 SQL migration、RuoYi 后台 CRUD、student-web API adapter、测试与验收文档。

---

## 三、推荐方案

### 结论

选择 **Option 1: Direct Adjustment**。

### 理由

1. 已完成的首页 / 落地页 / 路由分流成果不需要回滚。
2. Story 1.7 尚未实装后端逻辑，直接改写实施文档即可。
3. 该变更不触发 PRD 缩 scope，也不需要新增 Epic。
4. 业务收益直接且明确：提交信息真正入库，可被运营和销售跟进。

### Effort / Risk

- Effort：`Medium`
- Risk：`Low-Medium`

### 不推荐方案

- Rollback：无收益，且会破坏 Story 1.4 已完成成果。
- PRD MVP 缩减：没有必要。表单入库本身就是当前 MVP 的真实转化闭环。

---

## 四、详细变更提案

### 变更 1：Story 1.7 聚焦“线索表单真实联动”

**旧方向：**

- 营销文案修正
- 智能匹配演示模块
- 静态合作 CTA 降级说明

**新方向：**

- 保留现有 `/landing` 页面结构和 `/` 分流成果
- 新增 `xm_landing_lead` 业务表
- 新增匿名公共提交接口
- 前端表单改为真实 API 提交
- 后台最小查询 / 导出闭环

### 变更 2：明确不复用现有表

**决策：**

- 不复用 `xm_user_profile`
- 不复用 `sys_user`
- 不复用 `xm_user_work`

**原因：**

- 业务语义不符
- `user_id` 约束不支持匿名线索
- 会污染已登录学习域数据模型

### 变更 3：新增最小表结构方案

建议新增：

```sql
xm_landing_lead
```

最小字段：

- `contact_name`
- `organization_name`
- `contact_email`
- `subject`
- `message`
- `source_page`
- `source_locale`
- `processing_status`
- 审计字段

### 变更 4：新增匿名提交接口

建议新增：

```http
POST /api/public/landing-leads
```

请求体：

```json
{
  "contactName": "小林",
  "organizationName": "计算机学院",
  "contactEmail": "demo@example.com",
  "subject": "教师试点合作",
  "message": "希望了解试点方案",
  "sourcePage": "/landing",
  "sourceLocale": "zh-CN"
}
```

---

## 五、实施交接

### Scope Classification

- `Moderate`

### Handoff

- Scrum Master / PO
  - 接受 Story 1.7 的新优先级定义：从“营销展示扩展”转为“线索表单入库闭环”。
- Development Team
  - 按改写后的 Story 1.7 执行 SQL、RuoYi、student-web 联调实现。
- QA
  - 重点验证匿名提交、失败保留输入、后台可见与筛选导出。

### Success Criteria

- 落地页表单不再走 `mailto:`
- RuoYi 存在真实线索表记录
- 后台可查询与导出
- `/landing` 与 `/` 分流行为不回退

---

## 六、当前执行建议

### 建议顺序

1. 先按本提案冻结 Story 1.7 文档。
2. 由开发直接落 SQL + RuoYi 公共提交接口。
3. 再接 student-web 表单提交与成功 / 失败反馈。
4. 最后补后台列表、导出与运行态验收。

### 优先级建议

- Story 1.7 当前建议提升为 Epic 1 的高优先事项。
- Story 1.6 可继续并行，但不应阻塞 Story 1.7。

---

**提案状态:** 已回写文档，待实施  
**下一步:** 进入开发执行
