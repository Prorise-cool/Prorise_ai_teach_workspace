## 13. User Profile Data Specification（用户配置数据规范）

> **架构对齐**：系统根据用户的个人简介动态生成适配的 AI agents，而非提供预设风格选项。
> **交互边界**：用户在首次使用时完成配置，配置页面独立于输入页；后续任务自动应用用户配置。
> **OpenMAIC 对齐**：与 OpenMAIC 的 `UserProfile` 模型对齐，包含 `nickname`、`bio`、`avatar` 字段。

### 13.1 UserProfile 数据结构

```typescript
interface UserProfile {
  nickname?: string;       // 昵称（可选，用于个性化）
  bio?: string;             // 个人简介（可选，用于适配生成内容）
  avatar?: string;          // 头像（可选）
  language: 'zh-CN' | 'en-US';  // 语言选择（默认 zh-CN）
  updatedAt: Date;         // 更新时间
}
```

### 13.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **nickname** | string | 否 | 用户昵称，用于 AI 生成个性化称呼 |
| **bio** | string | 否 | 个人简介，描述用户背景，用于 AI 适配内容难度和风格 |
| **avatar** | string | 否 | 用户头像，用于 UI 显示 |
| **language** | 'zh-CN' \| 'en-US' | 是 | 内容生成语言 |
| **updatedAt** | Date | 是 | 配置最后更新时间 |

### 13.3 用户配置表单设计规范

**可选字段**（用户可随时修改）：
- `nickname`（昵称）：文本输入，不超过 20 字符
- `bio`（个人简介）：文本输入，不超过 200 字符，提供引导提示

**默认字段**：
- `language`（语言）：单选，默认 `zh-CN`
- `avatar`（头像）：提供预设选项，支持上传

**表单验证规则**：
```typescript
// 昵称验证
const nicknameValidation = {
  maxLength: 20,
  required: false
}

// 个人简介验证
const bioValidation = {
  maxLength: 200,
  required: false
}
```

### 13.4 配置流程设计

**首次使用引导**：
1. 用户首次访问系统时检测配置状态
2. 未配置时引导进入配置页面（`/profile/setup`）
3. 完成配置后进入目标页面

**配置修改**：
- 用户可随时从个人中心重新进入配置页面
- 修改后的配置在新任务中生效

### 13.5 与 OpenMAIC 的对齐说明

**前端数据模型**（与 OpenMAIC 对齐）：
```typescript
// OpenMAIC UserRequirements
interface UserRequirements {
  requirement: string;          // 用户输入的主题/需求
  language: 'zh-CN' | 'en-US';  // 语言
  userNickname?: string;         // 学生昵称（来自 UserProfile.nickname）
  userBio?: string;              // 学生背景（来自 UserProfile.bio）
  webSearch?: boolean;           // 是否启用联网搜索
}

// 小麦 UserProfile（存储在全局 store）
interface UserProfile {
  nickname?: string;             // 对应 userNickname
  bio?: string;                  // 对应 userBio
  avatar?: string;               // UI 显示用
  language: 'zh-CN' | 'en-US';   // 默认语言
  updatedAt: Date;
}
```

**数据流向**：
1. 用户在首次使用时配置 `UserProfile`（存储在全局 store）
2. 创建任务时，前端从 store 读取配置并构建 `UserRequirements`
3. 后端根据 `userNickname` 和 `userBio` 动态生成适配的 agents

**OpenMAIC 的 Prompt 生成方式**（参考）：
```
## Student Profile

Student: {userNickname} — {userBio}

Consider this student's background when designing the course. 
Adapt difficulty, examples, and teaching approach accordingly.
```

### 13.6 设计约束

- ❌ 不允许前端提供预设风格选择器
- ❌ 不允许"4种老师风格"的固定选项
- ✅ 用户主动输入个人简介（bio）
- ✅ 系统根据配置动态生成适配的 agents
- ✅ Agent 差异通过生成内容体现，不允许页面级主题切换

***
