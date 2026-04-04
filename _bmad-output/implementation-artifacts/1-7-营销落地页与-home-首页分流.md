# Story 1.7: 营销落地页与 home 首页分流

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 营销访客或试点线索，
I want 通过独立营销落地页了解小麦价值并进入默认产品首页，
so that 产品获客与实际使用入口可以同时清晰成立而不互相污染。

## Acceptance Criteria

1. `/landing` 作为独立营销页可单独访问，页面至少包含品牌价值、课堂主入口与其他学习能力概览、**智能 AI 师生匹配**亮点与试点 / 合作 CTA。
2. 默认直接访问产品时仍进入 `/`，`/landing` 只在投放、宣传、试点招募等营销场景出现，不替代默认首页。
3. 访客从营销页点击主要体验 CTA 时，可进入 `/` 或 `/login` 并保留后续目标意图。
4. 教师 / 院校 / 试点类模块以咨询、预约、申请等营销转化动作承接，不要求当前学生端已经存在独立 ToB 工作台或自助开通流程。

## Tasks / Subtasks

- [ ] 固定 `/landing` 与 `/` 的路由分工（AC: 1, 2, 3）
  - [ ] 明确 `/` 为默认产品首页，`/landing` 为营销落地页。
  - [ ] 补齐从营销页进入产品首页或登录页的 CTA 跳转规则。
  - [ ] 约束未登录与已登录两种情况下的跳转恢复语义。
- [ ] 设计营销页信息架构（AC: 1, 4）
  - [ ] 保留品牌价值、课堂主入口与其他学习能力总览、**智能师生匹配系统**、试点方案、FAQ、联系 CTA 等营销模块。
  - [ ] 明确哪些内容属于营销包装，哪些内容属于当前已上线产品主链。
  - [ ] 避免把营销页长文案回灌到 `/` 默认首页。
  - [ ] **删除任何关于"4种老师风格"或"风格选择"的营销描述**。
  - [ ] **替换为"根据你的个人特点智能分配合适的 AI 老师和同学"**。
- [ ] 处理营销 CTA 的降级与状态说明（AC: 3, 4）
  - [ ] 主要体验 CTA 指向 `/` 或 `/login`。
  - [ ] 合作 / 试点 CTA 以静态表单、咨询动作或预约说明承接。
  - [ ] 缺少真实线索系统时提供静态降级说明，而不是伪造已开通后台能力。
- [ ] 增加营销页分流测试（AC: 1, 2, 3, 4）
  - [ ] 覆盖 `/` 与 `/landing` 的默认访问分工。
  - [ ] 覆盖主要体验 CTA、合作 CTA 和未登录回跳场景。
  - [ ] 覆盖营销文案与默认首页职责边界不串位。

## Dev Notes

### Business Context

- `landingPage` 已被产品决策接受为独立营销页，不再视为"伪业务"。
- 默认产品首页仍然是 `/`，其职责改为"课堂直达 + 顶栏导航分发"，不再承接双入口卡片选择。
- 营销页承担获客、赛事展示、试点招募与合作转化，不承担学习任务创建与学习状态恢复主流程。
- **核心卖点修正**：营销页应突出"智能师生匹配"而非"多种风格选择"，系统的价值在于根据用户特点动态生成适配的 AI agents。

### Technical Guardrails

- `/landing` 与 `/` 必须是两个独立路由语义，不能只靠同页条件分支硬切。
- 营销页的 CTA 只负责导流到 `/`、`/login` 或合作咨询承接，不新增学生端业务路由。
- 营销页允许使用静态营销文案；如线索系统尚未接入，需明确静态降级路径。
- 保持小麦统一品牌风格，但营销页与默认首页的信息密度可以不同。
- **营销文案约束**：禁止使用"4种风格"、"风格选择"、"严谨教授/风趣老师/温和导师/干练讲师"等旧概念描述。

### Suggested File Targets

- `packages/student-web/src/features/landing/landing-page.tsx`
- `packages/student-web/src/features/landing/sections/*`
- `packages/student-web/src/app/routes/index.tsx`
- `packages/student-web/src/test/features/landing/landing-page.test.tsx`

### Project Structure Notes

- Story 1.4 继续承接默认首页 `/`，不要把营销文案倒灌回首页主入口。
- 当前 `student-web` 真实路由入口是 `packages/student-web/src/app/routes/index.tsx`，新增 `/landing` 时应沿用这套路由注册方式。
- 当前设计资产中 `docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/01-首页与入口/01-landingPage.html` 可作为营销页视觉参考，但**需要删除任何"4种风格"相关内容**。
- `02-home.html` 与 `01-首页与入口 home.html` 可作为默认首页视觉探索稿，但事实口径仍以 BMAD 文档为准。

### Testing Requirements

- 覆盖 `/landing` 独立访问与 `/` 默认访问。
- 覆盖营销页主要体验 CTA 指向 `/` 或 `/login`。
- 覆盖合作 / 试点 CTA 的静态承接或降级提示。
- 覆盖营销页与默认首页信息架构不串位。
- **验证营销页没有"风格选择器"或"4种老师"相关内容**。

### References

- `_bmad-output/planning-artifacts/epics/14-epic-1.md`：Story 1.7 AC。
- `_bmad-output/planning-artifacts/prd/04-4-用户与核心场景.md`：营销访客与获客场景。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-UI-R01`、`FR-UI-009`、`FR-CS-002`（用户配置系统）。
- `_bmad-output/planning-artifacts/ux-design-specification/08-7-page-level-design-specifications页面级设计规范.md`：`/landing` 与 `/` 页面边界。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：前端页面映射。
- `_bmad-output/planning-artifacts/epic-1-correction-summary-2026-04-03.md`：Epic 1 修正总结，明确新旧概念区别。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已将营销落地页的业务定位、路由分流与 CTA 承接规则固定为开发执行文档。
- **已修正营销文案**：删除"4种老师风格"概念，替换为"智能师生匹配系统"。
- 营销页的核心价值是展示"我们会根据你的个人特点智能分配合适的 AI 老师和同学"，而非提供预设风格选择。

### File List

- `_bmad-output/implementation-artifacts/1-7-营销落地页与-home-首页分流.md`
