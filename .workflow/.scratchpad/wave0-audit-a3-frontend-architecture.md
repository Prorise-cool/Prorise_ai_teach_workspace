# Wave 0 A3 — 前端 feature 横向架构一致性审计

## 总览

8 个 student-web feature 横向严重不一致：目录粒度差异极大（learning-center 仅有 pages，video 9 个子目录）；store/stores 命名混用（openmaic 单数 vs profile/video 复数）；状态管理无统一约定（Zustand + TanStack Query + useState 混用）；样式策略混用（Tailwind + SCSS + 硬编码）；API 调用分散（仅 home/openmaic/profile 有 api/）。

---

## 维度 1：目录结构

| Feature | 子目录 | 拆分粒度 |
|---|---|---|
| auth | components, hooks, pages, schemas, shared, styles | 中 |
| classroom | components, hooks, pages, schemas, styles | 中 |
| home | api, components, pages, schemas, shared, styles | 中（无 hooks）|
| **learning-center** | pages | **极小（仅 pages）**|
| **learning-coach** | pages, utils | **极小** |
| openmaic | api, components, db, hooks, pages, **store**, types | 大（**store 单数**）|
| profile | api, hooks, pages, schemas, shared, **stores**, styles | 大（**stores 复数**）|
| video | components, config, constants, hooks, pages, schemas, **stores**, styles, utils | 大（最完整）|

**推荐基准**：`api/ + components/ + hooks/ + pages/ + schemas/ + shared/ + stores/(复数) + styles/ + types.ts + utils/`

---

## 维度 2：页面命名

7/8 都用 `xxx-page.tsx` ✅。home 有 `landing-page.tsx`（特殊但符合）。

**推荐**：统一 `xxx-page.tsx`

---

## 维度 3：组件命名

全部 kebab-case ✅。子目录组织：openmaic 按功能分组（agent/chat/generation/scene-renderers/whiteboard），learning-center 按页面分组，其他平铺。

**推荐**：> 5 个组件时按功能分子目录

---

## 维度 4：Hooks 命名

| Feature | 状态 |
|---|---|
| auth/openmaic/profile/video | use-xxx.ts 在 hooks/ ✅ |
| home | hooks 散落在 components/landing-contact/ ❌ |
| learning-center | hooks 散落在 pages/ ❌ |

**推荐**：use-xxx.ts + 强制 hooks/ 目录

---

## 维度 5：状态管理

| Feature | 模式 |
|---|---|
| openmaic/profile/video | Zustand（**目录命名不统一**：store vs stores）|
| video | + TanStack Query 大量 useMutation/useQuery |
| learning-center | useMemo 包装 adapter（不是真 TQ）|
| auth/home | useState + 外部 service |

**推荐基准**：临时 UI → useState；复杂业务+持久化 → Zustand stores/；服务端数据 → TanStack Query

---

## 维度 6：样式策略

| Feature | 状态 |
|---|---|
| video | Tailwind + 4 SCSS（partials 子目录）|
| profile | Tailwind + 3 SCSS |
| classroom | Tailwind + 2 SCSS |
| learning-center/learning-coach | 纯 Tailwind ✅ |
| openmaic | Tailwind + 混合（无 styles/）|
| home/auth | Tailwind + 1 SCSS |

113 个 .tsx 含 className=（grep）。**推荐**：Tailwind 基础 + SCSS 仅复杂样式（partials 子目录）

---

## 维度 7：API 调用层

| Feature | 状态 |
|---|---|
| home/openmaic/profile | 有 api/ ✅ |
| auth/classroom/learning-center/learning-coach/video | 无 api/ ❌ |

**video 特别**：API 调用藏在 hooks（use-video-create.ts:8 用 resolveVideoTaskAdapter）

**推荐**：所有 feature 必有 api/ 子目录（即使只 1 个文件）

---

## 维度 8：Types 组织

| Feature | 模式 |
|---|---|
| openmaic | 专 types/ 目录（纯 TS types 不用 Zod）|
| profile | 既 schemas/ 又 types.ts 混用 |
| auth/classroom/home/video | 仅 schemas/ + Zod |
| learning-center/learning-coach | 分散 |

**推荐**：types.ts（后端 API 数据结构）+ schemas/（Zod 表单校验）

---

## 维度 9：JSDoc

所有 feature 文件级 JSDoc 已统一（中文）✅。函数级覆盖不完整。openmaic 偶有英文混用。

**推荐**：所有导出函数都有中文 JSDoc

---

## 维度 10：i18n

| Feature | i18n 覆盖 |
|---|---|
| home | 100% ✅ |
| learning-center | 100% ✅ |
| learning-coach | ~50% |
| **auth/classroom/openmaic/profile/video** | **0% 全硬编码中文** |

**推荐**：全仓零硬编码，统一 useAppTranslation

---

## 维度 11：错误处理

| Feature | 状态 |
|---|---|
| video | isApiClientError + useFeedback ✅ |
| learning-center | useFeedback notify ✅ |
| 其他 | 无统一错误处理 |

**全仓无 ErrorBoundary**（严重缺陷）

**推荐**：isApiClientError + useFeedback + 全局 ErrorBoundary

---

## 维度 12：测试

| Feature | 测试数 |
|---|---|
| video | 13（含 .browser.test.tsx）|
| home | 3 |
| auth/profile | 2 |
| classroom | 1 |
| learning-center/learning-coach/openmaic | 0 |

**推荐**：测试同级源文件，API 100% / hooks 80%

---

## 模范评选

- **最规范**：video（9 子目录、完整 hooks/stores、最多测试、JSDoc 完整）
- **最不规范**：learning-center（仅 pages 目录，所有逻辑混在 pages 内）
- **轻奖**：openmaic 组件按功能分子目录做得好

---

## 不一致项分类

### 现在改（< 30 min/项，0 风险）
1. openmaic `store/` → `stores/`（5 min，2 个文件）
2. home `components/landing-contact/use-landing-contact-submit.ts` → `hooks/`（10 min）
3. learning-center `pages/favorites/use-favorites-page-data.ts` → `hooks/`（10 min）
4. auth/classroom 新建 api/ 目录（15 min）

### Wave 1 改（与功能重构同期）
1. 全仓采用 i18n（4-6h，影响 auth/classroom/openmaic/profile/video）
2. video API 调用从 hooks 迁出到 api/（1h）
3. learning-center 拆分组件（pages/xxx → components/xxx，2-3h）

### Wave 2 改（独立技术债收口）
1. ErrorBoundary 全覆盖（2-3h）
2. learning-center 彻底拆分（4-5h，新增 components/ hooks/ api/ schemas/）
3. learning-coach/openmaic/classroom 测试覆盖（6-8h）

---

## 总结表

| 维度 | 现状 | 推荐基准 | 优先级 |
|---|---|---|---|
| 目录结构 | 极不统一 1-9 子目录 | 标准 8 目录 + 按需 | 高 |
| 页面命名 | 7/8 统一 | xxx-page.tsx | 低 |
| 组件命名 | 全 kebab-case | 保持+功能分组 | 中 |
| Hooks 命名 | 用 use-xxx 但 home/learning-center 散落 | hooks/ 目录强制 | 中 |
| 状态管理 | 混乱 | 决策树（Zustand/TQ/useState）| 高 |
| 样式 | 混用 | Tailwind + 选择性 SCSS | 中 |
| API 调用 | 5/8 缺 api/ | 全 feature 有 api/ | 高 |
| Types | 混乱 | types.ts + schemas/(Zod) | 中 |
| JSDoc | 文件级好，函数级缺 | 所有导出都有 | 低 |
| **i18n** | **5/8 全硬编码** | 全仓零硬编码 | **高 (Wave 1)** |
| 错误处理 | 无统一 + 无 ErrorBoundary | isApiClientError + useFeedback + EB | 中 |
| 测试 | 不均 | API 100%/hooks 80% | 中 |
