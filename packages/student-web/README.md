# `@xiaomai/student-web`

小麦学生端前台基线工程。

当前只完成模板骨架、目录结构、工具链和依赖安装，不包含任何业务功能实现。

## 技术基线

- `React 19`
- `Vite 6`
- `TypeScript`
- `Tailwind CSS v4`
- `shadcn/ui` 配置基线
- `Radix UI`
- `OpenMAIC` 对齐的浏览器能力依赖基线
- `TanStack Query`
- `Zustand`
- `react-router-dom`
- `react-hook-form + zod`
- `react-i18next`
- `Motion`
- `Video.js`
- `KaTeX + Temml`
- `Shiki`
- `Dexie / ECharts / ProseMirror / Sonner / Embla / XYFlow`
- `Vitest + Testing Library`
- `Storybook 8.6.x`
- `Design Tokens + CSS Variables`
- `Fetch-based API Client`

## 目录约定

```text
src/
  app/              应用装配层
  components/       通用组件层
  features/         业务域模块
  services/         API / SSE / mock 基础设施
  stores/           客户端状态
  hooks/            通用 Hook
  lib/              工具函数
  test/             测试初始化
  styles/           全局样式、主题变量与设计令牌
  types/            类型声明
```

### `styles/` 设计令牌结构

```text
styles/
  globals.css       全局样式入口
  theme.css         CSS Variables 桥接层
  tokens/
    base.ts         间距、圆角、层级、模糊
    color.ts        品牌色、语义色、老师局部点缀色、任务态颜色
    typography.ts   字体族、字号、字重、行高
    shadow.ts       阴影体系
    motion.ts       动效时长与缓动
    index.ts        统一导出入口
```

## 手动命令

```bash
pnpm --filter @xiaomai/student-web dev
pnpm --filter @xiaomai/student-web lint
pnpm --filter @xiaomai/student-web typecheck
pnpm --filter @xiaomai/student-web test
pnpm --filter @xiaomai/student-web build
pnpm --filter @xiaomai/student-web storybook
```

## 明确不引入

- `husky`
- `lefthook`
- `lint-staged`
- `release-please`
- `pre-commit` / `pre-push`
- 自动发包脚本

## OpenMAIC 对齐说明

当前模板已补齐一组与 `OpenMAIC` 更接近的浏览器侧依赖基线，便于后续承接：

- 富文本编辑：`prosemirror-*`
- 画布 / 流程图：`@xyflow/react`
- 图表与展示：`echarts`、`embla-carousel-react`
- 本地缓存与导出：`dexie`、`file-saver`、`jszip`、`pptxgenjs`、`pptxtojson`
- 交互增强：`cmdk`、`sonner`、`streamdown`、`use-stick-to-bottom`
- 视觉与色彩：`animate.css`、`tinycolor2`

明确不直接带入：

- `Next.js` 与 `next-themes`
- AI SDK / CopilotKit / LangChain 相关依赖
- 仅服务端 / 原生构建依赖（例如 `sharp`、`@napi-rs/canvas`、`undici`）
