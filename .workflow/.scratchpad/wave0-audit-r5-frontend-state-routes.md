# Wave 0 R5 — 前端状态/路由/i18n/类型统一性审计

## 总览

**结论**：前端整体一致性良好。3 个 P0 问题需热修，无 store/types/DB 重复定义。

### 核心发现

**P0-1 路由命名异常** ⚠️
- `/openmaic/classroom/:id` 应改为 `/classroom/play/:id`
- `/openmaic/settings` 应删除或归并到 `/settings/classroom-preferences`

**P0-2 nav 缺失课堂入口** 🔴
- `/classroom/input` 路由已实现（ClassroomInputPage 存在），但：
  - `entryNav.workspaceRoutes` 中只列了 `/video/input` 和 `/learning`
  - 缺少课堂入口导致用户无法从 UI 访问课堂生成页
  - entry-page-content.ts:77 有注释说明"「主题课堂」入口已从 nav 隐藏"

**P0-3 i18n 占位注释需更新** 📝
- entry-page-content.ts:77 — 注释要改
- workspaceRoutes 要加课堂生成入口

### 无重复发现 ✅
- **Store**：classroom-store 与 video-generating-store / user-profile-store 完全无重复
- **Types**：openmaic/types 与其他 feature types 无冲突
- **DB**：Dexie classroom-db 是临时 MVP 方案，Wave 1 后端集成时移除

---

## Wave 0 热修清单（P0 必做，共 3 项）

1. 加课堂入口到 nav — entry-page-content.ts:78-89 把 `/classroom/input` 加进 workspaceRoutes（< 15 min）
2. 删除 nav 隐藏注释 — entry-page-content.ts:77 改注释（< 5 min）
3. 验收课堂输入页功能 — ClassroomInputPage 已实现，需验收

---

## Wave 1 大重构

1. **路由迁移**：`/openmaic/*` → `/classroom/*`（2-3h）
2. **特性合并**：features/openmaic → features/classroom（4-6h）
3. **后端集成**：删除 Dexie，用 RuoYi xm_session_artifact（6-8h）
4. **补齐 schemas**：classroom/schemas 补 Zod 定义（2-3h）
