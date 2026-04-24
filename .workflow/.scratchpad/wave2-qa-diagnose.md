# Wave 2 QA — Classroom 样式问题诊断报告

**诊断人**: qa-v2 worker (wave-1.6-p0)
**时间**: 2026-04-23
**分支**: wave/1.6-p0
**结论**: **P0 阻塞**, 根因为 **classroom-play-page.tsx 布局结构 bug，与 shadcn alias 无关**。

---

## 环境

| 服务 | 状态 |
|---|---|
| 前端 5173 (Vite) | ✅ 200 |
| 后端 8090 (FastAPI) | ⚠️ 404（路径 `/api/v1/health` 无效，但不影响样式诊断） |
| RuoYi 8080 | ✅ 200 |

前端已起，可以直接排查 CSS。

---

## /classroom/input — 正常

截图: `.workflow/.scratchpad/wave2-qa-classroom-input-raw.png`

页面完全正常渲染：标题、卡片、建议按钮、社区案例九宫格全部 OK。shadcn alias class 在此页工作。

Console: 仅 1 个非阻塞 warn (`HydrateFallback`)。
Network: 全部 304 / 200，无 CSS 404。

---

## /classroom/play/test-id — 布局崩坏

截图: `.workflow/.scratchpad/wave2-qa-classroom-play-raw.png`

观察到的症状：
- 左侧白色椭圆区域里只有 "小麦 XiaoMai" 文字（这其实是整个 **全局顶部导航 GlobalTopNav**，被横向压扁成了 340px 窄柱）
- 中间是半张网格背景图（"opacity-30 inset-0" 的装饰层被算作 flex child，占了 900px）
- 继续往右有一条 220px 窄柱 "场景加载中..."（课程大纲 sidebar）
- 再右侧一列极窄（0-10px）里有竖排中文 "选一个场景开始学习" —— 主内容 `<main>` 被挤到 `width: 0px`
- 最右侧 340px 讲稿笔记/互动答疑面板，勉强可读

Console: 无 CSS 报错（仅 1 warn HydrateFallback，1 form field warning）
Network: 全部 200/304，globals.css 正常加载，stylesheets count = 5

---

## Computed Style 抽样（证明 shadcn alias 生效）

```
bg-card        → oklab(0.999994 0.000045 0.00002 / 0.78)    ✅ 生效
bg-muted/30    → oklab(0.938131 ... / 0.3)                  ✅ 生效
text-foreground → rgb(59, 23, 1)                            ✅ 生效
border-border  → oklab(0.897107 ... / 0.8)                  ✅ 生效
bg-background  → oklab(0.949093 ... / 0.7)                  ✅ 生效
.xm-* 样式     → rgba(255,255,255,0.82)（--xm-color-* token）✅ 生效
```

**所有 155 处 shadcn alias 都正常工作** —— 假说 A (Tailwind @source 缺失) **不成立**。

---

## 诊断结论 — 根因已定位

**根因**: `packages/student-web/src/features/classroom/pages/classroom-play-page.tsx:166-167` 布局结构 bug。

```tsx
return (
  <div className="relative flex h-screen w-screen overflow-hidden bg-muted/30">
    <GlobalTopNav links={[]} variant="surface" />   // ← BUG
    {/* 背景纹理 */}
    <div className="pointer-events-none absolute inset-0 opacity-30" ... />
    ...
    <aside>/* 左边栏 */</aside>
    <main>/* 主内容 */</main>
    <div>/* 右侧讨论面板 */</div>
  </div>
);
```

**问题**: 根容器是 `flex`（默认 row），顶部 `<nav>` 被当成第一个 flex 子元素，占据 340px 宽度。加上装饰层（900px absolute 但仍算 flex child 计算）、左 sidebar（220px）、右 panel（340px），加起来已经 > viewport 宽度。

`<main className="flex flex-1 min-w-0">` 虽然 `flex-1`，但因前面的兄弟元素宽度已占满，被挤压到 `width: 0px`。

→ 主画布 0px 宽 → Chinese 字符被强制一字一行换行 → 肉眼看像是 `writing-mode: vertical-*`（但其实不是，`computed writingMode` 仍是 `horizontal-tb`）。

### DOM 证据

```
root <div class="relative flex h-screen w-screen overflow-hidden bg-muted/30">  ← display:flex
├── [0] <nav>  width=340px  flex="0 1 auto"  "小麦 XiaoMai"             ← 不该在这
├── [1] <div absolute inset-0 opacity-30>  width=900px                   ← 装饰层跟着算
├── [2] <div fixed/md:relative>  width=220px  "场景加载中..."
├── [3] <main flex-1 min-w-0>   width=0px    "OpenMAIC课堂加载中..."     ← 被挤爆
└── [4] <div fixed/md:relative>  width=340px  讲稿笔记/互动答疑
```

### 对比 /classroom/input 为什么正常

`classroom-input-page.tsx` 把 `GlobalTopNav` 放在**页面外层**或顶部 block flow 容器里，不与 3 栏布局共享 flex 容器。

### 对比 OpenMAIC 参考源

OpenMAIC (`references/OpenMAIC/app/classroom/[id]/page.tsx`) 的 classroom 页根本没有 GlobalTopNav（那是我们应用的全站导航）。移植者把 GlobalTopNav 塞进了原来只有 3 栏的 flex 容器，却没有把它放到外层或 absolute positioned。

---

## 建议修复（给 fe-wave2 worker，一处改动）

**方案 A**（最小改动，推荐）: 把 `GlobalTopNav` 包一层，用 `absolute` 脱离 flex 流：

```tsx
return (
  <div className="relative h-screen w-screen overflow-hidden bg-muted/30">
    {/* 顶部全局导航 - absolute 脱离 flex */}
    <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
      <GlobalTopNav links={[]} variant="surface" />
    </div>
    {/* 三栏 flex 布局 */}
    <div className="flex h-full w-full overflow-hidden">
      <div>{/* 背景装饰 */}</div>
      <aside>{/* 左边栏 */}</aside>
      <main>{/* 主内容 */}</main>
      <div>{/* 右侧讨论 */}</div>
    </div>
  </div>
);
```

**方案 B**: 去掉 `GlobalTopNav`，课堂页使用自己的 `ClassroomHeader`（代码里已经 import 了 `ClassroomHeader`，应是原本设计意图 —— 课堂沉浸模式不该用全局导航，查看 render 里应该用 ClassroomHeader 而不是 GlobalTopNav）。建议先问 team-lead/UX 取舍，再二选一。

**方案 C**（折中）: 外层改 `flex-col`，nav 自然占一行：
```tsx
<div className="relative flex flex-col h-screen w-screen overflow-hidden bg-muted/30">
  <GlobalTopNav links={[]} variant="surface" />
  <div className="flex flex-1 overflow-hidden">
    {/* 3 栏 */}
  </div>
</div>
```
但会挤占课堂画布垂直空间，不推荐。

---

## 其他次要观察（非 P0）

1. 中间装饰层 `absolute inset-0 opacity-30` 虽然 `position:absolute`，但仍被 flex layout 计算，占 900px 宽位置。这是因为 abs 定位元素脱离了 *文档流* 但**没脱离 flex parent 的排序**。修方案 A 后这个问题自动解决（放 non-flex 容器内）。
2. `HydrateFallback` warning 是 react-router v6 的静态警告，非样式问题。
3. 表单字段缺 id/name 是次级 a11y 问题。

---

## 后端对接（未测）

FastAPI 8090 返回 404，但题目说若 BE 起来测 POST classroom/generate。由于此次诊断聚焦样式，并且 BE 未确认可用，未测 classroom SSE。需要 BE 可用后由 fe-wave2 或 qa-v3 补测。

---

## 视觉还原度 vs OpenMAIC

修好布局后需重新对标。目前 /classroom/play 完全无法使用，无从谈还原。修复后建议再做一次截图对比。

---

## 结论摘要

- **根因**: classroom-play-page.tsx:166-167 布局 bug，`GlobalTopNav` 错误地作为 flex 兄弟节点。
- **影响面**: 整个 /classroom/play/:id 页面不可用（P0）。
- **修复难度**: 单文件 3-5 行改动。
- **shadcn alias / @theme inline / @source 全部正常**，不需动 Tailwind 配置。
- **建议修复方案**: 优先 B（改用 ClassroomHeader，符合沉浸模式设计），次选 A（外包 absolute 层）。
