### Story 1.5: 用户配置系统（个人简介与学习偏好）
**Story Type:** `Frontend Story`
As a 准备发起学习会话的用户，
I want 在首次使用时设置我的渐进式三页引导，
So that 系统可以根据我的特点自动分配或生成合适的 AI 老师和同学。

**OpenMAIC 参考模型：**

```typescript
// 用户输入自己的特点（OpenMAIC 实际实现）
interface UserRequirements {
  requirement: string;        // 主题/需求
  userNickname?: string;      // 昵称
  userBio?: string;           // ⭐ 个人简介
  language: 'zh-CN' | 'en-US';
  webSearch?: boolean;        // 是否启用联网搜索
}

// 系统根据用户配置智能分配 agents
interface AgentConfig {
  id: string;
  name: string;
  role: string;              // teacher / student / assistant
  persona: string;           // 根据用户配置生成
  allowedActions: string[];  // 自动分配权限
}
```

**Acceptance Criteria:**

**Given** 用户首次使用或进入个人配置页面
**When** 用户完成配置表单
**Then** 系统保存用户的昵称、个人简介和语言选择
**And** 配置可在后续任务创建时自动透传

**Given** 用户输入个人简介
**When** 系统保存配置
**Then** 个人简介作为用户背景信息，供后端生成 Agent persona 时参考
**And** 个人简介长度限制在 10-500 字符

**Given** 用户选择语言
**When** 系统保存配置
**Then** 语言选择默认为 'zh-CN'，可选 'en-US'

**Given** 用户创建视频或课堂任务
**When** 任务创建请求发出
**Then** 用户配置作为 `userProfile` 或 `userRequirements` 字段稳定透传
**And** 后端根据配置动态生成或匹配合适的 AI agents

**Given** 用户在 mock 模式下开发
**When** 配置功能被测试
**Then** 配置可保存到 localStorage
**And** 真实模式下配置通过 API 保存到用户 profile

**Deliverables:**
- 用户配置页面（`/profile/setup` 或首次引导流程）
- 配置表单：昵称、个人简介、语言
- 本地存储降级逻辑
- Profile API 适配层
- 配置透传到任务创建请求

**与原描述的区别：**

| 原描述（错误） | 新描述（正确） |
|-------------|-------------|
| 简单下拉选择"4种老师风格" | 用户输入渐进式三页引导 |
| 用户被动选择预设 | 用户主动描述自己 |
| 固定 4 种风格 | 系统动态生成/匹配 |
| 风格选择器组件 | 完整用户配置系统 |
