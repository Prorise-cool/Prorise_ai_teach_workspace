# Epic 1 实施基线与执行计划

**创建日期**: 2026-04-04
**状态**: 执行中
**基于文档**: `epic-1-openmaic-alignment-baseline.md`

---

## 当前项目状态分析

### 已完成
1. ✅ 路由配置 (`app/routes/index.tsx`)
   - `/` - 首页
   - `/landing` - 营销落地页
   - `/login` - 认证页
   - `/classroom/input` - 课堂输入页（受保护）
   - `/video/input` - 视频输入页（受保护）

2. ✅ Landing Page 结构 (`features/home/landing-page.tsx`)
   - 完整的营销页面结构（Hero、Benefits、Features、Testimonials、Pricing、FAQ、Contact、Footer）
   - 当前状态：**白版**（仅有展示，无实际功能连接）
   - 主要 CTA 当前链接到 `/`

3. ✅ 认证流程 (`features/auth/`)
   - 登录页、注册页、第三方登录回调页
   - 登录成功后默认跳转到 `/`
   - **缺失**：用户配置流程引导

### 未完成
1. ❌ 用户配置系统（Story 1.5）
   - 数据库表未创建
   - 前端配置页面未实现
   - API 适配层未实现

2. ❌ 落地页功能连接（Story 1.7）
   - CTA 未连接到登录→配置流程
   - 缺少"智能师生匹配"演示模块
   - 营销文案仍需修正

3. ❌ 配置透传
   - 任务创建接口未扩展 `userProfile` 字段
   - 后端未透传用户配置到 OpenMAIC

---

## 实施优先级与依赖关系

```
┌─────────────────────────────────────────────────────────────────┐
│                     Epic 1 实施依赖图                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  P0: 数据库与后端基线                                           │
│  ├── 执行 SQL 创建表和数据字典                                  │
│  └── RuoYi 代码生成器生成 CRUD 代码                            │
│         ↓                                                       │
│  P1: 前端用户配置系统（Story 1.5）                              │
│  ├── 个人信息简介页                                            │
│  ├── 信息收集页（性格+导师偏好）                               │
│  ├── 导览页                                                    │
│  └── 配置 API 适配层                                           │
│         ↓                                                       │
│  P2: 认证流程集成                                              │
│  ├── 登录成功后引导用户配置                                    │
│  └── 配置完成检查逻辑                                          │
│         ↓                                                       │
│  P3: 落地页功能连接（Story 1.7）                               │
│  ├── CTA 连接到登录→配置流程                                   │
│  ├── 智能匹配演示模块                                          │
│  └── 营销文案修正                                              │
│         ↓                                                       │
│  P4: 任务创建透传                                              │
│  ├── 扩展任务创建接口                                          │
│  └── 后端透传用户配置到 OpenMAIC                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 阶段 1：数据库与后端基线（P0）

### 1.1 执行 SQL 迁移

**文件**: `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260404_xm_user_profile.sql`

**执行步骤**:
```bash
# 1. 连接到 RuoYi 数据库
mysql -u root -p ry_vue

# 2. 执行 SQL 文件
source /path/to/packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260404_xm_user_profile.sql

# 3. 验证表创建
SHOW TABLES LIKE 'xm_user_profile';
DESC xm_user_profile;

# 4. 验证数据字典
SELECT * FROM sys_dict_type WHERE dict_type IN ('user_personality_type', 'user_teacher_tag');
```

**预期结果**:
- `xm_user_profile` 表创建成功
- `user_personality_type` 字典类型创建成功，包含 5 个字典项
- `user_teacher_tag` 字典类型创建成功，包含 12 个字典项

### 1.2 使用 RuoYi 代码生成器

**步骤**:
1. 登录 RuoYi 后台管理系统（通常是 `http://localhost/admin`）
2. 进入"系统工具" → "代码生成"
3. 点击"导入"，选择 `xm_user_profile` 表
4. 点击"编辑"，配置字段属性（参考 Story 1.5 文档中的配置指南）
5. 点击"生成代码"，下载生成的代码压缩包
6. 解压并将代码复制到对应模块目录

**代码生成器配置清单**:

| 配置项 | 填写内容 |
|--------|---------|
| 生成模板 | 单表 |
| 生成包路径 | org.dromara.xiaomai.user.profile |
| 生成模块名 | ruoyi-xiaomai |
| 生成业务名 | user/profile |
| 生成功能名 | 用户配置 |

**字段配置**:

| 字段名 | 显示类型 | 字典类型 | 查询方式 | 是否必填 | 是否列表列 |
|--------|---------|---------|---------|---------|----------|
| id | 隐藏 | - | = | 是 | 否 |
| user_id | 隐藏 | - | = | 是 | 是 |
| avatar_url | 图片上传 | - | - | 否 | 是 |
| bio | 文本域 | - | LIKE | 否 | 是 |
| personality_type | 下拉框 | user_personality_type | = | 否 | 是 |
| teacher_tags | 复选框 | user_teacher_tag | - | 否 | 是 |
| language | 下拉框 | sys_language | = | 否 | 是 |
| is_completed | 单选框 | sys_yes_no | = | 否 | 是 |

### 1.3 手动添加非标准方法

代码生成器生成标准 CRUD 后，需手动添加以下方法：

**Controller 层** (`XmUserProfileController.java`):
```java
/**
 * 获取当前用户配置
 */
@GetMapping("/current")
public R<XmUserProfileVo> getCurrent() {
    Long userId = LoginHelper.getUserId();
    return R.ok(userProfileService.queryByUserId(userId));
}

/**
 * 检查当前用户是否完成配置
 */
@GetMapping("/completed")
public R<Boolean> isCompleted() {
    Long userId = LoginHelper.getUserId();
    return R.ok(userProfileService.isCompleted(userId));
}
```

**Service 层** (`IXmUserProfileService.java` 和 `XmUserProfileServiceImpl.java`):
```java
// 接口定义
Boolean isCompleted(Long userId);

// 实现类
@Override
public Boolean isCompleted(Long userId) {
    XmUserProfile profile = baseMapper.selectOne(
        Wrappers.lambdaQuery(XmUserProfile.class)
            .eq(XmUserProfile::getUserId, userId)
    );
    return profile != null && Boolean.TRUE.equals(profile.getIsCompleted());
}
```

---

## 阶段 2：前端用户配置系统（P1）

### 2.1 创建用户配置 Feature 目录结构

```
packages/student-web/src/features/profile/
├── components/
│   ├── ProfileIntroPage.tsx      # 个人信息简介页
│   ├── InfoCollectionPage.tsx    # 信息收集页
│   └── TourPage.tsx              # 导览页
├── hooks/
│   └── useUserProfile.ts         # 用户配置 Hook
├── stores/
│   └── profileStore.ts           # 用户配置 Store (Zustand)
├── api/
│   └── profileApi.ts             # API 调用封装
├── schemas/
│   └── user-profile-schema.ts    # Zod 验证模式
├── types.ts                      # TypeScript 类型定义
└── styles/
    └── profile-pages.scss        # 页面样式
```

### 2.2 类型定义 (`types.ts`)

```typescript
/**
 * 用户配置相关类型定义
 * 与 OpenMAIC UserRequirements 对齐
 */

// 性格类型枚举
export enum PersonalityType {
  ACTION_ORIENTED = 'action_oriented',
  EXPLORER = 'explorer',
  METHODOLOGICAL = 'methodological',
  SOCIAL = 'social',
  CREATIVE = 'creative'
}

// AI 导师偏好标签
export const TEACHER_TAGS = [
  'humorous',
  'logical',
  'imaginative',
  'strict',
  'patient',
  'friendly',
  'direct',
  'knowledgeable',
  'encouraging',
  'interactive',
  'calm',
  'passionate'
] as const;

export type TeacherTag = typeof TEACHER_TAGS[number];

// 用户配置
export interface UserProfile {
  id?: number;
  userId: number;
  avatarUrl?: string;
  bio?: string;
  personalityType?: PersonalityType;
  teacherTags?: TeacherTag[];
  language: 'zh-CN' | 'en-US';
  isCompleted: boolean;
  createTime?: string;
  updateTime?: string;
}

// 创建/更新请求
export interface CreateProfileRequest {
  avatarUrl?: string;
  bio?: string;
  personalityType?: PersonalityType;
  teacherTags?: TeacherTag[];
}

export interface UpdateProfileRequest extends CreateProfileRequest {
  id: number;
}

// 配置完成状态
export interface ProfileCompletionStatus {
  isCompleted: boolean;
  profile?: UserProfile;
}
```

### 2.3 API 适配层 (`api/profileApi.ts`)

```typescript
import { apiClient } from '@/services/api-client';
import type {
  UserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfileCompletionStatus
} from '../types';

const PROFILE_BASE_PATH = '/api/user/profile';

/**
 * 用户配置 API
 */
export const profileApi = {
  /**
   * 获取当前用户配置
   */
  async getCurrent(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(
      `${PROFILE_BASE_PATH}/current`
    );
    return response.data;
  },

  /**
   * 检查用户是否完成配置
   */
  async checkCompleted(): Promise<ProfileCompletionStatus> {
    const response = await apiClient.get<{ isCompleted: boolean }>(
      `${PROFILE_BASE_PATH}/completed`
    );
    return {
      isCompleted: response.data.isCompleted
    };
  },

  /**
   * 创建用户配置（首次填写）
   */
  async create(data: CreateProfileRequest): Promise<UserProfile> {
    const response = await apiClient.post<UserProfile>(
      PROFILE_BASE_PATH,
      data
    );
    return response.data;
  },

  /**
   * 更新用户配置
   */
  async update(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>(
      PROFILE_BASE_PATH,
      data
    );
    return response.data;
  }
};
```

### 2.4 用户配置 Store (`stores/profileStore.ts`)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, CreateProfileRequest } from '@/features/profile/types';
import { profileApi } from '@/features/profile/api/profileApi';

interface UserProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProfile: () => Promise<void>;
  createProfile: (data: CreateProfileRequest) => Promise<void>;
  updateProfile: (data: CreateProfileRequest) => Promise<void>;
  checkCompleted: () => Promise<boolean>;
  clearProfile: () => void;
}

export const useProfileStore = create<UserProfileState>()(
  persist(
    set => ({
      profile: null,
      isLoading: false,
      error: null,

      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const profile = await profileApi.getCurrent();
          set({ profile, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取配置失败',
            isLoading: false
          });
        }
      },

      createProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const profile = await profileApi.create(data);
          set({ profile, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建配置失败',
            isLoading: false
          });
          throw error;
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const profile = await profileApi.update({
            id: useProfileStore.getState().profile!.id!,
            ...data
          });
          set({ profile, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新配置失败',
            isLoading: false
          });
          throw error;
        }
      },

      checkCompleted: async () => {
        try {
          const result = await profileApi.checkCompleted();
          return result.isCompleted;
        } catch {
          return false;
        }
      },

      clearProfile: () => {
        set({ profile: null, error: null });
      }
    }),
    {
      name: 'xm-user-profile-storage',
      partialize: state => ({ profile: state.profile })
    }
  )
);
```

### 2.5 页面组件实现要点

#### ProfileIntroPage（个人信息简介页）

```typescript
// 关键功能
interface ProfileIntroPageProps {
  onComplete: (hasBio: boolean) => void;
  onSkip: () => void;
}

// 实现要点
// 1. 头像上传组件（可选）
// 2. 简介输入（200字限制，实时字数统计）
// 3. 跳过按钮 → 直接进入导览页
// 4. 下一步按钮
//    - 已填写简介 → 进入导览页
//    - 未填写简介 → 进入信息收集页
```

#### InfoCollectionPage（信息收集页）

```typescript
// 关键功能
interface InfoCollectionPageProps {
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

// 实现要点
// 1. Step 1: 性格类型选择（5选1单选）
// 2. Step 2: AI导师偏好选择（12标签多选）
// 3. 每步都提供跳过按钮
// 4. 支持返回上一步
// 5. 提交时调用 profileApi.createProfile()
```

#### TourPage（导览页）

```typescript
// 关键功能
interface TourPageProps {
  onComplete: () => void;
  onSkip: () => void;
}

// 实现要点
// 1. 3步产品功能介绍
//    - 学习计划生成
//    - 沉浸式课堂输入
//    - 一键视频生成
// 2. 左侧文字说明，右侧 GIF 演示区域
// 3. 前后翻页按钮
// 4. 跳过导览按钮
```

---

## 阶段 3：认证流程集成（P2）

### 3.1 修改登录成功后跳转逻辑

**当前行为**: 登录成功后跳转到 `/`

**目标行为**: 登录成功后检查用户配置状态
- 已完成配置 → 跳转到原目标页面或 `/`
- 未完成配置 → 跳转到用户配置流程

**实现位置**: `features/auth/hooks/use-auth-redirect.ts`

```typescript
// 新增函数
async function resolvePostAuthRedirect(): Promise<string> {
  // 1. 检查用户配置状态
  const isCompleted = await profileApi.checkCompleted();

  // 2. 如果已完成配置，使用原 returnTo
  if (isCompleted) {
    return returnTo;
  }

  // 3. 如果未完成配置，引导到用户配置流程
  // 使用 state 传递原始目标，配置完成后可恢复
  return '/profile/intro';
}

// 修改 redirectAfterAuth
const redirectAfterAuth = useCallback(async (overrideReturnTo?: string) => {
  const target = overrideReturnTo ?? await resolvePostAuthRedirect();

  void navigate(
    normalizeReturnTo(target, DEFAULT_AUTH_RETURN_TO),
    {
      replace: true,
      state: { originalReturnTo: returnTo } // 保存原始目标
    }
  );
}, [navigate, returnTo]);
```

### 3.2 新增用户配置路由

**文件**: `app/routes/index.tsx`

```typescript
// 在路由配置中添加
{
  path: 'profile',
  element: <RequireAuthRoute />,
  children: [
    {
      path: 'intro',
      lazy: () => import('@/features/profile/components/ProfileIntroPage').then(m => ({
        Component: m.ProfileIntroPage
      }))
    },
    {
      path: 'collection',
      lazy: () => import('@/features/profile/components/InfoCollectionPage').then(m => ({
        Component: m.InfoCollectionPage
      }))
    },
    {
      path: 'tour',
      lazy: () => import('@/features/profile/components/TourPage').then(m => ({
        Component: m.TourPage
      }))
    }
  ]
}
```

---

## 阶段 4：落地页功能连接（P3）

### 4.1 修改 Hero CTA 按钮

**当前代码** (`landing-page.tsx`):
```tsx
<Link
  to="/"
  className="group/arrow inline-flex min-w-[220px] items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-105"
>
  <span>{t('landing.hero.primaryAction')}</span>
  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/arrow:translate-x-1" />
</Link>
```

**修改为**:
```tsx
import { useAuthSessionStore } from '@/stores/auth-session-store';

// 在组件内部
const session = useAuthSessionStore(state => state.session);
const isAuthenticated = Boolean(session?.accessToken);

// 修改 CTA
{isAuthenticated ? (
  <Link
    to="/classroom/input"
    className="..."
  >
    <span>{t('landing.hero.primaryActionAuthenticated')}</span>
    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/arrow:translate-x-1" />
  </Link>
) : (
  <Link
    to="/login"
    state={{ originalReturnTo: '/profile/intro' }}
    className="..."
  >
    <span>{t('landing.hero.primaryAction')}</span>
    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/arrow:translate-x-1" />
  </Link>
)}
```

### 4.2 新增"智能师生匹配"演示模块

**文件**: `features/home/components/SmartMatchingDemo.tsx`

```typescript
/**
 * 智能师生匹配演示模块
 * 展示用户配置如何影响 AI agent 匹配
 */
export function SmartMatchingDemo() {
  return (
    <section id="smart-matching" className="...">
      {/* 模块标题 */}
      <h2>根据你的特点智能匹配 AI 老师</h2>

      {/* 性格类型预览 */}
      <div className="personality-types">
        {PERSONALITY_TYPES.map(type => (
          <PersonalityCard key={type.value} {...type} />
        ))}
      </div>

      {/* 导师偏好标签预览 */}
      <div className="teacher-tags">
        {TEACHER_TAGS.map(tag => (
          <TagPill key={tag}>{tag.label}</TagPill>
        ))}
      </div>

      {/* 匹配过程演示 */}
      <div className="matching-flow">
        <Step icon={<User />} label="填写个人简介" />
        <ArrowRight />
        <Step icon={<Settings />} label="选择性格偏好" />
        <ArrowRight />
        <Step icon={<Sparkles />} label="智能匹配 AI 老师" />
      </div>
    </section>
  );
}
```

### 4.3 营销文案修正

**删除**:
- "4种老师风格"
- "严谨教授/风趣老师/温和导师/干练讲师"
- "选择你喜欢的老师风格"

**替换为**:
- "根据你的个人特点智能分配合适的 AI 老师和同学"
- "系统会分析你的个人简介、性格偏好，动态生成适配的 AI agents"
- "填写简介 → 选择偏好 → 智能匹配"

---

## 阶段 5：任务创建透传（P4）

### 5.1 扩展任务创建请求

**前端** (`features/classroom/classroom-input-page.tsx`):
```typescript
// 获取用户配置
const { profile } = useProfileStore();

// 创建任务时携带用户配置
async function handleCreateTask(requirement: string) {
  await classroomApi.createTask({
    requirement,
    language: profile?.language || 'zh-CN',
    webSearch: false,
    userProfile: {
      bio: profile?.bio,
      nickname: profile?.nickname,
      avatarUrl: profile?.avatarUrl,
      personalityType: profile?.personalityType,
      teacherTags: profile?.teacherTags
    }
  });
}
```

### 5.2 后端透传到 OpenMAIC

**Service 层** (`XiaomaiClassroomService.java`):
```java
/**
 * 创建课堂任务
 */
public CreateTaskResponse createTask(CreateTaskRequest request) {
    // 1. 获取用户配置
    UserProfile profile = userProfileService.queryByUserId(LoginHelper.getUserId());

    // 2. 构建 UserRequirements（透传到 OpenMAIC）
    UserRequirements userRequirements = UserRequirements.builder()
        .requirement(request.getRequirement())
        .language(request.getLanguage())
        .userNickname(profile != null ? profile.getNickname() : null)
        .userBio(profile != null ? profile.getBio() : null)
        .webSearch(request.getWebSearch())
        .build();

    // 3. 调用 OpenMAIC 创建任务
    return openmaicService.createTask(userRequirements);
}
```

---

## 验收标准

### 功能验收
1. ✅ 用户可以填写个人简介、性格类型、导师偏好
2. ✅ 用户配置正确保存到数据库
3. ✅ 登录成功后引导用户完成配置
4. ✅ 落地页 CTA 正确连接到登录→配置流程
5. ✅ 任务创建时用户配置正确透传
6. ✅ 营销文案强调"智能师生匹配"而非"4种风格"

### 技术验收
1. ✅ 字段命名与 OpenMAIC 一致
2. ✅ 配置透传无数据丢失
3. ✅ Mock 模式与真实模式使用相同数据模型
4. ✅ 路由守卫正确处理未完成配置的用户

---

## 文件清单

### 新增文件
- `packages/student-web/src/features/profile/` - 用户配置 feature 目录
- `packages/student-web/src/features/home/components/SmartMatchingDemo.tsx` - 智能匹配演示模块
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-xiaomai/` - 代码生成器生成的后端代码

### 修改文件
- `packages/student-web/src/app/routes/index.tsx` - 新增用户配置路由
- `packages/student-web/src/features/home/landing-page.tsx` - CTA 连接和文案修正
- `packages/student-web/src/features/auth/hooks/use-auth-redirect.ts` - 登录后跳转逻辑
- `packages/student-web/src/features/classroom/classroom-input-page.tsx` - 任务创建透传

---

## 后续工作优先级

### P0（必须完成）
1. 执行 SQL 创建数据库表和数据字典
2. 使用 RuoYi 代码生成器生成 CRUD 代码
3. 实现前端三页用户配置组件

### P1（重要）
4. 实现认证流程集成
5. 实现落地页 CTA 功能连接
6. 实现智能匹配演示模块

### P2（可选）
7. 优化 agent 匹配算法
8. 添加配置预览功能
9. 个性化推荐优化
