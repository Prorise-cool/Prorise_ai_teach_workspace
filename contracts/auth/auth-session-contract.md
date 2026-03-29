# Story 1.1 认证契约冻结说明

## 范围

- Story：`1.1 统一认证契约、会话 payload 与 mock 基线`
- 前端消费端：`packages/student-web`
- 后端参考：`packages/ruoyi-plus-soybean`

## 统一 envelope

所有认证接口统一返回 RuoYi 风格包装：

```json
{
  "code": 200,
  "msg": "ok",
  "data": {}
}
```

## 接口清单

| 能力 | 方法 | 路径 |
|------|------|------|
| 登录 | `POST` | `/auth/login` |
| 注册 | `POST` | `/auth/register` |
| 登出 | `POST` | `/auth/logout` |
| 当前用户 | `GET` | `/system/user/getInfo` |

## 前端领域模型

`packages/student-web/src/types/auth.ts` 冻结以下对象：

- `AuthSession`
- `AuthTokenPayload`
- `AuthUser`
- `AuthRole`
- `AuthPermission`
- `AuthError`

## 映射规则

### 登录 / 注册 token

RuoYi `data`：

- `access_token`
- `refresh_token`
- `expire_in`
- `refresh_expire_in`
- `client_id`
- `openid`
- `scope`

前端 `AuthTokenPayload`：

- `accessToken <- access_token`
- `refreshToken <- refresh_token`
- `expiresIn <- expire_in`
- `refreshExpiresIn <- refresh_expire_in`
- `clientId <- client_id`
- `openId <- openid`
- `scopes <- scope.split(' ')`

### 当前用户

RuoYi `data.user`：

- `userId`
- `userName`
- `nickName`
- `avatar`
- `roles[]`

RuoYi `data.roles[]`：

- 角色 key 列表

RuoYi `data.permissions[]`：

- 权限 key 列表

前端 `AuthUser`：

- `id <- user.userId`
- `username <- user.userName`
- `nickname <- user.nickName`
- `avatarUrl <- user.avatar`
- `roles <- data.user.roles + data.roles`
- `permissions <- data.permissions`

## 错误语义

- `401`：未登录、会话失效、token 缺失。
- `403`：已登录但权限不足。
- 前端错误对象只保留 `status`、`code`、`message`，不向 UI 暴露敏感字段。

## returnTo 规则

### 参数名

- `returnTo`

### 允许来源

- `route-guard`
- `home-cta`
- `protected-action`

### 合法格式

- 必须为站内绝对路径。
- 允许附带 query 与 hash。
- 示例：`/video/input?topic=fractions#composer`

### 非法值

- 外部 URL，例如 `https://evil.example`
- 协议相对路径，例如 `//evil.example`
- 无前导斜杠的相对路径，例如 `video/input`
- 认证页自身，例如 `/login`

### 兜底

- 非法值统一回退到 `/`
