# Implementation Artifacts 索引

本目录包含各 Epic/Story 的详细实施文档，是开发执行的主要参考。

## Epic 1: 用户接入、统一入口与启动配置

### Story 1.1: 统一认证契约、会话 payload 与 mock 基线
- [文档](./1-1-统一认证契约会话-payload-与-mock-基线.md)
- **状态**: 已完成
- **说明**: 定义认证接口 schema、mock session 样例、401/403 行为说明

### Story 1.2: 独立认证页中的注册登录与回跳
- [文档](./1-2-独立认证页中的注册登录与回跳.md)
- **状态**: 已完成
- **说明**: 实现账密登录、GitHub/QQ 三方登录、注册开关控制

### Story 1.3: 登出、401 处理与受保护访问一致性
- [文档](./1-3-登出401-处理与受保护访问一致性.md)
- **状态**: 已完成
- **说明**: 前端、FastAPI 与 RuoYi 认证态一致性处理

### Story 1.4: 首页课堂直达入口与顶栏导航分发
- [文档](./1-4-首页课堂直达入口与顶栏导航分发.md)
- **状态**: 已完成
- **说明**: 首页单主入口 Hero/CTA、顶边栏导航分发

### Story 1.5: 用户配置系统（个人简介与学习偏好）⭐
- [文档](./1-5-用户配置系统（个人简介与学习偏好）.md)
- **状态**: ready-for-dev
- **说明**: 三页渐进式引导（个人信息简介 → 信息收集 → 导览页）
- **关键点**:
  - 使用 RuoYi 代码生成器快速实现 CRUD
  - 字段与 OpenMAIC UserRequirements 对齐
  - 5 种性格类型 + 12 种导师标签
- **数据库**: `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260404_xm_user_profile.sql`

### Story 1.6: 角色边界与入口级权限可见性
- [文档](./1-6-角色边界与入口级权限可见性.md)
- **状态**: 已有初步实现
- **说明**: 基于角色的入口显示与权限不足处理

### Story 1.7: 营销落地页与 home 首页分流
- [文档](./1-7-营销落地页与-home-首页分流.md)
- **状态**: in-progress
- **说明**:
  - `/landing` 独立营销页与 `/` 默认首页分流
  - 现有联系表单需从 `mailto:` 升级为真实 RuoYi 提交
  - 新增营销线索表与后台最小查询 / 导出闭环
  - 保留现有落地页视觉与首页分流成果，不重新打开整页视觉返工

## Epic 1 实施基线文档

### OpenMAIC 对齐基线
- [文档](../planning-artifacts/epics/epic-1-openmaic-alignment-baseline.md)
- **说明**: Epic 1 与 OpenMAIC 智能师生匹配系统的对齐设计
- **核心原则**: 用户填写个人特点 → 系统智能生成/匹配 AI agents

### 实施基线与执行计划
- [文档](../planning-artifacts/epics/epic-1-implementation-baseline.md)
- **说明**: 数据库、后端、前端详细实施步骤
- **包含**: 依赖关系图、代码示例、验收标准

## 快速导航

- [Epic 1 执行清单](../../../docs/01开发人员手册/0000-AI快速导航索引/epic-1-execution-checklist.md)
- [Epic/Story 总索引](../planning-artifacts/epics/index.md)
