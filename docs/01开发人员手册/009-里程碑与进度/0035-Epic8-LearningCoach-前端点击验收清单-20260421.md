# Epic 8 Learning Coach 前端点击验收清单（Checkpoint / Quiz / 学习路径）

> 事实源以 [`../../../_bmad-output/planning-artifacts/epics/25-epic-8.md`](../../../_bmad-output/planning-artifacts/epics/25-epic-8.md) 为准。本文只给前端点击验收口径。

## 本次验收要确认什么

1. `/coach/:sessionId` 会话后入口页可用，页面结构与设计稿一致，且能进入 Checkpoint / Quiz。
2. `/checkpoint/:sessionId` 可作答、提交、出结果，并支持刷新恢复（sessionStorage snapshot）。
3. `/quiz/:sessionId` 可作答、提交、判分与解析，并支持刷新恢复（sessionStorage snapshot）。
4. `/path` 能生成学习路径、保存结果，并支持刷新后再次打开（localStorage plan cache）。
5. 学后流程返回链路不依赖 `/learning`（无 returnTo 时回到 `/video/input`）。

## 设计稿参考（不得自行改布局/视觉）

- `Ux/.../10-Checkpoint 与 Quiz 页/01-entry.html`
- `Ux/.../10-Checkpoint 与 Quiz 页/02-checkpoint.html`
- `Ux/.../10-Checkpoint 与 Quiz 页/03-quiz.html`
- `Ux/.../11-学习路径页/01-path.html`

## 前置条件

1. student-web 以 mock 模式启动（`VITE_APP_USE_MOCK=Y`），避免依赖真实后端。
2. 使用 mock 账号登录：`student_demo` / `Passw0rd!`。

## 点击验收清单

### A. Learning Coach 入口页（/coach）

1. 打开（或在地址栏输入）：
   - `/coach/epic8_demo?sourceType=video&sourceSessionId=epic8_demo&returnTo=/video/input&topicHint=微积分求导`
2. 确认页面存在“先热身 2 题”“进入正式 Quiz”两个 CTA，并且右侧/抽屉存在 Learning Coach 侧栏。
3. 点击“陪练助手”按钮（或移动端抽屉开关），确认侧栏可开/关且不遮挡主 CTA。

### B. Checkpoint（/checkpoint）

1. 在入口页点击“先热身 2 题”，确认进入 `/checkpoint/epic8_demo`。
2. 选择任意选项后，刷新页面（浏览器刷新）。
3. 确认当前题号与已选答案仍被保留（刷新恢复）。
4. 完成全部题目后点击“提交热身”，确认出现结果摘要与逐题对错/解析。
5. 点击结果卡里的“返回”，确认回到 `/video/input`。

### C. Quiz（/quiz）

1. 再次打开入口页 `/coach/epic8_demo?...`，点击“进入正式 Quiz”，确认进入 `/quiz/epic8_demo`。
2. 选择任意选项后刷新页面，确认仍保留当前题号与已选答案（刷新恢复）。
3. 点击“提交答卷”，确认出现得分摘要与逐题解析。
4. 点击结果卡里的“返回”，确认回到 `/video/input`。

### D. 学习路径（/path）

1. 打开（或在地址栏输入）：
   - `/path?sourceType=video&sourceSessionId=epic8_demo&topicHint=微积分求导&goal=微积分求导进阶&cycleDays=3`
2. 确认先进入“生成态”，随后自动切换为“结果态”展示阶段（stage）与步骤（step）列表。
3. 刷新页面，确认仍保持“结果态”并展示相同的 path 内容（再次打开态）。
4. 点击“调整目标设定”，按提示输入新目标与周期，确认页面重新进入生成态并产出新的路径内容。

## 预期结果

- Epic 8 的 Learning Coach 入口、Checkpoint、Quiz、学习路径四类页面均可单独访问并完成核心交互。
- 刷新不会丢失 Checkpoint / Quiz 的作答进度；学习路径可通过缓存再次打开。
- 返回链路不会依赖学习中心聚合页（缺省回到 `/video/input`）。

