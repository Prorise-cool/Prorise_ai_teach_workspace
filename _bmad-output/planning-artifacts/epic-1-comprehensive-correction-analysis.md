# Epic 1 全面纠偏分析报告

**日期:** 2026-04-03
**调研范围:** Epic 1-5 及相关 PRD、Epic 文档
**严重程度:** Critical - 需要架构级修正

---

## 🔴 核心发现：PRD 本身也需要修正

### 问题层级

| 层级 | 问题 | 状态 |
|------|------|------|
| **PRD 层** | FR-CS-002 描述为"选择4种风格"而非"用户配置系统" | ❌ 错误 |
| **Epic 1 层** | Story 1-5 基于 FR-CS-002，同样错误 | ❌ 错误 |
| **Epic 3 层** | Story 3.1 契约中提到 `agentStyle` 字段 | ⚠️ 需调整 |
| **Epic 5 层** | Story 5.1/5.2 可能需要透传用户配置 | ⚠️ 需确认 |

---

## 📋 详细问题清单

### 1. PRD 层面：FR-CS-002 需要完全重写

**当前描述（错误）：**
```markdown
### FR-CS-002 Agent 风格选择

**描述**
用户可在预设老师风格中选择一种用于课堂或视频生成。

**业务规则**
* MVP 固定 4 种风格点缀色：严谨教授、风趣老师、温和导师、干练讲师
* 风格差异只作用于老师相关局部元素与生成语气
* 风格选择器以输入框附近的简单下拉框承载
```

**问题分析：**
1. ❌ 用户"被动选择"预设风格
2. ❌ 固定 4 种风格，缺乏灵活性
3. ❌ 没有用户个人简介输入
4. ❌ 没有学习风格偏好
5. ❌ 与 OpenMAIC 模型完全不符

**正确模型（OpenMAIC）：**
```typescript
// 用户主动描述自己
interface UserRequirements {
  requirement: string;        // 主题
  userNickname?: string;      // 昵称
  userBio?: string;           // ⭐ 个人简介（用户输入自己）
  learningStyles?: ('visual' | 'auditory' | 'kinesthetic' | 'reading')[];
  language: 'zh-CN' | 'en-US';
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

### 2. Epic 1 层面：Story 1-5 需要完全重写

**当前问题：**
- 基于 FR-CS-002 的错误描述
- 实现为"简单的下拉选择器"
- 缺少用户配置系统

**修正方向：**
- 参见 `14-epic-1-revised-story-1-5.md`
- 完整的用户配置系统（个人简介 + 学习偏好）

### 3. Epic 3 层面：契约字段需要调整

**问题位置：** `16-epic-3.md` Story 3.1

**当前描述（第84行）：**
> And 前端不需要猜测 `taskId`、`inputType`、`agentStyle`、`sourcePayload` 等字段含义

**问题分析：**
- `agentStyle` 字段名暗示"选择风格"
- 应该改为 `userProfile` 或 `userRequirements`
- 字段语义需要与 OpenMAIC 对齐

**修正建议：**
```typescript
// 当前（错误）
interface VideoTaskCreateRequest {
  agentStyle?: string;  // ❌ 暗示选择风格
}

// 修正后（正确）
interface VideoTaskCreateRequest {
  userProfile?: {
    nickname?: string;
    bio?: string;           // ⭐ 用户个人简介
    learningStyles?: string[];
    language: string;
  };
}
```

### 4. Epic 5 层面：课堂任务创建需要透传用户配置

**问题位置：** `18-epic-5.md` Story 5.1/5.2

**当前描述（第127行）：**
> And 老师风格与当前会话配置一起稳定透传

**问题分析：**
- "老师风格透传"是错误概念
- 应该是"用户配置透传"

**修正建议：**
- Story 5.1 契约中增加 `userProfile` 字段
- Story 5.2 明确用户配置透传逻辑

---

## 🎯 完整修正范围

### 需要修正的文档

| 文档 | 类型 | 修正内容 | 优先级 |
|------|------|---------|--------|
| `prd/06-6-功能需求.md` | PRD | 重写 FR-CS-002 | P0 |
| `epics/14-epic-1.md` | Epic | 修正 Objective 和 Story 1.5 | P0 |
| `epics/14-epic-1.md` | Epic | 修正 Dependencies 描述 | P1 |
| `epics/16-epic-3.md` | Epic | 修正 Story 3.1 契约字段 | P1 |
| `epics/18-epic-5.md` | Epic | 修正 Story 5.1/5.2 配置透传 | P1 |
| `_bmad-output/INDEX.md` | 索引 | 更新相关引用 | P1 |

### 无需修正的部分

| 内容 | 原因 |
|------|------|
| Story 1-1 到 1-4 | 与用户配置无关，已完成 |
| Story 1-6（角色边界） | 与用户配置独立，无需修改 |
| Story 1-7（营销页） | 与用户配置独立，无需修改 |
| Epic 2（任务框架） | 基础设施，与用户配置独立 |
| Epic 4（视频执行） | 与用户配置无关 |

---

## 📊 影响评估矩阵

```
                    修正成本    修正收益    优先级
PRD FR-CS-002        高         极高       P0
Epic 1 Story 1.5     高         极高       P0
Epic 1 Objective    中         极高       P0
Epic 3 Story 3.1    中         高        P1
Epic 5 Story 5.1/2  中         高        P1
索引文档更新        低         中        P1
```

---

## 🔄 OpenMAIC 正确流程

### 用户使用流程

```
1. 用户首次使用
   ↓
2. 进入用户配置页面
   - 输入昵称
   - 输入个人简介（年级、专业、兴趣等）
   - 选择学习风格（视觉型/听觉型/动手型/阅读型）
   - 选择语言
   ↓
3. 创建任务（视频/课堂）
   - 系统将 userProfile 透传给后端
   - 后端根据 userProfile 动态生成/匹配 agents
   ↓
4. AI 生成内容
   - 老师根据用户特点调整讲解方式
   - 同学角色根据用户特点互动
   ↓
5. 用户可以随时修改配置
```

### 关键区别

| 错误概念 | 正确概念 |
|---------|---------|
| 用户选择"4种老师风格" | 用户输入个人简介和学习偏好 |
| 固定预设风格 | 系统动态生成/匹配 |
| 简单下拉选择 | 完整配置表单 |
| 风格 = 老师风格 | 配置 = 用户特征 |

---

## ✅ 修正后的数据模型

### 前端类型定义

```typescript
// 用户配置类型
interface UserProfile {
  nickname?: string;
  bio?: string;                    // 个人简介
  learningStyles?: LearningStyle[];
  language: 'zh-CN' | 'en-US';
  updatedAt: Date;
}

type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading';

// 任务创建请求
interface VideoTaskCreateRequest {
  input: string | File;
  userProfile: UserProfile;       // ⭐ 用户配置
}

interface ClassroomTaskCreateRequest {
  topic: string;
  userProfile: UserProfile;       // ⭐ 用户配置
  enableWebSearch?: boolean;
}
```

### 后端契约（参考 OpenMAIC）

```python
class UserRequirements(BaseModel):
    requirement: str
    user_nickname: Optional[str] = None
    user_bio: Optional[str] = None      # ⭐ 个人简介
    learning_styles: Optional[List[str]] = None
    language: str = "zh-CN"
```

---

## 🚀 下一步行动计划

### 阶段 1：PRD 修正（P0）
1. 重写 FR-CS-002 完整描述
2. 更新相关验收标准
3. 增加 FR-UM-005（用户配置管理）

### 阶段 2：Epic 文档修正（P0）
1. 修正 Epic 1 Objective
2. 重写 Story 1-5
3. 更新索引文档

### 阶段 3：相关 Epic 调整（P1）
1. 修正 Epic 3 Story 3.1 契约
2. 修正 Epic 5 Story 5.1/5.2
3. 更新依赖关系描述

### 阶段 4：实施准备
1. 创建用户配置页面设计稿
2. 确认后端 API 契约
3. 准备迁移指南

---

## 📌 待确认问题

1. **用户配置页面位置**
   - 独立页面 `/profile/setup`？
   - 首次使用引导流程？
   - 集成到现有配置页？

2. **向后兼容**
   - 是否需要保留"快速选择"降级选项？
   - 已有用户如何迁移？

3. **实施优先级**
   - 是否可以先实现 MVP 版本？
   - 完整版与 MVP 版本的分界线？

---

**报告生成时间:** 2026-04-03
**下一步:** 等待用户确认修正范围后执行文档更新
