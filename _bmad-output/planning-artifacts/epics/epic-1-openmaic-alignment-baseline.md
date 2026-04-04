# Epic 1 与 OpenMAIC 对齐基线

**创建日期**: 2026-04-04
**状态**: 已冻结
**适用范围**: Epic 1 所有 Story

## 概述

本文档定义 Epic 1（用户接入、统一入口与启动配置）与 OpenMAIC 智能师生匹配系统的对齐基线。

**核心原则**：用户填写个人简介、性格偏好和导师偏好，系统根据这些配置**智能生成或匹配**合适的 AI agents，而非从预设风格中选择。

---

## 核心概念修正

### ❌ 旧概念（错误）

- 用户从"4种预设老师风格"中选择：
  - 严谨教授
  - 风趣老师
  - 温和导师
  - 干练讲师

### ✅ 新概念（正确）

- 用户填写自己的特点：
  - 个人简介（自由文本）
  - 性格类型（5选1）
  - AI 导师偏好（12 标签多选）
- 系统根据配置**动态生成**或**智能匹配** AI agents

---

## OpenMAIC 对齐设计

### 1. 用户配置字段映射

| 我们的设计 (Story 1.5) | OpenMAIC UserRequirements | 说明 |
|----------------------|------------------------|------|
| `bio` (个人简介) | `userBio` | 用户背景描述 |
| `nickname` (昵称) | `userNickname` | 用户昵称 |
| `language` (语言偏好) | `language` | 'zh-CN' / 'en-US' |
| `avatarUrl` (头像) | - | 扩展字段，用于展示 |
| `personalityType` (性格类型) | - | **扩展字段**，用于 agent 匹配 |
| `teacherTags` (导师偏好) | - | **扩展字段**，用于 agent 匹配 |

### 2. OpenMAIC UserRequirements 定义

```typescript
interface UserRequirements {
  requirement: string;        // 主题/需求
  language: 'zh-CN' | 'en-US';
  userNickname?: string;      // 昵称
  userBio?: string;           // ⭐ 个人简介
  webSearch?: boolean;
}
```

### 3. 我们的扩展字段（用于更精细匹配）

```typescript
interface ExtendedUserProfile {
  avatarUrl?: string;
  bio?: string;                    // → UserRequirements.userBio
  nickname?: string;               // → UserRequirements.userNickname
  personalityType?: string;        // 5选1枚举
  teacherTags?: string[];          // 12标签多选
  language: 'zh-CN' | 'en-US';
}
```

### 4. AgentConfig（OpenMAIC）

```typescript
interface AgentConfig {
  id: string;
  name: string;              // 显示名称
  role: string;             // teacher/student/assistant
  persona: string;          // 系统提示词（根据用户配置生成）
  avatar: string;
  color: string;
  allowedActions: string[];
  priority: number;
}
```

**关键点**：`persona` 字段是系统根据用户配置动态生成的，不是从预设选项中选择。

---

## 数据流设计

### 前端收集 → 后端存储 → OpenMAIC

```
┌─────────────────────────────────────────────────────────────────┐
│                      前端收集（Story 1.5）                    │
├─────────────────────────────────────────────────────────────────┤
│ 1. 个人信息简介页                                                   │
│    - 头像上传（可选）                                            │
│    - 个人简介输入（200字限制）                                   │
│    - 跳过按钮                                                    │
│                                                                   │
│ 2. 信息收集页（条件分支：未填写简介时进入）                     │
│    - Step 1: 性格类型选择（5选1）                               │
│    - Step 2: AI 导师偏好选择（12 标签多选）                    │
│    - 每步都提供跳过按钮                                        │
│                                                                   │
│ 3. 导览页                                                         │
│    - 3 步产品功能介绍                                          │
│    - 可完全跳过                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      后端存储（RuoYi）                         │
├─────────────────────────────────────────────────────────────────┤
│ 表: xm_user_profile                                              │
│ - user_id (关联 sys_user)                                      │
│ - avatar_url                                                    │
│ - bio                                                           │
│ - personality_type                                              │
│ - teacher_tags (JSON 数组字符串)                               │
│ - language                                                      │
│ - is_completed                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   任务创建时透传到后端                           │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/classroom/task                                       │
│ {                                                                │
│   requirement: string,                                        │
│   language: 'zh-CN',                                          │
│   webSearch?: boolean,                                        │
│   userProfile: UserProfile  // ⭐ 用户配置透传              │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      OpenMAIC 处理                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. 接收 UserRequirements                                       │
│    - userBio → 用于个性化生成                                  │
│    - language → 确定生成语言                                    │
│                                                                │
│ 2. 根据 userBio + personalityType + teacherTags                │
│    动态生成 AgentConfig.persona                              │
│                                                                │
│ 3. 生成/匹配合适的 AI agents（teacher、student、assistant）    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Epic 1 各 Story 与基线对齐

### Story 1.1: 统一认证契约

**对齐要求**：
- 会话 payload 必须包含用户基础信息（user_id、nickname、avatar）
- 为后续用户配置收集预留字段

### Story 1.2: 独立认证页

**对齐要求**：
- 登录/注册成功后，引导用户进入用户配置流程
- 支持"跳过"配置，但会影响 agent 匹配质量

### Story 1.3: 登出、401 处理

**对齐要求**：
- 用户配置应持久化存储（RuoYi 数据库 + localStorage 降级）
- 登出时不丢失用户配置

### Story 1.4: 首页课堂直达入口

**对齐要求**：
- 首页 CTA 直接进入 `/classroom/input`
- 任务创建时自动携带用户配置

### Story 1.5: 用户配置系统 ⭐

**对齐要求**：
- **核心 Story**：实现用户配置收集和存储
- 字段设计与 OpenMAIC 对齐
- 使用 RuoYi 代码生成器快速实现 CRUD

**实现路径**：
1. 创建 `xm_user_profile` 表（✅ 已完成）
2. 配置数据字典（✅ 已完成）
3. 使用 RuoYi 代码生成器生成 CRUD 代码
4. 手动添加 getCurrent() 和 isCompleted() 方法
5. 前端实现三页渐进式引导

### Story 1.6: 角色边界与权限

**对齐要求**：
- 学生端不暴露管理后台入口
- 权限不足返回 403，不得伪装成 401

### Story 1.7: 营销落地页 ⭐

**对齐要求**：
- **营销文案修正**：突出"智能师生匹配"概念
- **功能连接**：落地页 CTA → 登录 → 用户配置（Story 1.5）
- **演示模块**：展示配置如何影响 agent 匹配

---

## 技术约束与规范

### 1. 字段命名一致性

| 概念 | 数据库字段 | Java 字段 | TypeScript 字段 | OpenMAIC 字段 |
|------|-----------|-----------|----------------|---------------|
| 个人简介 | `bio` | `bio` | `bio` | `userBio` |
| 昵称 | - | - | `nickname` | `userNickname` |
| 语言偏好 | `language` | `language` | `language` | `language` |
| 性格类型 | `personality_type` | `personalityType` | `personalityType` | - |
| 导师偏好 | `teacher_tags` | `teacherTags` | `teacherTags` | - |

### 2. 配置透传规范

**前端 → 后端**：
```typescript
interface CreateTaskRequest {
  requirement: string;
  language: 'zh-CN' | 'en-US';
  webSearch?: boolean;
  userProfile: UserProfile;  // 必须
}
```

**后端 → OpenMAIC**：
```typescript
interface UserRequirements {
  requirement: string;
  language: 'zh-CN' | 'en-US';
  userNickname?: string;
  userBio?: string;
  webSearch?: boolean;
}
```

**转换逻辑**：
```java
UserRequirements toUserRequirements(UserProfile profile) {
    return UserRequirements.builder()
        .requirement(task.getRequirement())
        .language(profile.getLanguage())
        .userNickname(profile.getNickname())
        .userBio(profile.getBio())
        .build();
}
```

### 3. 降级策略

**Mock 模式**（开发/测试）：
- 使用 localStorage 存储用户配置
- 跳过数据库 CRUD

**真实模式**：
- 使用 RuoYi 数据库存储
- 通过 API 读写配置

---

## 验收标准

### 功能验收

1. ✅ 用户可以填写个人简介、性格类型、导师偏好
2. ✅ 用户配置正确保存到数据库
3. ✅ 任务创建时用户配置正确透传
4. ✅ 营销页展示"智能师生匹配"概念
5. ✅ 营销页 CTA 正确引导到登录/配置流程

### 文案验收

1. ✅ 营销页没有"4种老师风格"相关描述
2. ✅ 营销页强调"根据个人特点智能匹配"
3. ✅ 用户配置页面标题和说明清晰易懂

### 技术验收

1. ✅ 字段命名与 OpenMAIC 一致
2. ✅ 配置透传无数据丢失
3. ✅ Mock 模式与真实模式使用相同数据模型

---

## 文件清单

### 数据库
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260404_xm_user_profile.sql` ✅ 已创建

### 文档
- `_bmad-output/implementation-artifacts/1-5-用户配置系统（个人简介与学习偏好）.md`
- `_bmad-output/implementation-artifacts/1-7-营销落地页与-home-首页分流.md`
- `_bmad-output/planning-artifacts/epics/epic-1-openmaic-alignment-baseline.md`（本文档）

### 参考
- `references/OpenMAIC/lib/types/generation.ts`
- `references/OpenMAIC/lib/orchestration/registry/types.ts`
- `references/OpenMAIC/lib/store/user-profile.ts`
- `references/OpenMAIC/app/page.tsx`

---

## 后续工作优先级

### P0（必须完成）
1. 执行 SQL 创建数据库表和数据字典
2. 使用 R�式 Yi 代码生成器生成 CRUD 代码
3. 实现前端三页用户配置组件
4. 修正营销页文案，连接功能流程

### P1（重要）
1. 实现任务创建时的配置透传
2. 实现智能匹配演示模块
3. 完整流程联调测试

### P2（可选）
1. 优化 agent 匹配算法
2. 添加配置预览功能
3. 个性化推荐优化
