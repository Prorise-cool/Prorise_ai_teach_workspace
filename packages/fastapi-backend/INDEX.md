# Directory Index

## Files

- **[README.md](./README.md)** - FastAPI + LangGraph AI 教学视频后端说明
- **[pyproject.toml](./pyproject.toml)** - FastAPI 最小依赖与 pytest 配置
- **[.env.example](./.env.example)** - FastAPI 本地环境变量示例
- **[run_dev.py](./run_dev.py)** - 读取 package 内 `.env` 的本地启动入口

## Subdirectories

### app/

- **[main.py](./app/main.py)** - FastAPI 应用入口与应用工厂
- **[api/](./app/api/)** - 健康检查与 `api/v1` 路由聚合
- **[core/](./app/core/)** - 配置、安全、生命周期、错误处理与 SSE 模型
- **[infra/](./app/infra/)** - HTTP 抽象、运行时状态与 SSE broker
- **[providers/](./app/providers/)** - LLM / TTS Provider 协议与工厂
- **[features/](./app/features/)** - `video / classroom / companion / knowledge / learning` 骨架
- **[shared/](./app/shared/)** - 防腐层客户端、Agent 配置与统一任务框架

### tests/

- **[test_health.py](./tests/test_health.py)** - 最小健康检查与根路由测试
- **[test_bootstrap_routes.py](./tests/test_bootstrap_routes.py)** - `api/v1` 功能域骨架路由测试
