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
