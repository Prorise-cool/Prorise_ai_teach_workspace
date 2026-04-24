# Wave 0 A4 — 前端代码品质扫描

## 总览

- 总 .ts/.tsx: 395
- > 500 行文件: 10
- typecheck errors: 0 ✅
- TODO/FIXME/@ts-ignore/@ts-expect-error/as any: 24 条
- 无 tests 的 feature: 3 (learning-center / learning-coach / openmaic)
- 总测试文件: 43 (含 services/)

---

## 1. 超长文件 (>500 行) Top 10

| 文件 | 行数 | 职责 | 推荐拆分 |
|---|---|---|---|
| app/i18n/resources/entry-page-content.ts | **1495** | i18n 资源（落地页+入口+导航）| landing-content / entry-nav-content / common-content |
| features/learning-coach/pages/learning-assessment-page.tsx | **856** | 测评视图（题目/提交/回看，checkpoint+quiz 双模式）| QuestionListView / SubmitView / ReviewView |
| features/video/pages/video-input-page.test.tsx | 854 | 视频输入页测试 | 按场景拆 |
| features/video/components/video-input-card.tsx | **678** | 输入卡片（表单+场景切换+约束）| InputForm / ScenarioSwitcher / Validator / PromptArea |
| features/learning-coach/pages/learning-path-page.tsx | 586 | 学习路径页 | PathHeader / CourseGrid / ProgressBar / ConfirmationDialog |
| app/i18n/resources/video-content.ts | 547 | 视频 i18n 资源 | 暂保留 |
| types/video.ts | 515 | 视频类型 | video-task-types / video-result-types / video-preview-types |
| features/video/pages/video-generating-page.test.tsx | 509 | 测试 | 按场景拆 |
| services/sse/task-event-stream.test.ts | 496 | SSE 测试 | 按事件类型拆 |
| services/api/adapters/video-result-adapter.ts | 494 | 视频结果 adapter（mock+real）| 已双实现分离，提取错误映射到 utils |

**拆分优先级**: entry-page-content.ts (P0) → video-input-card.tsx (P0) → learning-assessment-page.tsx (P1)

---

## 2. typecheck 错误：**零** ✅

`pnpm typecheck` 无输出。

---

## 3. 未引用 export

openmaic/types/* 全被内部 feature 消费，无孤立。

---

## 4-5. 跨 feature 重复

**Hook**: 无明显跨 feature 同名 hook 重复

**Type**: TaskSnapshot 已统一在 /types/task.ts ✅

**Component 重复**:
- LoadingState/EmptyState 在 auth/video/learning-center/profile **各自实现**，无共享 components
- **推荐**: 创建 `src/components/states/LoadingState.tsx + EmptyState.tsx`

---

## 6. 混用样式策略

| 文件 | 状态 | 行号 |
|---|---|---|
| video/components/video-input-card.tsx | ✅ 纯 Tailwind | - |
| video/pages/video-generating-page.tsx | ❌ 混用：.xm-generating-* SCSS + Tailwind text-primary/h-8 w-8 | 13/223/288 |
| auth/pages/login-page.tsx | ❌ SCSS + 部分 Tailwind | 25 |
| home/components/landing-hero.tsx | ✅ 纯 Tailwind | - |

**SCSS 总量**: 6,084 行；最大单文件 task-generating-view.scss (1,139 行)；video feature 占 3,462 行 = 57%

---

## 7. 半成品标记 — @ts-ignore / as any / as unknown 共 24 条

| 文件 | 行 | 类型 |
|---|---|---|
| features/openmaic/components/stage.tsx | 74/84/93/102 | as any × 4 |
| features/openmaic/components/quiz-renderer.tsx | 89 | as any |
| features/openmaic/hooks/use-classroom.ts | 73 | as unknown as |
| features/openmaic/pages/openmaic-classroom-page.tsx | 56/68 | as any × 2 |
| features/openmaic/hooks/use-director-chat.ts | 80/89 | as any × 2 |
| features/video/hooks/use-video-result.ts | 48 | as unknown as |
| services/mock/fixtures/video-pipeline.ts | 23/24/25/54/55/318 | as unknown as × 6 |
| features/profile/api/profile-api.ts | 119 | as unknown |
| lib/type-guards.ts | 109 | as unknown |

**openmaic 8 处集中在类型不匹配**（Scene.content / AgentProfile）— P0 类型精确化

---

## 8. mock vs runtime adapter 一致性

VideoTaskAdapter / VideoResultAdapter mock 与 real 路径返回值结构对齐 ✅，无隐蔽差异。

---

## 9. i18n 资源问题

资源 8 文件，所有 t('xx.yy') 代码引用都有定义；zh-cn / en-us 翻译完整。

**轻微问题**: entry-page-content.ts 1,495 行过大，建议拆为 landing/entry/common 三个子资源。

---

## 10. 测试覆盖空洞

| Feature | 测试 | 关键无覆盖 |
|---|---|---|
| auth | 4 | ✅ 优秀 |
| video | 9 | ✅ 优秀 |
| home | 4 | ✅ 良好 |
| profile | 3 | ⚠️ profile-preferences/intro 无测试 |
| classroom | 1 | ⚠️ classroom-input-page 无测试 |
| **learning-center** | **0** | ❌ favorites/history/activity |
| **learning-coach** | **0** | ❌ assessment(856L)/path(586L)/quiz |
| **openmaic** | **0** | ❌ classroom/stage/scene-renderers + as any 集中区无类型测试 |

---

## 优先级清单

### P0 立即处理（< 30 min，0 风险）
1. 拆 entry-page-content.ts (1495) → landing/entry-nav/common 三文件
2. mock fixtures video-pipeline.ts 6 处 `as unknown as` → 验证函数（zod/guard）

### P1 与 Wave 1 同期
1. video-input-card.tsx (678) 拆 Form/Validator/PromptArea（2-3 天）
2. learning-assessment-page.tsx (856) 拆 QuestionList/SubmitPanel/ReviewView（2-3 天）
3. video feature 样式统一（SCSS namespace 协议或迁 Tailwind）
4. 创建共享 components/states/{LoadingState,EmptyState}.tsx

### P2 独立技术债
1. openmaic Scene.content 精确联合类型 + AgentProfile 强制验证（清理 8 处 as any）
2. learning-coach 核心路径测试（assessment/path/quiz，70%+ 覆盖，3-5 天）
3. openmaic classroom 测试（agents 配置 + scene 转换，3 天）
4. learning-center 列表/搜索测试（2 天）

---

## 总结

| 维度 | 评估 |
|---|---|
| typecheck | ✅ 零错误 |
| adapter 一致性 | ✅ mock 与 real 无差异 |
| 超长文件 | ⚠️ 10 个 500+，3 个需拆 |
| 样式混用 | ⚠️ video feature SCSS 占 57%，部分页面混 Tailwind |
| **测试覆盖** | ❌ learning-coach/openmaic/learning-center 全无（1500+ 行无保障）|
| **openmaic 防御** | ❌ 8 处 as any 集中在 Scene/Agent，需精确化 |
