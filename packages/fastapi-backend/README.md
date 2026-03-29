# FastAPI Backend

基于 FastAPI + LangGraph 的 AI 教学视频生成后端服务。

## 技术栈

- FastAPI
- LangGraph
- Manim
- 多 TTS 支持（豆包/百度/Spark/Kokoro）

## 当前状态

- 当前阶段为 Epic 0 的可启动框架骨架。
- 该目录已冻结 `core / infra / providers / features / shared / task_framework` 基础骨架。
- 当前不包含任何视频、课堂、Companion 或 Learning Coach 业务实现。

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
│   └── main.py
├── tests/
│   ├── test_bootstrap_routes.py
│   └── test_health.py
├── .env.example
└── pyproject.toml
```

## 本地启动

```bash
cd /path/to/Prorise_ai_teach_workspace
pnpm setup:fastapi-backend
cp packages/fastapi-backend/.env.example packages/fastapi-backend/.env
pnpm dev:fastapi-backend
```

启动后可访问：

- `GET http://localhost:8090/`
- `GET http://localhost:8090/health`
- `GET http://localhost:8090/api/v1/video/bootstrap`
- `GET http://localhost:8090/api/v1/classroom/bootstrap`
- `GET http://localhost:8090/api/v1/companion/bootstrap`

## 运行测试

```bash
cd /path/to/Prorise_ai_teach_workspace
pnpm test:fastapi-backend
```

## 环境变量

- `FASTAPI_APP_NAME`：应用名称
- `FASTAPI_ENV`：运行环境，默认 `development`
- `FASTAPI_HOST`：监听地址，默认 `0.0.0.0`
- `FASTAPI_PORT`：监听端口，默认 `8090`
- `FASTAPI_RELOAD`：是否开启热更新，默认 `true`
- `FASTAPI_API_V1_PREFIX`：统一 API 前缀
- `FASTAPI_REDIS_URL`：运行时状态缓存地址
- `FASTAPI_RUOYI_BASE_URL`：RuoYi 防腐层基地址
- `FASTAPI_COS_BASE_URL`：对象存储占位基地址

## 边界说明

- 该骨架用于保证后续 Epic 有稳定目录与启动方式。
- 当前不在这里实现认证逻辑，认证仍由 `RuoYi` 承接。
- 当前只落位统一任务框架、Provider 协议、防腐层客户端与功能域目录。
- 后续业务模块应按架构文档继续落在 `app/features/*` 下。
