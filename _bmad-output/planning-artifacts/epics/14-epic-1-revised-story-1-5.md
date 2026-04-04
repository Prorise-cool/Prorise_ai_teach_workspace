# Story 1-5 修正版：用户配置系统（个人简介与学习偏好）

**Status:** ready-for-dev
**修正日期:** 2026-04-03
**修正原因:** 原描述与 OpenMAIC 参考模型不符，需要重构为用户配置系统

---

## Story（修正版）

As a 准备发起学习会话的用户，
I want 在首次使用时设置我的个人简介和学习偏好，
so that 系统可以根据我的特点自动分配或生成合适的 AI 老师和同学。

## OpenMAIC 参考模型

```typescript
// OpenMAIC 的 UserRequirements 结构（已验证）
interface UserRequirements {
  requirement: string;        // 用户输入的主题/需求
  userNickname?: string;      // 学生昵称（用于个性化）
  userBio?: string;           // 学生背景（用于个性化）⭐ 核心
  language: 'zh-CN' | 'en-US';
  webSearch?: boolean;        // 是否启用联网搜索
}

// OpenMAIC 的 Agent 分配逻辑
// 系统根据 userBio 动态生成/匹配 agents
interface AgentConfig {
  id: string;
  name: string;
  role: string;              // teacher / student / assistant
  persona: string;           // 根据用户配置生成的 AI 性格
  allowedActions: string[];  // 根据角色自动分配
}
```

## Acceptance Criteria（修正版）

1. **用户配置入口**
   - 用户可在 `/profile/setup` 或首次进入时访问配置页面
   - 配置包含：昵称、个人简介、语言选择
   - 配置完成后保存到用户 profile，后续会话自动应用

2. **个人简介输入**
   - 支持自由文本输入个人背景（年级、专业、兴趣等）
   - 输入长度限制在 200 字符以内
   - 提供引导提示和示例文本

4. **系统透传**
   - 用户配置作为 `UserRequirements` 的一部分透传给后端
   - 后端根据配置动态生成/匹配合适的 agents
   - 前端无需关心具体的 agent 分配逻辑

5. **本地降级**
   - Mock 模式下，配置保存到 localStorage
   - 真实模式下，配置通过 API 保存到用户 profile
   - 支持配置修改和重新保存

## Tasks / Subtasks

### 用户配置页面（AC: 1, 2）
- [ ] 创建 `/profile/setup` 路由和页面组件
- [ ] 设计配置表单：昵称、个人简介、语言
- [ ] 实现表单验证和提交逻辑
- [ ] 添加配置引导和示例文本

### 数据模型与存储（AC: 4, 5）
- [ ] 定义 `UserProfile` 类型：nickname, bio, language
- [ ] 实现 localStorage 降级存储
- [ ] 实现 API 适配层（真实模式）
- [ ] 实现 profile 读取和更新 hooks

### 系统透传（AC: 4）
- [ ] 修改任务创建请求，包含 `userProfile` 字段
- [ ] 确保视频/课堂任务创建时透传用户配置
- [ ] Mock 模式下返回预设的 agent 配置

### 测试覆盖（AC: 1-5）
- [ ] 覆盖配置表单的验证和提交
- [ ] 覆盖 localStorage 和 API 两种存储模式
- [ ] 覆盖任务创建时的配置透传
- [ ] 覆盖配置修改和重新保存

## Dev Notes

### Business Context

**修正前（错误）：**
- 简单的 4 种老师风格下拉选择
- 用户只是被动选择预设风格

**修正后（正确）：**
- 用户主动描述自己的背景和偏好
- 系统根据用户信息**智能匹配**或**动态生成**合适的 AI agents
- 参考自 OpenMAIC 的 `userBio` 模型

### Technical Guardrails

- 用户配置是**用户描述自己**，不是直接选择 AI 风格
- Agent 的具体分配由**后端负责**，前端只透传用户配置
- 支持配置修改，不应锁定用户初始选择
- Mock 模式和真实模式的数据结构保持一致

### Suggested File Targets

```
packages/student-web/src/features/
├── profile/
│   ├── profile-setup-page.tsx       # 配置页面
│   ├── components/
│   │   ├── bio-input.tsx            # 个人简介输入
│   │   └── language-selector.tsx    # 语言选择器
│   ├── schemas/
│   │   └── profile-setup-schema.ts  # 表单验证 schema
│   └── hooks/
│       ├── use-user-profile.ts      # 读取用户配置
│       └── use-save-profile.ts      # 保存用户配置
├── agent/
│   └── types/
│       └── user-profile.ts          # UserProfile 类型定义
└── services/
    └── api/
        └── adapters/
            └── profile-adapter.ts   # Profile API 适配层
```

### 与现有代码的兼容性

- 已完成的认证、首页、营销页**无需修改**
- Story 1-5 修正后，Story 1-6（角色边界）和 1-7（营销页）**保持不变**
- 后续 Epic 3（视频任务）和 Epic 5（课堂任务）创建时，需要透传用户配置

### References

- `references/OpenMAIC/lib/types/generation.ts` - UserRequirements 结构
- `references/OpenMAIC/lib/orchestration/registry/types.ts` - AgentConfig 结构
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md` - FR-CS-002（用户配置）

---

## 修正记录

| 日期 | 修正内容 | 修正原因 |
|------|---------|---------|
| 2026-04-03 | 完全重写 Story 1-5 | 原描述与 OpenMAIC 模型不符 |

---

**注意：** 这是修正后的 Story 1-5，原 `_bmad-output/implementation-artifacts/1-5-输入壳层中的老师风格最小选择配置.md` 文档已作废。
