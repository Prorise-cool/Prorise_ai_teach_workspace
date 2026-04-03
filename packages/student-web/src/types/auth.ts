/**
 * 文件说明：定义认证域稳定消费的领域类型与 RuoYi 包装契约。
 */

/** 认证成功状态码。 */
export const AUTH_SUCCESS_CODE = 200;

/** 统一认证页面路由。 */
export const AUTH_LOGIN_PATH = "/login";

/** 权限不足提示页面路由。 */
export const AUTH_FORBIDDEN_PATH = "/forbidden";

/** 未登录或会话失效状态码。 */
export const AUTH_UNAUTHORIZED_STATUS = 401;

/** 已登录但无权限状态码。 */
export const AUTH_FORBIDDEN_STATUS = 403;

/** 认证回跳参数名。 */
export const AUTH_RETURN_TO_QUERY_KEY = "returnTo";

/** 默认认证回跳地址。 */
export const DEFAULT_AUTH_RETURN_TO = "/";

/** 默认租户编号。 */
export const AUTH_DEFAULT_TENANT_ID = "000000";

/** 注册开关配置键。 */
export const AUTH_REGISTER_CONFIG_KEY = "sys.account.registerUser";

/** 默认注册用户类型。 */
export const AUTH_DEFAULT_USER_TYPE = "sys_user";

/** 第三方登录回调路由。 */
export const AUTH_SOCIAL_CALLBACK_PATH = "/login/social-callback";

/** 第三方登录临时回跳缓存键。 */
export const AUTH_SOCIAL_RETURN_TO_STORAGE_KEY =
  "xiaomai-auth-social-return-to";

/** 允许写入 returnTo 的来源。 */
export const AUTH_RETURN_TO_ALLOWED_SOURCES = [
  "route-guard",
  "home-cta",
  "protected-action",
] as const;

/** 支持的第三方登录来源。 */
export const AUTH_SOCIAL_SOURCES = ["github", "wechat", "qq"] as const;

/** 认证回跳来源类型。 */
export type AuthReturnToSource =
  (typeof AUTH_RETURN_TO_ALLOWED_SOURCES)[number];

/** 第三方登录来源类型。 */
export type AuthSocialSource = (typeof AUTH_SOCIAL_SOURCES)[number];

/**
 * 判断值是否为受支持的第三方登录来源。
 *
 * @param value - 待判断值。
 * @returns 是否为 `AuthSocialSource`。
 */
export function isAuthSocialSource(value: unknown): value is AuthSocialSource {
  return AUTH_SOCIAL_SOURCES.some((source) => source === value);
}

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
  refreshToken: string | null;
  expiresIn: number;
  refreshExpiresIn: number | null;
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
  name: "AuthError";
  status: number;
  code: string;
}

/** 登录输入对象。 */
export interface AuthLoginInput {
  username?: string;
  password?: string;
  tenantId?: string;
  clientId?: string;
  grantType?: string;
  code?: string;
  uuid?: string;
  source?: AuthSocialSource;
  socialCode?: string;
  socialState?: string;
  returnTo?: string;
}

/** 注册输入对象。 */
export interface AuthRegisterInput {
  username: string;
  password: string;
  confirmPassword: string;
  code?: string;
  uuid?: string;
  tenantId?: string;
  clientId?: string;
  grantType?: string;
  userType?: string;
  returnTo?: string;
}

/** 认证页验证码状态。 */
export interface AuthCaptcha {
  captchaEnabled: boolean;
  uuid?: string;
  imageBase64?: string;
}

/** 第三方登录入口输入对象。 */
export interface AuthSocialAuthInput {
  source: AuthSocialSource;
  tenantId?: string;
  domain?: string;
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
  refresh_token?: string | null;
  expire_in: number;
  refresh_expire_in?: number | null;
  client_id?: string | null;
  openid?: string | null;
  scope?: string | null;
}

/** RuoYi 图形验证码 payload。 */
export interface RuoyiCaptchaPayload {
  captchaEnabled: boolean;
  uuid?: string;
  img?: string;
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
