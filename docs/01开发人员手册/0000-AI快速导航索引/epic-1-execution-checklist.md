# Epic 1 执行清单

**最后更新**: 2026-04-04
**状态**: 执行中

---

## 快速导航

- [实施基线文档](../../../../_bmad-output/planning-artifacts/epics/epic-1-implementation-baseline.md)
- [OpenMAIC 对齐基线](../../../../_bmad-output/planning-artifacts/epics/epic-1-openmaic-alignment-baseline.md)
- [Story 1.5 用户配置系统](../../../../_bmad-output/implementation-artifacts/1-5-用户配置系统（个人简介与学习偏好）.md)
- [Story 1.7 营销落地页](../../../../_bmad-output/implementation-artifacts/1-7-营销落地页与-home-首页分流.md)

---

## P0 - 数据库与后端基线

### 1. 执行 SQL 迁移
- [ ] 连接到 RuoYi 数据库
- [ ] 执行 `20260404_xm_user_profile.sql`
- [ ] 验证表创建成功
- [ ] 验证数据字典创建成功

**SQL 文件位置**: `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260404_xm_user_profile.sql`

### 2. 使用 RuoYi 代码生成器
- [ ] 登录 RuoYi 后台管理系统
- [ ] 导入 `xm_user_profile` 表
- [ ] 配置字段属性（参考 Story 1.5 文档）
- [ ] 生成并下载代码
- [ ] 复制代码到对应模块目录

### 3. 手动添加非标准方法
- [ ] 添加 `getCurrent()` 方法到 Controller
- [ ] 添加 `isCompleted()` 方法到 Service
- [ ] 测试 API 可访问性

---

## P1 - 前端用户配置系统

### 1. 创建目录结构
- [ ] 创建 `features/profile/` 目录
- [ ] 创建子目录：components, hooks, stores, api, schemas, styles

### 2. 实现类型定义
- [ ] 创建 `types.ts`（PersonalityType, TEACHER_TAGS, UserProfile 等）

### 3. 实现 API 适配层
- [ ] 创建 `api/profileApi.ts`
- [ ] 实现 getCurrent(), checkCompleted(), create(), update()

### 4. 实现状态管理
- [ ] 创建 `stores/profileStore.ts`（Zustand + persist）

### 5. 实现页面组件
- [ ] `ProfileIntroPage.tsx` - 个人信息简介页
- [ ] `InfoCollectionPage.tsx` - 信息收集页（两步）
- [ ] `TourPage.tsx` - 导览页

### 6. 添加路由
- [ ] 在 `app/routes/index.tsx` 添加 `/profile/*` 路由

---

## P2 - 认证流程集成

### 1. 修改登录后跳转逻辑
- [ ] 修改 `use-auth-redirect.ts`
- [ ] 添加 `resolvePostAuthRedirect()` 函数
- [ ] 检查用户配置状态
- [ ] 未完成配置时引导到 `/profile/intro`

### 2. 保存原始目标
- [ ] 使用 state 传递原始目标页面
- [ ] 配置完成后恢复原始目标

---

## P3 - 落地页功能连接

### 1. 修改 Hero CTA
- [ ] 根据登录状态显示不同 CTA
- [ ] 未登录 → `/login?returnTo=/profile/intro`
- [ ] 已登录 → `/classroom/input`

### 2. 新增智能匹配演示模块
- [ ] 创建 `SmartMatchingDemo.tsx` 组件
- [ ] 展示 5 种性格类型
- [ ] 展示 12 种导师标签
- [ ] 展示"配置 → 匹配"流程

### 3. 修正营销文案
- [ ] 删除"4种老师风格"相关描述
- [ ] 替换为"智能师生匹配"概念
- [ ] 更新 i18n 资源文件

---

## P4 - 任务创建透传

### 1. 前端透传
- [ ] 修改课堂输入页面
- [ ] 获取用户配置
- [ ] 创建任务时携带 `userProfile`

### 2. 后端透传
- [ ] 修改任务创建 Service
- [ ] 获取用户配置
- [ ] 构建 UserRequirements
- [ ] 透传到 OpenMAIC

---

## 验收测试

### 功能测试
- [ ] 登录 → 引导到用户配置
- [ ] 填写简介 → 信息收集页/导览页
- [ ] 跳过简介 → 信息收集页
- [ ] 完成配置 → 进入首页
- [ ] 落地页 CTA → 登录 → 配置流程

### 技术测试
- [ ] API 调用成功
- [ ] 数据持久化成功
- [ ] 路由跳转正确
- [ ] 配置透传成功

---

## 参考文档

### 数据库
- `xm_user_profile` 表结构
- `user_personality_type` 数据字典
- `user_teacher_tag` 数据字典

### 前端
- [Story 1.5 详细设计](../../../../_bmad-output/implementation-artifacts/1-5-用户配置系统（个人简介与学习偏好）.md)
- [代码生成器配置指南](../../../../_bmad-output/implementation-artifacts/1-5-用户配置系统（个人简介与学习偏好）.md#阶段-3代码生成器配置指南供开发者在后台页面填写时参考)

### OpenMAIC 对齐
- [字段映射表](../../../../_bmad-output/planning-artifacts/epics/epic-1-openmaic-alignment-baseline.md#1-用户配置字段映射)
- [数据流设计](../../../../_bmad-output/planning-artifacts/epics/epic-1-openmaic-alignment-baseline.md#数据流设计)
