# Student Web

`packages/student-web/` 是面向学生端的 React 19 + Vite 工程骨架，当前只保留基础设施，不预置业务页面或业务组件。

- `pnpm workspace` 包管理
- `Tailwind CSS v4`
- `vite-plugin-checker` 开发期 TypeScript 检查
- `unplugin-auto-import` 高频 API 自动导入能力
- `@/*`、`~/*` 路径别名
- `ESLint 9 + Vitest + Testing Library` 检查链

## 常用命令

```bash
pnpm --filter @xiaomai/student-web dev
pnpm --filter @xiaomai/student-web typecheck
pnpm --filter @xiaomai/student-web lint
pnpm --filter @xiaomai/student-web test
pnpm --filter @xiaomai/student-web build
```

## 当前保留内容

```text
src/
├── lib/          # 工具函数与环境封装
├── test/         # 测试初始化
├── App.tsx       # 最小应用壳
├── index.css     # 全局样式与 Tailwind 入口
└── main.tsx      # 应用入口
```

## 环境变量

参考 `.env.example`：

- `VITE_APP_TITLE`
- `VITE_RUOYI_BASE_URL`
- `VITE_FASTAPI_BASE_URL`
