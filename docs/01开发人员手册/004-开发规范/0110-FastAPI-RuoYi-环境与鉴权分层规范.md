# FastAPI RuoYi 环境与鉴权分层规范

## 适用范围

- `packages/fastapi-backend/`
- FastAPI 与 RuoYi 的所有 HTTP 集成链路
- 本地联调、预发部署、生产部署与 worker 运行时

## 核心规则

1. 不再把 RuoYi `access_token` 当成通用环境变量塞进 dotenv。
2. 旧 `.env` 方案已彻底废弃；必须按正式环境分层，不再保留兼容入口。
3. 任何需要匿名回源或后台回源的链路，必须显式声明“服务级鉴权”来源，不能靠 `from_settings()` 偷带 token。
4. 用户请求发起的 RuoYi 调用，默认走请求态 token 透传；后台 worker 不再缓存用户 token，统一走显式服务级鉴权。
5. 公开列表、匿名回源这类没有用户请求上下文的链路，必须显式使用服务级鉴权文件或明确报错，不允许隐式降级为“随便拿一个全局 token 顶上”。

## 推荐 env 结构

```text
packages/fastapi-backend/
├── .env.example                # 通用默认模板
├── .env.defaults               # 非敏感共享默认值（本地自建，不入库）
├── .env.local                  # 本地联调覆盖（不入库）
├── .env.staging                # 预发覆盖（不入库）
├── .env.production             # 生产覆盖（不入库）
└── .secrets/
    └── ruoyi-service.token     # 本地服务级 token 文件（不入库）
```

## FastAPI 加载顺序

FastAPI 当前按以下顺序加载配置，越靠后优先级越高：

1. `.env.defaults`
2. `.env`，仅兼容旧方案
3. `.env.<FASTAPI_ENV>`
4. `.env.<FASTAPI_ENV>.local`，仅 `development / test`
5. `.env.local`，仅 `development / test`
6. `FASTAPI_ENV_FILE` 指向的额外文件，仅兼容旧方案

说明：

- `.env` 与 `FASTAPI_ENV_FILE` 仍保留兼容读取能力，但新配置不应继续依赖这两个入口。
- 推荐本地把 `FASTAPI_ENV` 固定为 `development`，部署环境通过进程环境变量显式设置 `staging` / `production`。
- 预发与生产不自动加载 `.env.local`，避免把开发机覆盖项带入非本地环境。

## 鉴权策略

### 用户请求链路

- 来源：`Authorization: Bearer <user-token>`
- 适用：`/video/tasks/*`、`/classroom/*`、`/companion/*`、`/knowledge/*`、`/learning/*`
- 要求：通过 `AccessContext` 或显式 `RuoYiRequestAuth` 透传，不允许依赖默认全局 token

### Worker 链路

- 来源：`FASTAPI_RUOYI_SERVICE_AUTH_MODE=token_file`
- 适用：视频流水线 Provider runtime 查询、任务元数据写回、产物图谱写回等后台异步链路
- 要求：worker 不再把用户 token 缓存进 Redis 运行态；如未配置服务级鉴权，应显式告警并按链路能力降级

### 服务级回源链路

- 来源：`FASTAPI_RUOYI_SERVICE_AUTH_MODE=token_file`
- 适用：无用户上下文但需要读取 RuoYi 的公开列表、匿名补数等场景
- 要求：token 必须来自未入库文件，例如 `.secrets/ruoyi-service.token` 或容器挂载 secret
- 文件格式：支持纯 JWT 字符串、`{"access_token":"...", "client_id":"..."}` 形式 JSON，或完整的 RuoYi 登录响应信封

## 禁止事项

- 禁止新增 `FASTAPI_RUOYI_ACCESS_TOKEN` 一类“拿来就塞”的全局 token 配置。
- 禁止在 `RuoYiClient.from_settings()` 中恢复默认鉴权头。
- 禁止在 service / repository / worker 中省略鉴权参数后自动偷用服务 token。
- 禁止把一次性调试 token、抓包结果、临时 secret 文件提交进仓库。

## 调试建议

1. 先确认当前链路到底属于“用户态透传”还是“服务级回源”。
2. 需要本地服务级回源时，把临时 token 写进 `.secrets/ruoyi-service.token`，不要回填到 `.env.local`。
3. 如果某个链路没有用户态也没有服务级鉴权配置，应显式报错并修正设计，而不是临时继续偷全局 token。
