# FastAPI RuoYi 环境与鉴权分层规范

## 适用范围

- `packages/fastapi-backend/`
- FastAPI 与 RuoYi 的所有 HTTP 集成链路
- 本地联调、预发部署、生产部署与 worker 运行时

## 核心规则

1. 不再把 RuoYi `access_token` 当成通用环境变量塞进 dotenv。
2. 旧 `.env` 兼容入口与 `FASTAPI_ENV_FILE` 已彻底废弃；必须按正式环境分层加载。
3. 业务链路禁止再引入 “service auth / token file / 进程级默认 token”。
4. student-web 的认证主链统一先打 FastAPI `/api/v1/auth/*`，再由 FastAPI 代理到 RuoYi。
5. 用户请求发起的其它 RuoYi 调用，统一走当前请求态 Bearer token 透传。
6. 后台 worker 如需继续访问 RuoYi，只能使用任务创建时写入 Redis 运行态的短 TTL 请求鉴权；任务结束后立即清理。
7. `GET /api/v1/video/published` 是登录态发现区接口，不再定义为匿名公开回源。

## 推荐 env 结构

```text
packages/fastapi-backend/
├── .env.example                # 通用默认模板
├── .env.defaults               # 非敏感共享默认值（本地自建，不入库）
├── .env.local                  # 本地联调覆盖（不入库）
├── .env.staging                # 预发覆盖（不入库）
└── .env.production             # 生产覆盖（不入库）
```

## FastAPI 加载顺序

FastAPI 当前按以下顺序加载配置，越靠后优先级越高：

1. `.env.defaults`
2. `.env.<FASTAPI_ENV>`
3. `.env.<FASTAPI_ENV>.local`，仅 `development / test`
4. `.env.local`，仅 `development / test`

说明：

- 推荐本地把 `FASTAPI_ENV` 固定为 `development`，部署环境通过进程环境变量显式设置 `staging` / `production`。
- 预发与生产不自动加载 `.env.local`，避免把开发机覆盖项带入非本地环境。

## 鉴权策略

### 用户请求链路

- 来源：`Authorization: Bearer <user-token>`
- 适用：`/auth/me`、`/video/tasks/*`、`/video/published`、`/classroom/*`、`/companion/*`、`/knowledge/*`、`/learning/*`
- 要求：通过 `AccessContext` 或显式 `RuoYiRequestAuth` 透传，不允许依赖默认全局 token

### 认证代理链路

- 入口：`/api/v1/auth/login`、`/api/v1/auth/logout`、`/api/v1/auth/code`、`/api/v1/auth/register/enabled`、`/api/v1/auth/binding/*`、`/api/v1/auth/me`
- 说明：FastAPI 负责把前端明文登录/注册请求转换成 RuoYi `@ApiEncrypt` 协议，并在登录成功后把在线 token 写入 FastAPI 运行态。
- 要求：认证代理使用的是公私钥加解密配置，不属于业务 access_token；禁止把任何用户 token 写进 env。

### Worker 链路

- 来源：创建任务时写入 Redis 运行态的短 TTL `RuoYiRequestAuth`
- 适用：视频流水线 Provider runtime 查询、任务元数据写回、产物图谱写回等后台异步链路
- 要求：worker 只允许消费任务对应用户的显式请求鉴权；如缺失鉴权，则回退到本地 provider settings，并把长期写回降级为告警而不是偷用进程级 token

## 禁止事项

- 禁止新增 `FASTAPI_RUOYI_ACCESS_TOKEN` 一类“拿来就塞”的全局 token 配置。
- 禁止在 `RuoYiClient.from_settings()` 中恢复默认鉴权头。
- 禁止在 service / repository / worker 中省略鉴权参数后自动偷用服务 token、匿名客户端或其它进程级兜底。
- 禁止把一次性调试 token、抓包结果或 secret 文件提交进仓库。

## 调试建议

1. 先确认当前链路到底属于“用户态透传”还是“任务运行态透传”。
2. 若需要脱离前端手工验证 FastAPI，可先向 RuoYi 登录获取 token，再直接带 `Authorization` 请求 FastAPI。
3. 如果某个链路既没有用户态也没有运行态鉴权，应显式报错或按能力降级，而不是临时再造一套 env token 方案。
