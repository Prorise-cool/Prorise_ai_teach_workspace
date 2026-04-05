# Sprint 变更提案：Epic 1 核心方向修正

**日期:** 2026-04-03
**提案人:** AI Agent (Correct Course Workflow)
**变更范围:** Major - 需要架构级调整
**影响 Epic:** Epic 1: 用户接入、统一入口与启动配置

---

## 一、问题摘要

### 触发原因

在 Story 1-5 准备开发时，发现整个 Epic 1 的核心描述与参考项目 OpenMAIC 的设计模型**根本性不符**。

### 问题描述

| 错误维度 | 当前 Epic 1 描述 | OpenMAIC 正确实现 |
|---------|-----------------|-----------------|
| **核心理念** | 固定"四个老师"风格选择 | 用户输入个人简介，系统**动态分配** AI agents |
| **用户角色** | 被动选择预设风格 | 主动描述自己（背景+偏好） |
| **Agent 生成** | 预设 4 种老师风格 | 根据用户配置**动态生成/匹配** |
| **Story 1-5** | 简单下拉选择器 | 完整的**用户配置系统** |

### 证据来源

```typescript
// OpenMAIC 的正确模型（references/OpenMAIC/lib/types/generation.ts）
interface UserRequirements {
  requirement: string;        // 用户输入的主题
  userNickname?: string;      // 学生昵称
  userBio?: string;           // ⭐ 学生背景（核心！）
  learningStyles?: ('visual' | 'auditory' | 'kinesthetic' | 'reading')[];
  language: 'zh-CN' | 'en-US';
}

// OpenMAIC 的 Agent 系统（references/OpenMAIC/lib/orchestration/registry/types.ts）
interface AgentConfig {
  id: string;
  name: string;
  role: string;              // teacher / student / assistant
  persona: string;           // AI 的性格/教学风格
  allowedActions: string[];  // 根据角色自动分配
}
```

### 影响评估

- **Story 1-5**：需要完全重写
- **Story 1-6**：角色边界描述需要微调，但实现无需变更
- **Story 1-7**：营销页无需修改
- **Epic 1 Objective**：需要修正核心描述
- **索引文档**：需要更新相关引用

---

## 二、影响分析

### Epic 级别影响

| 文档 | 当前状态 | 需要修改 |
|------|---------|---------|
| `14-epic-1.md` - Objective | 描述为"老师风格作为启动配置" | 修正为"用户配置系统与 Agent 动态分配" |
| `14-epic-1.md` - Story 1.5 | 描述为"老师风格最小选择配置" | 修正为"用户配置系统" |
| `_bmad-output/INDEX.md` | 索引指向错误描述 | 更新索引引用 |

### Story 级别影响

| Story | 状态 | 修正方式 |
|-------|------|---------|
| **Story 1-1 到 1-4** | Done/Review | ✅ 无需修改 |
| **Story 1-5** | ready-for-dev | ❌ 完全重写 |
| **Story 1-6** | ready-for-dev | ⚠️ 描述微调，实现不变 |
| **Story 1-7** | ready-for-dev | ✅ 无需修改 |

### 代码级别影响

| 模块 | 当前状态 | 修正影响 |
|------|---------|---------|
| `features/auth/` | ✅ 已完成 | 无影响 |
| `features/home/` | ✅ 已完成 | 无影响 |
| `features/landing/` | ✅ 已完成 | 无影响 |
| `features/agent/` | ❌ 未创建 | 需要创建用户配置模块 |
| `features/profile/` | ❌ 未创建 | 需要创建用户配置页面 |

---

## 三、推荐方案

### 方案选择：增量修正（已确认）

**理由：**
1. Story 1-1 到 1-4 已完成，无需返工
2. Story 1-5 尚未实际编码，可以安全重写
3. 对现有代码影响最小

### 修正策略

#### 阶段 1：文档修正（立即执行）
- [ ] 重写 `14-epic-1.md` 中的 Objective 和 Story 1.5 描述
- [ ] 创建新版 Story 1-5 实现文档
- [ ] 更新 `_bmad-output/INDEX.md` 索引

#### 阶段 2：实现准备（Story 1-5 开发前）
- [ ] 创建 `features/profile/` 模块
- [ ] 创建 `features/agent/types/` 类型定义
- [ ] 实现 Profile API 适配层

#### 阶段 3：开发执行（按新 Story 执行）
- [ ] 按新版 Story 1-5 开发用户配置系统
- [ ] 确保 Epic 3/5 任务创建时透传用户配置

---

## 四、详细变更提案

### 变更 1：Epic 1 Objective 修正

**原文：**
> 本 Epic 负责"进入系统"的统一起点。它只解决：怎么认证；怎么通过首页主入口进入课堂；怎么通过顶栏导航进入其他入口；怎么区分默认产品首页与营销落地页；**怎么在进入任务前设置最小启动参数**。

**修正为：**
> 本 Epic 负责"进入系统"的统一起点。它只解决：怎么认证；怎么通过首页主入口进入课堂；怎么通过顶栏导航进入其他入口；怎么区分默认产品首页与营销落地页；**怎么让用户配置个人简介和学习偏好，以便系统智能分配合适的 AI 老师和同学**。

### 变更 2：Story 1.5 完全重写

**原文（错误）：**
> Story 1.5: 输入壳层中的老师风格最小选择配置
> As a 准备发起学习会话的用户，
> I want 在视频或课堂输入壳层中通过轻量下拉选择老师风格...

**修正为：**
> Story 1.5: 用户配置系统（个人简介与学习偏好）
> As a 准备发起学习会话的用户，
> I want 在首次使用时设置我的个人简介和学习偏好，
> So that 系统可以根据我的特点自动分配或生成合适的 AI 老师和同学。

**详细内容见：** `14-epic-1-revised-story-1-5.md`

### 变更 3：索引文档更新

**文件：** `_bmad-output/INDEX.md`

**更新：**
- 删除对原 Story 1.5 的引用
- 添加新版 Story 1.5 文档链接
- 更新 Epic 1 描述中的核心理念

---

## 五、实施交接

### 变更范围分类

**Major** - 需要架构级调整和文档重构

### 交接对象

1. **Product Owner**：确认 Epic 1 新的目标描述
2. **Solution Architect**：确认用户配置系统的架构设计
3. **Development Team**：按新版 Story 1.5 执行开发

### 成功标准

- [ ] Epic 1 文档更新完成
- [ ] 新版 Story 1.5 文档创建完成
- [ ] 索引文档更新完成
- [ ] PO 和 Architect 确认变更
- [ ] 开发团队按新 Story 执行

---

## 六、下一步行动

### 立即执行（今天）

1. **合并 Epic 1 文档**
   - 将新版 Story 1.5 合并到 `14-epic-1.md`
   - 更新 Epic 1 Objective 描述

2. **更新索引**
   - 修正 `_bmad-output/INDEX.md` 中的相关引用

3. **归档旧文档**
   - 将原 `1-5-输入壳层中的老师风格最小选择配置.md` 移至 archive

### 后续跟进

1. **开发准备**（Story 1-5 开发前）
   - 创建用户配置页面设计稿
   - 确认后端 UserRequirements API 契约

2. **开发执行**（按新 Story）
   - 按新版 Story 1.5 开发用户配置系统
   - 确保 Epic 3/5 任务创建时正确透传

---

## 附录：OpenMAIC 核心参考

### 用户配置（OpenMAIC）

```typescript
// 用户输入自己的背景和偏好
interface UserRequirements {
  requirement: string;        // 主题描述
  userNickname?: string;      // 昵称
  userBio?: string;           // ⭐ 个人简介（核心字段）
  learningStyles?: ('visual' | 'auditory' | 'kinesthetic' | 'reading')[];
  language: 'zh-CN' | 'en-US';
}
```

### Agent 分配（OpenMAIC）

```typescript
// 系统根据用户配置生成/匹配 agents
interface AgentConfig {
  id: string;
  name: string;
  role: string;              // teacher / student / assistant
  persona: string;           // AI 性格（基于用户配置生成）
  allowedActions: string[];  // 根据角色自动分配权限
  priority: number;
  color: string;
  avatar: string;
}

// 权限自动分配
const ROLE_ACTIONS = {
  teacher: [...SLIDE_ACTIONS, ...WHITEBOARD_ACTIONS],
  assistant: [...WHITEBOARD_ACTIONS],
  student: [...WHITEBOARD_ACTIONS],
};
```

---

**提案状态:** 待用户确认
**下一步:** 等待用户批准后执行文档修正
