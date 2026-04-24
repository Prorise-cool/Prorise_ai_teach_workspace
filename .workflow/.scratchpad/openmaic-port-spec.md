# OpenMAIC → 课堂结果页 一比一移植规范

> 本文件是 3 个并行实施团队的共享 SSOT。所有移植决策以此为准。

## 任务目标

把 `classroom-play-page` 视觉效果完全替换为 OpenMAIC 课堂详情页的实现。
- ✅ 复制：布局、字体、圆角、阴影、模糊、动画、间距、组件层级
- ❌ 不复制：色彩 token（OpenMAIC 是紫色系，我们是琥珀金，按下方映射表替换）

## 参考材料

- **OpenMAIC 完整分析（含代码片段）**: `/tmp/openmaic-analysis.md`
- **OpenMAIC 源码根**: `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/references/OpenMAIC/`
  - 主页面: `app/classroom/[id]/page.tsx`
  - 主舞台: `components/stage.tsx` (1240 行)
  - 头部: `components/header.tsx`
  - 画布: `components/canvas/canvas-area.tsx`, `components/canvas/canvas-toolbar.tsx`
  - 圆桌（底部互动区）: `components/roundtable/index.tsx`, `components/roundtable/audio-indicator.tsx`
  - 左侧场景大纲: `components/stage/scene-sidebar.tsx`
  - 右侧聊天: `components/chat/chat-area.tsx`
  - 全局样式: `app/globals.css` (210 行，含全部 @keyframes)
- **我们的代码根**: `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/packages/student-web/src/`

## 文件归属（严格遵守，禁止越界）

### Team 1 (Shell + Sidebar)
- `packages/student-web/src/styles/globals.css`（**只在文件末尾追加 @keyframes 与 @utility，不动 @theme 块和现有 :root 变量**）
- `packages/student-web/src/features/classroom/pages/classroom-play-page.tsx`
- `packages/student-web/src/features/classroom/components/classroom-header.tsx`
- `packages/student-web/src/features/classroom/components/stage/scene-sidebar.tsx`

### Team 2 (Canvas + Stage + Bottom Bar)
- `packages/student-web/src/features/classroom/components/stage.tsx`
- `packages/student-web/src/features/classroom/components/canvas/canvas-area.tsx`
- `packages/student-web/src/features/classroom/components/canvas/canvas-toolbar.tsx`
- `packages/student-web/src/features/classroom/components/stage/stage-bottom-bar.tsx`（OpenMAIC `Roundtable` 的对应位置）

### Team 3 (Chat + Agent)
- `packages/student-web/src/features/classroom/components/chat/chat-area.tsx`
- `packages/student-web/src/features/classroom/components/chat/message-list.tsx`
- `packages/student-web/src/features/classroom/components/chat/lecture-notes-view.tsx`
- `packages/student-web/src/features/classroom/components/agent/agent-bubble.tsx`
- `packages/student-web/src/features/classroom/components/agent/agent-avatar.tsx`
- `packages/student-web/src/features/classroom/components/agent/audio-indicator.tsx`（**新建文件**，对应 OpenMAIC `roundtable/audio-indicator.tsx`）

> 🚫 任何团队都不得修改 `theme.css`、`@theme` 块、`tailwind.config.*`、`package.json`、router 配置、store、hooks 接口、i18n key、API adapter。

## 色彩 token 映射（核心，必须遵守）

OpenMAIC 用 `purple/gray/amber` 硬编码颜色。请按下表替换：

### 中性色 / 表面

| OpenMAIC | → 我们的 | 说明 |
|----------|---------|------|
| `bg-white/80 dark:bg-gray-900/80` | `bg-card/80` | 玻璃面板（sidebar/chat） |
| `bg-white/60 dark:bg-gray-800/60` | `bg-card/60` | 头部控制条药丸 |
| `bg-white dark:bg-gray-800` | `bg-card` | 实色卡片（语音泡、幻灯） |
| `bg-gray-50 dark:bg-gray-900` | `bg-background` | 整页底色 / canvas 容器 |
| `bg-gray-50/30 dark:bg-gray-900/30` | `bg-muted/20` | canvas 空闲态 |
| `bg-gray-100/80 dark:bg-gray-800/60` | `bg-accent/60` | hover 表面 |
| `bg-gray-200/90 dark:bg-gray-700/90` | `bg-accent` | 按钮 hover |
| `bg-gray-100 dark:bg-gray-700` | `bg-muted` | 静态灰底 / 标签 |
| `bg-gray-100 dark:bg-gray-800` | `bg-muted` | 同上（缩略图占位） |

### 文本色

| OpenMAIC | → 我们的 |
|----------|---------|
| `text-gray-800 dark:text-gray-200` | `text-foreground` |
| `text-gray-900 dark:text-gray-100` | `text-foreground` |
| `text-gray-700 dark:text-gray-300` | `text-foreground` |
| `text-gray-600 dark:text-gray-300` | `text-muted-foreground` |
| `text-gray-500 dark:text-gray-400` | `text-muted-foreground` |
| `text-gray-400 dark:text-gray-500` | `text-muted-foreground` |
| `text-gray-200 dark:text-gray-700`（水印） | `text-foreground/10` |

### 边框 / Ring

| OpenMAIC | → 我们的 |
|----------|---------|
| `border-gray-100 dark:border-gray-800` | `border-border` |
| `border-gray-100/50 dark:border-gray-700/50` | `border-border/40` |
| `ring-gray-950/5 dark:ring-white/5` | `ring-border/40` |
| `ring-black/[0.04] dark:ring-white/[0.06]` | `ring-border/40` |

### Purple → Primary（OpenMAIC 紫 → 我们的琥珀金）

| OpenMAIC | → 我们的 |
|----------|---------|
| `bg-purple-50 dark:bg-purple-900/20` | `bg-primary/10` |
| `bg-purple-600 dark:bg-purple-500` | `bg-primary` |
| `text-purple-600 dark:text-purple-400` | `text-primary` |
| `text-purple-700 dark:text-purple-300` | `text-primary` |
| `text-white`（在 `bg-purple-*` 上） | `text-primary-foreground` |
| `ring-purple-200 dark:ring-purple-700` | `ring-primary/40` |
| `border-purple-500` | `border-primary` |
| `bg-purple-400/30 dark:bg-purple-600/30` | `bg-primary/30` |
| `bg-purple-500/40 dark:bg-purple-500/40` | `bg-primary/40` |
| `border-t-purple-500 dark:border-t-purple-400` | `border-t-primary` |
| `shadow-purple-500/30` | `shadow-primary/30` |
| `bg-purple-100`（用户消息） | `bg-primary/10`（或保留 `bg-primary text-primary-foreground` 看用户偏好） |

### 蓝色（交互 / 信息）→ Info

| OpenMAIC | → 我们的 |
|----------|---------|
| `bg-blue-50/30 dark:bg-blue-900/10` | `bg-info/5` |
| `border-blue-200 dark:border-blue-700/50` | `border-info/30` |
| `shadow-blue-200/50 dark:shadow-blue-900/50` | `shadow-info/20` |
| `ring-blue-900/5 dark:ring-blue-500/10` | `ring-info/20` |

### 保留语义色（不替换）

以下颜色是 OpenMAIC 用于强调状态的，**保留原样**（视觉一致性 > token 强迫症）：

- 渐变条（Dialog 顶饰）：`bg-gradient-to-r from-amber-400 via-orange-400 to-red-400`
- 警告图标背景：`bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200/50 dark:ring-amber-700/30`
- 错误：`text-red-500 dark:text-red-400`，`bg-red-50 dark:bg-red-900/20`
- 成功：`text-green-500`
- 警告图标主色：`text-amber-500 dark:text-amber-400`

> 我们的 token 已有 `warning/success/error`，可酌情替换以上为 `text-warning/success/destructive`，但**保持视觉一致优先**。如不确定就保留原琥珀色调。

## 必须新增到 globals.css 的 @keyframes（Team 1 任务）

在 `globals.css` 末尾追加（不要破坏现有 `@theme inline` 与 `:root` 块）：

```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes wave {
  0%, 100% { height: 30%; }
  50% { height: 100%; }
}

@keyframes interactive-mode-breathe {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.08); }
}

@keyframes breathing-bar-1 {
  0%, 100% { height: 3px; }
  50% { height: 14px; }
}
@keyframes breathing-bar-2 {
  0%, 100% { height: 6px; }
  50% { height: 14px; }
}
@keyframes breathing-bar-3 {
  0%, 100% { height: 3px; }
  50% { height: 11px; }
}

@utility scrollbar-hide {
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

> 检查：如果上述 @keyframes 或 @utility 已存在，**跳过**，不要重复定义。

## 动画库统一约定

我们已安装 `framer-motion@12.38.0` 和 `motion@12.27.5`。**统一使用 `motion/react` 导入路径**，与 OpenMAIC 一致：

```tsx
import { motion, AnimatePresence } from 'motion/react';
```

## 布局规格速查

### 全页（classroom-play-page.tsx）
- 根：`relative flex h-screen w-screen overflow-hidden bg-background`
- 背景纹理：可保留现有 grid pattern + radial mask（很好看）
- 布局：`sidebar | <main flex-col> { header + stage } | chat`
- 移动端：sidebar/chat 用 `fixed inset-y-0 z-30 transition-transform`，配合 `-translate-x-full` / `translate-x-full` 滑入；遮罩 `bg-black/40 z-20 md:hidden`

### 头部（classroom-header.tsx）
- `flex h-20 shrink-0 items-center justify-between gap-4 px-6 md:px-8 z-10 bg-transparent`
- **关键**：OpenMAIC 头部 **没有 `border-b` 与 `bg-card/60`**！整个头部是透明的，控制按钮独立成一个右侧药丸
- 左侧：菜单按钮 + 课程 label (`text-[10px] uppercase tracking-widest font-bold text-muted-foreground`) + 课程标题 (`text-xl font-bold tracking-tight text-foreground`)
- 右侧药丸：`flex items-center gap-1 rounded-full border border-border/40 bg-card/60 backdrop-blur-md px-2 py-1.5 shadow-sm`
- 药丸内分隔条：`mx-1 h-4 w-px bg-border`
- 药丸内圆按钮：`h-7 w-7 rounded-full text-muted-foreground hover:bg-accent transition-colors`，激活态 `text-primary`

### 左侧 Sidebar（scene-sidebar.tsx）
- 默认 220px，min 170，max 400（拖拽）
- 容器：`bg-card/80 backdrop-blur-xl border-r border-border shadow-[2px_0_24px_rgba(0,0,0,0.02)] flex flex-col shrink-0 z-20 relative overflow-visible`
- 拖拽手柄（右边）：`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 group hover:bg-primary/30 active:bg-primary/40 transition-colors`
- 手柄内指示：`absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-border group-hover:bg-primary transition-colors`
- 顶部 logo 行：`h-10 flex items-center justify-between shrink-0 mt-3 mb-1 px-3`
- 折叠按钮：`w-7 h-7 rounded-lg flex items-center justify-center bg-muted text-muted-foreground ring-1 ring-border/40 hover:bg-accent hover:text-foreground active:scale-90 transition-all duration-200`
- 场景列表：`flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2 scrollbar-hide pt-1`
- 场景项：`group relative rounded-lg transition-all duration-200 cursor-pointer flex flex-col gap-1 p-1.5`
  - 激活：`bg-primary/10 ring-1 ring-primary/40`
  - 未激活：`hover:bg-accent/60`
- 场景头部行：`flex justify-between items-center px-2 pt-0.5`
  - 序号徽章：`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0`
    - 激活：`bg-primary text-primary-foreground shadow-sm shadow-primary/30`
    - 未激活：`bg-muted text-muted-foreground`
  - 标题：`text-xs font-bold truncate transition-colors`
    - 激活：`text-primary`
    - 未激活：`text-muted-foreground group-hover:text-foreground`
- 缩略图：`relative aspect-video w-full rounded overflow-hidden bg-muted ring-1 ring-border/60`

### Stage 容器（stage.tsx）
- `flex h-full flex-col`
- 内含 `<CanvasArea ... />`（flex-1 min-h-0）+ `<StageBottomBar ... />`（shrink-0）

### Canvas（canvas-area.tsx）
- 根：`w-full h-full flex flex-col bg-background group/canvas`
- 中间区：`flex-1 min-h-0 relative overflow-hidden flex items-center justify-center p-2 transition-colors duration-500`
  - interactive 场景：`bg-info/5`
  - 普通场景：`bg-muted/20`
- 幻灯容器：`aspect-[16/9] h-full max-h-full max-w-full bg-card shadow-2xl rounded-lg overflow-hidden relative transition-all duration-700`
  - interactive：`ring-1 ring-info/20 shadow-info/20`
  - 普通：`ring-1 ring-border`
- 场景编号水印（右上角）：`absolute top-4 right-4 text-foreground/10 font-black text-4xl pointer-events-none select-none mix-blend-multiply dark:mix-blend-screen`
- pending overlay（loading）：用 `motion.div` + `AnimatePresence`，`initial={{ opacity: 0 }}` `animate={{ opacity: 1 }}` `exit={{ opacity: 0 }}` `transition={{ duration: 0.4, ease: 'easeOut' }}`
- spinner：`w-12 h-12` 双层圆环，外圈 `border-2 border-muted`，内圈 `border-2 border-transparent border-t-primary animate-spin`
- pending 文本：`motion.span` `initial={{ opacity: 0, y: 4 }}` `animate={{ opacity: 1, y: 0 }}` `transition={{ delay: 0.2, duration: 0.3 }}`
- 失败态：红色图标 + 重试按钮（保留现有）
- play hint button：包在 `motion.div` + `AnimatePresence`，按钮 `w-20 h-20 rounded-full bg-card/95 shadow-[0_4px_30px_rgba(245,197,71,0.18),inset_0_0_0_1px_rgba(245,197,71,0.32)] animate-[pulse_1.6s_ease-in-out_infinite]`
- whiteboard 层：`absolute inset-0 z-[110] pointer-events-none`

### CanvasToolbar
- `shrink-0 h-9 px-2 bg-card/80 backdrop-blur-xl border-t border-border/40`
- 文字：`text-[11px] text-muted-foreground font-medium`
- 按钮 hover：`hover:bg-accent active:scale-90 transition-all duration-150`

### StageBottomBar（OpenMAIC Roundtable 对应位置）
- 整体高度参考 OpenMAIC 的 `h-48`（192px），但我们现有结构（pills + bubble + input）可保留
- 中央语音泡：`relative flex-1 min-w-0 rounded-2xl bg-card shadow-lg border border-border max-h-36 overflow-hidden`
- 泡内容：`overflow-y-auto scrollbar-hide flex flex-col gap-2 p-3 h-full text-sm`
- 教师/学员头像：`w-8 h-8 rounded-full transition-transform duration-200 hover:scale-110`
- 输入区：`flex items-center gap-1.5 px-3 py-2 border-t border-border`
- 输入框：`flex-1 bg-transparent text-sm outline-none`
- 发送/暂停按钮：圆形 primary 按钮

### Chat Area（chat-area.tsx）
- 默认 340px，min 240，max 560（拖拽）
- 容器：`bg-card/80 backdrop-blur-xl border-l border-border shadow-[-2px_0_24px_rgba(0,0,0,0.02)] flex flex-col shrink-0 z-20 relative overflow-visible`
- 拖拽手柄（左边）：`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 group hover:bg-primary/30 active:bg-primary/40 transition-colors`
- Tab 行：`h-10 flex items-center gap-1 shrink-0 mt-3 mb-1 px-3`
- Tab 容器：`flex-1 flex items-center gap-1 rounded-lg bg-muted/60 p-0.5`
- 单 Tab 按钮：`flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-md text-xs font-medium transition-all`
  - 激活：`bg-card text-foreground shadow-sm`
  - 未激活：`text-muted-foreground hover:text-foreground`
- 折叠按钮：与 sidebar 折叠按钮同一规格
- 输入区：`shrink-0 border-t border-border p-3`
- 输入框容器：`flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all`
- 发送按钮：`flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity disabled:opacity-40`

### MessageList
- 用户消息：右对齐，`bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2 text-sm max-w-[80%] shadow-sm`
- AI 消息：左对齐，配头像 + 名字 + `bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[80%]`
- 名字行：`text-[11px] text-muted-foreground mb-1`，颜色用 `style={{ color: agent.color }}`

### AgentBubble + AgentAvatar
- 沿用现有 props 接口（teacher/listeners/text/scene 等）
- 头像：`w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold`
- 头像彩色描边：`ring-2 ring-offset-2 ring-offset-card` + `style={{ ringColor: agent.color }}`（用 inline style 实现动态 ring 颜色，因 agent.color 是 runtime 数据）
- 气泡：`relative flex-1 rounded-2xl border border-border bg-card p-3 text-sm text-foreground shadow-sm`

### AudioIndicator（新建文件）
- 4 根竖条 motion.span，循环 height [4, 10/12, 4]，duration 0.5s（playing）/ 0.8s（generating）
- 颜色：generating 用 `rgba(251, 191, 36, 0.7)`（暖琥珀），playing 用 agent.color
- 完整源码见 `/tmp/openmaic-analysis.md` 第 1106-1149 行

### Post-Class CTA（已在 classroom-play-page.tsx 内，Team 1 微调）
- 沿用现有结构（已 90% 对齐 OpenMAIC dialog 风格）
- 验证 amber 渐变条 + Trophy 图标完好

## 字体 / 圆角 / 阴影速查

### Font sizes
- `text-xl` (20px) — 头部主标题
- `text-base` (16px) — Dialog 标题
- `text-sm` (14px) — Dialog 正文 / 输入框 / 消息
- `text-xs` (12px) — sidebar scene 标题 / lecture 笔记 / chat tab
- `text-[11px]` — 工具栏文本
- `text-[10px]` — header label / scene 序号
- `text-4xl` font-black — canvas 水印

### Font weights
- `font-medium` (500) — 工具栏 label
- `font-bold` (700) — 标题 / sidebar item
- `font-black` (900) — scene 序号 / 水印

### Tracking
- `tracking-widest` — header 课程 label（uppercase 配合）
- `tracking-tight` — 课程标题、品牌名

### Border radius
- `rounded` (~10px) — 缩略图
- `rounded-lg` (~10px) — sidebar item / chat tab / 折叠按钮 / 一般按钮
- `rounded-xl` (~14px) — Dialog 按钮
- `rounded-2xl` (~18px) — Dialog 容器 / 中央语音泡 / chat 消息泡
- `rounded-full` — 圆形按钮 / 头像 / 头部药丸 / 输入框

### Shadows
- `shadow-sm` — 头部药丸、激活的小徽章、消息泡
- `shadow-md` — 下拉菜单
- `shadow-lg` — 中央语音泡
- `shadow-2xl` — Canvas 幻灯片
- `shadow-[2px_0_24px_rgba(0,0,0,0.02)]` — sidebar 右阴影
- `shadow-[-2px_0_24px_rgba(0,0,0,0.02)]` — chat-area 左阴影

### Backdrop blur
- `backdrop-blur-md` (12px) — 头部药丸
- `backdrop-blur-xl` (24px) — sidebar / chat-area / canvas toolbar

### Z-index
- z-0：背景
- z-10：header
- z-20：sidebar / chat / roundtable（演示模式）
- z-30：移动端 sidebar/chat 滑入
- z-50：modal / 下拉
- z-[102]：canvas play hint
- z-[105]：canvas pending overlay
- z-[110]：whiteboard
- z-[9999]：proactive card portal

## 硬约束（HARD CONSTRAINTS）

| 类别 | 约束 |
|------|------|
| 路由 | `/classroom/play/:classroomId` 不变 |
| Store | `useClassroomStore` 字段、action 名全部保留 |
| Hooks | `useScenePlayer / useDirectorChat / useActionPlayer / useClassroomDb` 接口不变 |
| Props | 各组件对外 props 签名不变（父组件调用零修改） |
| i18n | 所有 `t('classroom.*')` / `t('openmaic.*')` key 不变；如需新文案，新增 key 不删旧 key |
| API | `services/api/adapters/classroom-adapter.ts` 不动 |
| 导出 | 各 export 名不变 |
| 依赖 | 只用已安装的库（motion、framer-motion、lucide-react、tailwind v4） |
| 配色 token | `theme.css`、`globals.css` 的 `@theme inline` 与 `:root` 不修改；只允许 Team 1 在 globals.css 末尾追加 @keyframes/@utility |

## 质量门禁

完成后请：
1. 自行 `pnpm --filter @prorise/student-web typecheck` 通过（如可用），失败要反馈
2. 文件行数 < 500 行/文件（OpenMAIC 的 `stage.tsx` 1240 行不要照搬规模，我们的拆分粒度更细）
3. 不留 `console.log` / 调试注释
4. 所有 `motion.div` 配对 `AnimatePresence`（如有 exit 动画）
5. `motion/react` 导入路径统一
6. Tailwind 类合并用 `cn()`（已存在的 helper），避免字符串拼接破坏 Tailwind JIT

## 完成报告格式

每个团队请返回：
1. **修改/新增文件清单**（含行数）
2. **关键 OpenMAIC 模式**（哪些动画、哪些布局结构被移植）
3. **token 替换实例**（举 3-5 个具体例子证明映射正确）
4. **偏离 OpenMAIC 的地方与原因**
5. **typecheck 状态**（pass / fail / not run）
6. **遗留问题或需要其他团队配合的点**
