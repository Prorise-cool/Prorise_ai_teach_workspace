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
│   ├── integration/
│   ├── unit/
│   ├── test_bootstrap_routes.py
│   ├── test_health.py
│   └── test_task_recovery_routes.py
├── .env.example
└── pyproject.toml
```

## 本地开发

```bash
cd /path/to/Prorise_ai_teach_workspace
pnpm setup:fastapi-backend
cp packages/fastapi-backend/.env.example packages/fastapi-backend/.env
pnpm dev:fastapi-backend
```

启动后可访问：

- `GET http://localhost:8090/`
- `GET http://localhost:8090/health`
- `GET http://localhost:8090/api/v1/tasks/{task_id}/status`
- `GET http://localhost:8090/api/v1/tasks/{task_id}/events`
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

## 维护说明

- 认证与权限仍由 `RuoYi` 承接，FastAPI 侧负责会话探测与任务接口保护。
- 新增 feature 时，优先评估是否应落到 `app/shared/`，不要把跨 feature 的模型或映射继续堆在单个 feature 目录里。
- route 层测试请优先用 `app.dependency_overrides[...]` 替换 service provider，不要再 monkeypatch 模块级全局变量。
- 结构审查与本轮收敛说明见 `docs/01开发人员手册/009-里程碑与进度/0014-fastapi-backend-结构审查与收敛说明-20260406.md`。
