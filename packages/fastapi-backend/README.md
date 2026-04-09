# FastAPI Backend

小麦项目的 FastAPI 后端，负责统一任务运行态、视频与课堂任务元数据、伴学 / 知识检索长期记录，以及学习结果持久化的防腐层接入。

## 技术栈

- FastAPI
- Pydantic v2
- Dramatiq + Redis
- HTTPX
- Pytest

## 当前状态

- 已落地统一任务恢复链路：`/api/v1/tasks/{task_id}/status|events`。
- `video` 与 `classroom` 已落地任务元数据写入、查询、回放，以及模块级恢复包装路由。
- `companion`、`knowledge`、`learning` 已落地对 RuoYi 防腐层的持久化接口与测试覆盖。
- 已落地 FastAPI 统一认证代理：`/api/v1/auth/login|logout|me|code|register/enabled|binding/*`。
- 共享结构已收敛到 `app/shared/`，避免 feature 之间直接反向依赖。

## 关键边界

- `app/shared/task_metadata.py`
  - 视频 / 课堂共享的任务元数据模型、仓库与 RuoYi 字段映射。
- `app/shared/task_metadata_service.py`
  - 视频 / 课堂共享的任务元数据服务基类。
- `app/shared/long_term_records.py`
  - 伴学 / 知识检索共享的长期记录模型与 RuoYi 转换逻辑。
- `app/api/routes/tasks.py`
  - 统一任务恢复、SSE 事件补发与状态查询入口。
- `app/features/*/routes.py`
  - feature 路由层只做编排，通过 FastAPI dependency provider 装配 service，不再直接依赖模块级全局单例替身。

## 目录结构

```text
packages/fastapi-backend/
├── app/
│   ├── api/
│   ├── core/
│   ├── infra/
│   ├── providers/
│   ├── features/
│   ├── shared/
│   │   ├── long_term_records.py
│   │   ├── task_metadata.py
│   │   └── task_metadata_service.py
│   └── main.py
├── tests/
│   ├── api/
│   ├── contracts/
│   ├── integration/
│   ├── unit/
│   └── conftest.py
├── .env.example
└── pyproject.toml
```

## 本地开发

```bash
cd /path/to/Prorise_ai_teach_workspace
pnpm setup:fastapi-backend
cp packages/fastapi-backend/.env.example packages/fastapi-backend/.env.defaults
cp packages/fastapi-backend/.env.local.example packages/fastapi-backend/.env.local
pnpm dev:fastapi-backend
```

启动后可访问：

- `GET http://localhost:8090/`
- `GET http://localhost:8090/health`
- `GET http://localhost:8090/api/v1/tasks/{task_id}/status`
- `GET http://localhost:8090/api/v1/tasks/{task_id}/events`
- `POST http://localhost:8090/api/v1/auth/login`
- `GET http://localhost:8090/api/v1/auth/me`
- `GET http://localhost:8090/api/v1/video/bootstrap`
- `GET http://localhost:8090/api/v1/classroom/bootstrap`
- `GET http://localhost:8090/api/v1/companion/bootstrap`
- `GET http://localhost:8090/api/v1/knowledge/bootstrap`
- `GET http://localhost:8090/api/v1/learning/bootstrap`

## 测试

```bash
cd /path/to/Prorise_ai_teach_workspace
pnpm test:fastapi-backend
```

也可以直接运行后端虚拟环境中的 `pytest`：

```bash
packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests
```

按分层执行时可使用：

```bash
pnpm test:fastapi-backend:api
pnpm test:fastapi-backend:integration
pnpm test:fastapi-backend:unit
```

## 环境变量

- `FASTAPI_APP_NAME`：应用名称
- `FASTAPI_ENV`：运行环境，支持 `development / staging / production / test`
- `FASTAPI_HOST`：监听地址，默认 `0.0.0.0`
- `FASTAPI_PORT`：监听端口，默认 `8090`
- `FASTAPI_RELOAD`：是否开启热更新，默认 `true`
- `FASTAPI_API_V1_PREFIX`：统一 API 前缀
- `FASTAPI_REDIS_URL`：运行时状态缓存地址
- `FASTAPI_RUOYI_BASE_URL`：RuoYi 防腐层基地址
- `FASTAPI_RUOYI_TIMEOUT_SECONDS`：FastAPI 调用 RuoYi 的单次超时秒数
- `FASTAPI_RUOYI_RETRY_ATTEMPTS`：FastAPI 调用 RuoYi 的最大重试次数
- `FASTAPI_RUOYI_RETRY_DELAY_SECONDS`：FastAPI 调用 RuoYi 的重试退避秒数
- `FASTAPI_RUOYI_ENCRYPT_ENABLED`：FastAPI auth 代理是否启用 RuoYi 认证加密协议
- `FASTAPI_RUOYI_ENCRYPT_HEADER_FLAG`：RuoYi 认证加密请求头名称
- `FASTAPI_RUOYI_ENCRYPT_PUBLIC_KEY`：FastAPI 调用 RuoYi 登录/注册时使用的认证公钥
- `FASTAPI_RUOYI_ENCRYPT_PRIVATE_KEY`：FastAPI 解析 RuoYi 登录/注册响应时使用的认证私钥
- `FASTAPI_PROVIDER_RUNTIME_SOURCE`：Provider 运行时配置来源，支持 `settings / ruoyi`
- `FASTAPI_COS_BASE_URL`：对象存储占位基地址
- `FASTAPI_DEFAULT_LLM_PROVIDER`：默认 LLM provider 标识
- `FASTAPI_DEFAULT_TTS_PROVIDER`：默认 TTS provider 标识

FastAPI 会按以下顺序加载配置文件，越靠后优先级越高：

1. `.env.defaults`
2. `.env.<FASTAPI_ENV>`
3. 开发与测试环境额外加载 `.env.<FASTAPI_ENV>.local`
4. 开发与测试环境额外加载 `.env.local`

约束：

- 部署环境必须通过进程环境变量显式设置 `FASTAPI_ENV=staging|production`。
- 业务 RuoYi 调用只接受显式请求鉴权；禁止把 token 写进 `.env` 或本地 token 文件后再由 FastAPI 进程偷读。
- student-web 的认证主链现在统一走 FastAPI `/api/v1/auth/*`，FastAPI 再代理到 RuoYi；RuoYi 仍是认证事实源，FastAPI 不是第二套账号系统。
- `FASTAPI_PROVIDER_RUNTIME_SOURCE=ruoyi` 仅在当前请求或任务运行态带着显式用户鉴权时才会回源到 RuoYi；缺鉴权时自动回落到 settings provider 配置。
- `GET /api/v1/video/published` 现在属于“登录态发现区”接口，依赖当前用户 Bearer token，不再走匿名服务 token。

## 维护说明

- 认证与权限仍由 `RuoYi` 承接，FastAPI 侧负责统一 auth proxy、会话探测与任务接口保护。
- 视频异步 worker 会把创建任务时的当前用户鉴权短暂写入 Redis 运行态，仅用于该任务的 provider runtime 查询与写回；任务结束后会清理，不再依赖进程级 service token。
- 新增 feature 时，优先评估是否应落到 `app/shared/`，不要把跨 feature 的模型或映射继续堆在单个 feature 目录里。
- route 层测试请优先用 `app.dependency_overrides[...]` 替换 service provider，不要再 monkeypatch 模块级全局变量。
- 结构审查与本轮收敛说明见 `docs/01开发人员手册/009-里程碑与进度/0014-fastapi-backend-结构审查与收敛说明-20260406.md`。
