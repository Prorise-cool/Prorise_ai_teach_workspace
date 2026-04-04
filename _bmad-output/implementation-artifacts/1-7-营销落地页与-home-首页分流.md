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

### 阶段 1：路由分流与导航逻辑（AC: 1, 2, 3）

- [x] 固定 `/landing` 与 `/` 的路由分工
  - [x] 明确 `/` 为默认产品首页，`/landing` 为营销落地页。
  - [x] 路由已在 `packages/student-web/src/app/routes/index.tsx` 中配置。
  - [ ] 补齐从营销页进入产品首页或登录页的 CTA 跳转规则。
  - [ ] 约束未登录与已登录两种情况下的跳转恢复语义。

### 阶段 2：营销页信息架构与文案修正（AC: 1, 4）

- [ ] 修正营销页核心卖点文案
  - [ ] **删除任何关于"4种老师风格"或"风格选择"的营销描述**。
  - [ ] **替换为"根据你的个人特点智能分配合适的 AI 老师和同学"**。
  - [ ] 强调系统会分析用户的个人简介、性格偏好，动态生成适配的 AI agents。

- [ ] 设计营销页信息架构
  - [ ] 保留品牌价值、课堂主入口与其他学习能力总览、**智能师生匹配系统**、试点方案、FAQ、联系 CTA 等营销模块。
  - [ ] 明确哪些内容属于营销包装，哪些内容属于当前已上线产品主链。
  - [ ] 避免把营销页长文案回灌到 `/` 默认首页。

### 阶段 3：落地页实际功能落地（AC: 3, 4）

- [ ] 实现主要体验 CTA 功能
  - [ ] 点击"立即体验"按钮引导未登录用户到 `/login`。
  - [ ] 登录成功后，引导用户完成 Story 1.5 的用户配置流程。
  - [ ] 已登录用户点击后直接进入 `/classroom/input`。

- [ ] 实现"智能师生匹配"演示模块
  - [ ] 添加交互式演示区域，展示用户配置如何影响 AI agent 匹配。
  - [ ] 展示 5 种性格类型和 12 种导师标签的预览。
  - [ ] 用简单动画或卡片展示"配置 → 匹配"的过程。

- [ ] 处理合作 / 试点 CTA
  - [ ] 以静态表单或咨询动作承接。
  - [ ] 缺少真实线索系统时提供静态降级说明。

### 阶段 4：测试与验收（AC: 1, 2, 3, 4）

- [ ] 覆盖 `/` 与 `/landing` 的默认访问分工。
- [ ] 覆盖主要体验 CTA、合作 CTA 和未登录回跳场景。
- [ ] 覆盖营销文案与默认首页职责边界不串位。
- [ ] **验证营销页没有"风格选择器"或"4种老师"相关内容**。

## Dev Notes

### Business Context

- `landingPage` 已被产品决策接受为独立营销页，不再视为"伪业务"。
- 默认产品首页仍然是 `/`，其职责改为"课堂直达 + 顶栏导航分发"，不再承接双入口卡片选择。
- 营销页承担获客、赛事展示、试点招募与合作转化，不承担学习任务创建与学习状态恢复主流程。
- **核心卖点修正**：营销页应突出"智能师生匹配"而非"多种风格选择"，系统的价值在于根据用户特点动态生成适配的 AI agents。
- **落地页功能落地**：当前落地页为"白版"（仅展示无功能），需要添加：
  1. 主要体验 CTA → 引导到登录 → 完成用户配置（Story 1.5）→ 进入产品
  2. "智能师生匹配"演示模块 → 预览配置如何影响匹配结果
  3. 合作/试点 CTA → 静态表单或联系方式

### 与 Story 1.5 的连接

营销落地页的主要功能流程应与 Story 1.5 的用户配置系统紧密衔接：

```
营销落地页 (/landing)
    ↓ 点击"立即体验"
登录页 (/login)
    ↓ 登录成功
个人信息简介页（头像、简介）
    ↓ 未填写简介？
信息收集页（性格类型 + 导师偏好） ← Story 1.5 核心功能
    ↓
导览页（3步产品介绍）
    ↓
进入首页 (/)
```

**OpenMAIC 对齐说明**：

根据 OpenMAIC 设计，用户配置在任务创建时作为 `UserRequirements` 传递：

```typescript
// OpenMAIC UserRequirements
interface UserRequirements {
  requirement: string;        // 主题/需求
  language: 'zh-CN' | 'en-US';
  userNickname?: string;      // 昵称
  userBio?: string;           // ⭐ 个人简介（对应我们的 bio）
  webSearch?: boolean;
}

// 我们扩展的字段（用于更精细匹配）
interface ExtendedUserProfile {
  avatarUrl?: string;         // 头像
  personalityType?: string;    // 性格类型（5选1）
  teacherTags?: string[];      // AI导师偏好（12标签多选）
}
```

**关键区别**：
- ❌ 旧概念：用户从"4种预设老师风格"中选择
- ✅ 新概念：用户填写个人简介、性格类型、导师偏好，系统**智能生成或匹配**合适的 AI agents

### Technical Guardrails

- `/landing` 与 `/` 必须是两个独立路由语义，不能只靠同页条件分支硬切。
- 营销页的 CTA 只负责导流到 `/`、`/login` 或合作咨询承接，不新增学生端业务路由。
- 营销页允许使用静态营销文案；如线索系统尚未接入，需明确静态降级路径。
- 保持小麦统一品牌风格，但营销页与默认首页的信息密度可以不同。
- **营销文案约束**：禁止使用"4种风格"、"风格选择"、"严谨教授/风趣老师/温和导师/干练讲师"等旧概念描述。
- **与 OpenMAIC 对齐**：
  - 用户配置字段名称与 OpenMAIC 的 `UserRequirements` 保持一致
  - 基础字段：`userNickname`、`userBio` 对应我们的昵称、个人简介
  - 扩展字段：`personalityType`、`teacherTags` 用于更精细的 AI agent 匹配
- **配置透传约束**：用户配置必须在任务创建时透传到后端，不得丢失或降级

### 与 OpenMAIC 的契约对接

**前端用户配置 → 后端 API → OpenMAIC** 数据流：

```typescript
// 1. 前端用户配置（Story 1.5 收集）
interface UserProfile {
  userId: number;
  avatarUrl?: string;
  bio?: string;              // → UserRequirements.userBio
  nickname?: string;         // → UserRequirements.userNickname
  personalityType?: string;  // 扩展字段，用于 agent 匹配
  teacherTags?: string[];    // 扩展字段，用于 agent 匹配
  language: 'zh-CN' | 'en-US';
}

// 2. 任务创建请求（扩展 UserRequirements）
interface CreateClassroomTaskRequest {
  requirement: string;
  language: 'zh-CN' | 'en-US';
  webSearch?: boolean;
  userProfile: UserProfile;  // ⭐ 用户配置透传
}

// 3. OpenMAIC 接收
interface UserRequirements {
  requirement: string;
  language: 'zh-CN' | 'en-US';
  userNickname?: string;
  userBio?: string;
  webSearch?: boolean;
}
```

### Suggested File Targets

- `packages/student-web/src/features/landing/landing-page.tsx` - 营销落地页主组件
- `packages/student-web/src/features/landing/sections/smart-matching-demo.tsx` - 智能匹配演示模块（新增）
- `packages/student-web/src/features/landing/sections/hero-cta.tsx` - Hero 区域 CTA 组件
- `packages/student-web/src/features/profile/` - 用户配置相关（与 Story 1.5 共享）
- `packages/student-web/src/features/profile/components/ProfileIntroPage.tsx` - 个人信息简介页
- `packages/student-web/src/features/profile/components/InfoCollectionPage.tsx` - 信息收集页（性格+导师偏好）
- `packages/student-web/src/features/profile/components/TourPage.tsx` - 导览页
- `packages/student-web/src/app/routes/index.tsx` - 路由配置
- `packages/student-web/src/test/features/landing/landing-page.test.tsx`

### Project Structure Notes

- Story 1.4 继续承接默认首页 `/`，不要把营销文案倒灌回首页主入口。
- 当前 `student-web` 真实路由入口是 `packages/student-web/src/app/routes/index.tsx`，新增 `/landing` 时应沿用这套路由注册方式。
- 当前设计资产中 `docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/01-首页与入口/01-landingPage.html` 可作为营销页视觉参考，但**需要删除任何"4种风格"相关内容**。
- `02-home.html` 与 `01-首页与入口 home.html` 可作为默认首页视觉探索稿，但事实口径仍以 BMAD 文档为准。
- **与 Story 1.5 的连接**：
  - 营销页的主要体验 CTA 应引导用户完成登录后的用户配置流程
  - 用户配置相关组件由 Story 1.5 负责实现，落地页作为入口点
  - `features/profile/` 目录包含用户配置的所有页面组件，与 OpenMAIC 的 `UserRequirements` 对齐
- **当前落地页状态**：
  - `landing-page.tsx` 已有完整页面结构和样式（包括 Hero、Benefits、Features、Testimonials、Pricing、FAQ、Contact、Footer）
  - 但营销文案仍需修正为"智能师生匹配"概念
  - 缺少"智能师生匹配"演示模块
  - CTA 跳转逻辑需要连接到登录和用户配置流程

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
- `_bmad-output/implementation-artifacts/1-5-用户配置系统（个人简介与学习偏好）.md`：用户配置系统详细设计（Story 1.5）
- `references/OpenMAIC/lib/types/generation.ts`：OpenMAIC UserRequirements 类型定义
- `references/OpenMAIC/lib/orchestration/registry/types.ts`：OpenMAIC AgentConfig 类型定义
- `references/OpenMAIC/lib/store/user-profile.ts`：OpenMAIC 用户配置 Store 实现
- `references/OpenMAIC/app/page.tsx`：OpenMAIC 用户配置使用示例

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已将营销落地页的业务定位、路由分流与 CTA 承接规则固定为开发执行文档。
- **已修正营销文案**：删除"4种老师风格"概念，替换为"智能师生匹配系统"。
- 营销页的核心价值是展示"我们会根据你的个人特点智能分配合适的 AI 老师和同学"，而非提供预设风格选择。
- **已补充与 Story 1.5 和 OpenMAIC 的连接说明**：
  - 明确用户配置数据流：前端收集 → 后端 API → OpenMAIC
  - 定义 `UserProfile` 与 `UserRequirements` 的字段映射关系
  - 添加配置透传约束，确保用户配置在任务创建时正确传递
- **已定义落地页实际功能落地方向**：
  - 主要体验 CTA → 登录 → 用户配置流程（Story 1.5）
  - 智能匹配演示模块（新增）
  - 合作/试点 CTA 静态承接
- **当前落地页状态**：页面结构完整，但营销文案需修正，缺少功能连接

### File List

- `_bmad-output/implementation-artifacts/1-7-营销落地页与-home-首页分流.md`
