# Directory Index: packages

> 主代码工作区。实际功能开发、联调与测试优先在这里进行。

## Files

暂无根目录文件。

## Main Development Packages

### student-web/

- **[README.md](./student-web/README.md)** - 学生端 React 19 应用说明
- **[package.json](./student-web/package.json)** - 学生端脚本与依赖配置
- **[src/](./student-web/src/)** - 学生端源码骨架，包含 app、features、services、stores、styles 与 test

### fastapi-backend/

- **[INDEX.md](./fastapi-backend/INDEX.md)** - FastAPI 后端目录入口
- **[README.md](./fastapi-backend/README.md)** - AI 教学视频后端说明

## Integration Bases

### RuoYi-Vue-Plus-5.X/

- **[INDEX.md](./RuoYi-Vue-Plus-5.X/INDEX.md)** - Java 管理后台结构索引
- **[README.md](./RuoYi-Vue-Plus-5.X/README.md)** - Spring Boot 管理后端基座说明

### ruoyi-plus-soybean/

- **[README.md](./ruoyi-plus-soybean/README.md)** - Soybean 管理前端说明
- **[packages/](./ruoyi-plus-soybean/packages/)** - 管理端内部共享包集合（已纳入根 pnpm workspace）

## Usage Rules

- 新业务代码优先落在 `student-web/` 与 `fastapi-backend/`。
- 管理后台相关能力通过 `RuoYi-Vue-Plus-5.X/` 与 `ruoyi-plus-soybean/` 对接或迁移。
- 不把学生端页面直接开发到管理端基座中。

fastapi-backend
├─ app
│  ├─ __pycache__
│  │  ├─ __init__.cpython-313.pyc
│  │  └─ main.cpython-313.pyc
│  ├─ api
│  │  ├─ __pycache__
│  │  │  ├─ __init__.cpython-313.pyc
│  │  │  └─ router.cpython-313.pyc
│  │  ├─ routes
│  │  │  ├─ __pycache__
│  │  │  │  ├─ __init__.cpython-313.pyc
│  │  │  │  └─ health.cpython-313.pyc
│  │  │  ├─ __init__.py
│  │  │  └─ health.py
│  │  ├─ __init__.py
│  │  └─ router.py
│  ├─ core
│  │  ├─ __pycache__
│  │  │  ├─ __init__.cpython-313.pyc
│  │  │  ├─ config.cpython-313.pyc
│  │  │  ├─ errors.cpython-313.pyc
│  │  │  ├─ lifespan.cpython-313.pyc
│  │  │  ├─ logging.cpython-313.pyc
│  │  │  └─ sse.cpython-313.pyc
│  │  ├─ __init__.py
│  │  ├─ config.py
│  │  ├─ errors.py
│  │  ├─ lifespan.py
│  │  ├─ logging.py
│  │  ├─ security.py
│  │  └─ sse.py
│  ├─ features
│  │  ├─ __pycache__
│  │  │  ├─ __init__.cpython-313.pyc
│  │  │  └─ common.cpython-313.pyc
│  │  ├─ classroom
│  │  │  ├─ __pycache__
│  │  │  │  ├─ __init__.cpython-313.pyc
│  │  │  │  ├─ routes.cpython-313.pyc
│  │  │  │  ├─ schemas.cpython-313.pyc
│  │  │  │  └─ service.cpython-313.pyc
│  │  │  ├─ __init__.py
│  │  │  ├─ routes.py
│  │  │  ├─ schemas.py
│  │  │  └─ service.py
│  │  ├─ companion
│  │  │  ├─ __pycache__
│  │  │  │  ├─ __init__.cpython-313.pyc
│  │  │  │  ├─ routes.cpython-313.pyc
│  │  │  │  ├─ schemas.cpython-313.pyc
│  │  │  │  └─ service.cpython-313.pyc
│  │  │  ├─ context_adapter
│  │  │  │  ├─ __init__.py
│  │  │  │  ├─ classroom_adapter.py
│  │  │  │  └─ video_adapter.py
│  │  │  ├─ whiteboard
│  │  │  │  ├─ __init__.py
│  │  │  │  ├─ action_schema.py
│  │  │  │  └─ renderer.py
│  │  │  ├─ __init__.py
│  │  │  ├─ routes.py
│  │  │  ├─ schemas.py
│  │  │  └─ service.py
│  │  ├─ knowledge
│  │  │  ├─ __pycache__
│  │  │  │  ├─ __init__.cpython-313.pyc
│  │  │  │  ├─ routes.cpython-313.pyc
│  │  │  │  ├─ schemas.cpython-313.pyc
│  │  │  │  └─ service.cpython-313.pyc
│  │  │  ├─ __init__.py
│  │  │  ├─ routes.py
│  │  │  ├─ schemas.py
│  │  │  └─ service.py
│  │  ├─ learning
│  │  │  ├─ __pycache__
│  │  │  │  ├─ __init__.cpython-313.pyc
│  │  │  │  ├─ routes.cpython-313.pyc
│  │  │  │  ├─ schemas.cpython-313.pyc
│  │  │  │  └─ service.cpython-313.pyc
│  │  │  ├─ __init__.py
│  │  │  ├─ routes.py
│  │  │  ├─ schemas.py
│  │  │  └─ service.py
│  │  ├─ video
│  │  │  ├─ __pycache__
│  │  │  │  ├─ __init__.cpython-313.pyc
│  │  │  │  ├─ routes.cpython-313.pyc
│  │  │  │  ├─ schemas.cpython-313.pyc
│  │  │  │  └─ service.cpython-313.pyc
│  │  │  ├─ __init__.py
│  │  │  ├─ routes.py
│  │  │  ├─ schemas.py
│  │  │  └─ service.py
│  │  ├─ __init__.py
│  │  └─ common.py
│  ├─ infra
│  │  ├─ __pycache__
│  │  │  ├─ __init__.cpython-313.pyc
│  │  │  ├─ redis_client.cpython-313.pyc
│  │  │  └─ sse_broker.cpython-313.pyc
│  │  ├─ http
│  │  │  ├─ __init__.py
│  │  │  ├─ httpx_client.py
│  │  │  ├─ protocols.py
│  │  │  └─ retry.py
│  │  ├─ __init__.py
│  │  ├─ redis_client.py
│  │  └─ sse_broker.py
│  ├─ providers
│  │  ├─ llm
│  │  │  ├─ __init__.py
│  │  │  ├─ factory.py
│  │  │  └─ stub_provider.py
│  │  ├─ tts
│  │  │  ├─ __init__.py
│  │  │  ├─ factory.py
│  │  │  └─ stub_provider.py
│  │  ├─ __init__.py
│  │  └─ protocols.py
│  ├─ shared
│  │  ├─ task_framework
│  │  │  ├─ __init__.py
│  │  │  ├─ base.py
│  │  │  ├─ context.py
│  │  │  ├─ events.py
│  │  │  ├─ scheduler.py
│  │  │  └─ status.py
│  │  ├─ __init__.py
│  │  ├─ agent_config.py
│  │  ├─ cos_client.py
│  │  ├─ ruoyi_client.py
│  │  └─ tencent_adp.py
│  ├─ __init__.py
│  └─ main.py
├─ prorise_fastapi_backend.egg-info
│  ├─ PKG-INFO
│  ├─ SOURCES.txt
│  ├─ dependency_links.txt
│  ├─ requires.txt
│  └─ top_level.txt
├─ tests
│  ├─ __pycache__
│  │  ├─ test_bootstrap_routes.cpython-313-pytest-8.4.2.pyc
│  │  └─ test_health.cpython-313-pytest-8.4.2.pyc
│  ├─ test_bootstrap_routes.py
│  └─ test_health.py
├─ INDEX.md
├─ README.md
└─ pyproject.toml
