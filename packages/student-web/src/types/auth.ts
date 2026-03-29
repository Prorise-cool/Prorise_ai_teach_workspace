/**
 * 文件说明：定义认证域稳定消费的领域类型与 RuoYi 包装契约。
 */

/** 认证成功状态码。 */
export const AUTH_SUCCESS_CODE = 200;

/** 未登录或会话失效状态码。 */
export const AUTH_UNAUTHORIZED_STATUS = 401;

/** 已登录但无权限状态码。 */
export const AUTH_FORBIDDEN_STATUS = 403;

/** 认证回跳参数名。 */
export const AUTH_RETURN_TO_QUERY_KEY = 'returnTo';

/** 默认认证回跳地址。 */
export const DEFAULT_AUTH_RETURN_TO = '/';

/** 允许写入 returnTo 的来源。 */
export const AUTH_RETURN_TO_ALLOWED_SOURCES = [
  'route-guard',
  'home-cta',
  'protected-action'
] as const;

/** 认证回跳来源类型。 */
export type AuthReturnToSource =
  (typeof AUTH_RETURN_TO_ALLOWED_SOURCES)[number];

/** 认证角色领域对象。 */
export interface AuthRole {
  key: string;
  name: string;
}

/** 认证权限领域对象。 */
export interface AuthPermission {
  key: string;
}

/** 当前用户领域对象。 */
export interface AuthUser {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  roles: AuthRole[];
  permissions: AuthPermission[];
}

/** 认证 token 领域对象。 */
export interface AuthTokenPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  clientId: string | null;
  openId: string | null;
  scopes: string[];
}

/** 登录成功后的统一会话对象。 */
export interface AuthSession extends AuthTokenPayload {
  user: AuthUser;
}

/** 认证错误对象。 */
export interface AuthError extends Error {
  name: 'AuthError';
  status: number;
  code: string;
}

/** 登录输入对象。 */
export interface AuthLoginInput {
  username: string;
  password: string;
  tenantId?: string;
  clientId?: string;
  grantType?: string;
  code?: string;
  uuid?: string;
  returnTo?: string;
}

/** 注册输入对象。 */
export interface AuthRegisterInput extends AuthLoginInput {
  confirmPassword: string;
  userType?: string;
}

/** RuoYi 风格响应包装。 */
export interface RuoyiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

/** RuoYi 登录 token payload。 */
export interface RuoyiLoginToken {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  refresh_expire_in: number;
  client_id?: string;
  openid?: string;
  scope?: string;
}

/** RuoYi 角色 payload。 */
export interface RuoyiUserRole {
  roleId: string | number;
  roleKey: string;
  roleName: string;
}

/** RuoYi 用户 payload。 */
export interface RuoyiUserRecord {
  userId: string | number;
  userName: string;
  nickName: string;
  avatar?: string;
  roles?: RuoyiUserRole[];
}

/** RuoYi 当前用户信息 payload。 */
export interface RuoyiUserInfo {
  user?: RuoyiUserRecord;
  roles: string[];
  permissions: string[];
}
