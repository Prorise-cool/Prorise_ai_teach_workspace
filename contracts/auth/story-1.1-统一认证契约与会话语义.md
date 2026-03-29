# Story 1.1 统一认证契约与会话语义

## 目标

冻结 Epic 1 在学生端消费的最小认证契约，保证 `/login`、首页双入口、受保护路由与输入壳层可以在 mock / real 两种模式下复用同一套领域类型与状态语义。

## 接口范围

| 能力 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 登录 | `POST` | `/auth/login` | 返回 token payload |
| 注册 | `POST` | `/auth/register` | 返回 token payload |
| 登出 | `POST` | `/auth/logout` | 清理服务端在线态 |
| 当前用户 | `GET` | `/system/user/getInfo` | 返回用户、角色、权限 |

## 统一响应包装

所有认证接口统一遵循 RuoYi 风格包装：

```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {}
}
```

- `code = 200`：请求成功。
- `code = 401`：未登录、token 缺失、token 失效或会话失效。
- `code = 403`：已登录，但当前账号不具备访问学生端所需权限。
- 错误展示只消费 `code + msg`，不透出密码、账号存在性、服务端堆栈等敏感信息。

## 前端领域模型

### `AuthTokenPayload`

| 字段 | 来源 | 说明 |
|------|------|------|
| `accessToken` | `data.access_token` | 访问令牌 |
| `refreshToken` | `data.refresh_token` | 刷新令牌 |
| `expiresIn` | `data.expire_in` | access token 有效期，单位秒 |
| `refreshExpiresIn` | `data.refresh_expire_in` | refresh token 有效期，单位秒 |
| `clientId` | `data.client_id` | 客户端标识 |
| `openId` | `data.openid` | 第三方标识，可为空 |
| `scopes` | `data.scope` | 按空格拆分后的 scope 列表 |

### `AuthUser`

| 字段 | 来源 | 说明 |
|------|------|------|
| `id` | `data.user.userId` | 统一转成字符串 |
| `username` | `data.user.userName` | 登录账号 |
| `nickname` | `data.user.nickName` | 页面展示昵称 |
| `avatarUrl` | `data.user.avatar` | 头像地址，可为空 |
| `roles[]` | `data.user.roles` + `data.roles` | 优先使用 `roleKey/roleName`，缺失时退化为 key 自身 |
| `permissions[]` | `data.permissions` | 统一映射为 `{ key }` 结构 |

### `AuthSession`

`AuthSession = AuthTokenPayload + AuthUser`。

也就是说，登录 / 注册成功后，前端应当先拿到 token，再读取当前用户信息，最终组合成完整会话对象，而不是让页面分别猜测 token 与用户字段。

## `401 / 403` 语义

### `401`

表示以下任一情况：

1. 用户尚未登录。
2. 本地 token 丢失。
3. token 已过期、被撤销或 Redis 在线态不存在。

前端处理约定：

1. 清理本地认证态。
2. 跳转 `/login`。
3. 保留合法 `returnTo`，便于登录后恢复上下文。

### `403`

表示用户已通过认证，但当前账号不具备学生端入口或目标资源所需权限。

前端处理约定：

1. 不把 `403` 伪装成 `401`。
2. 页面展示“无权限”或“当前账号暂无访问权限”的明确反馈。
3. 保留已登录状态，避免误清理有效 token。

## `returnTo` 规则

### 参数名

统一使用查询参数 `returnTo`。

### 格式

- 只允许站内相对路径，例如：`/video/input`、`/classroom/input?from=home`。
- 允许携带 query 与 hash。
- 不允许外链 URL、双斜杠路径、以及 `/login` 自循环。

### 允许来源

1. 受保护路由拦截后重定向到登录页。
2. 首页 CTA 在未登录状态下引导到登录页。
3. 后续输入页、结果页在需要恢复原意图时复用同一规则。

### 兜底规则

- `returnTo` 为空、非法、外链、指向 `/login` 时，统一回退到 `/`。

## 代码落点

- `packages/student-web/src/types/auth.ts`
- `packages/student-web/src/services/auth.ts`
- `packages/student-web/src/services/api/adapters/auth-adapter.ts`
- `packages/student-web/src/services/mock/fixtures/auth.ts`
- `packages/student-web/src/services/mock/handlers/auth.ts`

## Mock 样例

示例 payload 见：

- `mocks/auth/session-samples.json`
