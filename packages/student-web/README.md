# Student Web

`packages/student-web/` 是面向学生端的 React 19 + Vite 工程。当前已经落有 Story 1.1 的认证联调验证页、认证对话框、auth store、统一 HTTP client 与基础测试，但它们仍然只是逻辑验证基线，不等于正式首页或正式认证页交付。

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
├── components/auth/  # 登录 / 注册对话框与表单
├── hooks/            # 认证能力选择器
├── lib/              # 环境、接口封装、存储与加密工具
├── pages/home/       # 首页联调验证壳层
├── providers/        # 应用级 provider
├── services/api/     # 统一 HTTP client
├── stores/           # auth store
└── test/             # 认证相关测试的统一镜像目录
```

## 环境变量

参考 `.env.example`：

- `VITE_APP_TITLE`
- `VITE_RUOYI_BASE_URL`
- `VITE_FASTAPI_BASE_URL`

本地联调时建议创建 `packages/student-web/.env.local`，至少显式确认以下配置：

```bash
VITE_RUOYI_BASE_URL=http://localhost:8080
VITE_FASTAPI_BASE_URL=http://localhost:8090
VITE_APP_ENCRYPT=Y
```

如果本地暂时关闭参数加密，请只调整 `VITE_APP_ENCRYPT=N`，不要改动登录 / 注册字段、Bearer token 语义和 `401` 清理逻辑。

## Story 1.1 联调范围

1. 当前 `/` 首页与认证对话框只承担 Story 1.1 的注册 / 登录 / 登出 / rehydrate 闭环验证。
2. 页面中的 Story 说明性文案、调试态提示与 Token 片段展示，会在 Story 1.4 / Story 1.6 的正式页面收口时统一清理。
3. 所有认证相关测试统一写在 `src/test/` 镜像目录，不再向业务目录新增散落的 `*.test.ts(x)`。
