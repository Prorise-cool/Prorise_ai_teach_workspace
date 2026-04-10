/**
 * 文件说明：认证 adapter 层的映射函数。
 * 负责将 RuoYi 后端响应转换为前端领域对象。
 */
import type {
  AuthCaptcha,
  AuthLoginInput,
  AuthRegisterInput,
  AuthRole,
  AuthPermission,
  AuthSocialAuthInput,
  AuthUser,
  RuoyiCaptchaPayload,
  RuoyiLoginToken,
  RuoyiUserInfo,
  RuoyiEnvelope,
  AuthTokenPayload,
} from "@/types/auth";
import { AUTH_SUCCESS_CODE } from "@/types/auth";
import { createAuthError } from "./auth-errors";

/** 认证 adapter 统一接口。 */
export interface AuthAdapter {
  login(input: AuthLoginInput): Promise<AuthTokenPayload>;
  register(input: AuthRegisterInput): Promise<void>;
  getCaptcha(): Promise<AuthCaptcha>;
  getRegisterEnabled(tenantId?: string): Promise<boolean>;
  getSocialAuthUrl(input: AuthSocialAuthInput): Promise<string>;
  logout(accessToken?: string): Promise<void>;
  getCurrentUser(accessToken?: string): Promise<AuthUser>;
}

/**
 * 把 RuoYi 登录响应映射为前端领域层 token 结构。
 *
 * @param payload - RuoYi 登录响应。
 * @returns 领域层 token 数据。
 */
export function mapRuoyiLoginToken(payload: RuoyiLoginToken): AuthTokenPayload {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresIn: payload.expire_in,
    refreshExpiresIn: payload.refresh_expire_in ?? null,
    clientId: payload.client_id ?? null,
    openId: payload.openid ?? null,
    scopes: payload.scope ? payload.scope.split(/\s+/).filter(Boolean) : [],
  };
}

export function mapRuoyiCaptchaPayload(payload: RuoyiCaptchaPayload): AuthCaptcha {
  return {
    captchaEnabled: Boolean(payload.captchaEnabled),
    uuid: payload.uuid,
    imageBase64: payload.img,
  };
}

/**
 * 把 RuoYi 用户信息响应映射为前端领域用户对象。
 *
 * @param payload - RuoYi 用户信息响应。
 * @returns 领域层用户对象。
 */
export function mapRuoyiUserInfo(payload: RuoyiUserInfo): AuthUser {
  const sourceUser = payload.user;
  const rolesByKey = new Map<string, AuthRole>();
  const permissions: AuthPermission[] = payload.permissions.map((key) => ({
    key,
  }));

  for (const role of sourceUser?.roles ?? []) {
    rolesByKey.set(role.roleKey, {
      key: role.roleKey,
      name: role.roleName,
    });
  }

  for (const roleKey of payload.roles) {
    if (!rolesByKey.has(roleKey)) {
      rolesByKey.set(roleKey, {
        key: roleKey,
        name: roleKey,
      });
    }
  }

  return {
    id: String(sourceUser?.userId ?? ""),
    username: sourceUser?.userName ?? "",
    nickname: sourceUser?.nickName ?? sourceUser?.userName ?? "",
    avatarUrl: sourceUser?.avatar ?? null,
    roles: [...rolesByKey.values()],
    permissions,
  };
}

/**
 * 校验并解包 RuoYi 通用响应包。
 *
 * @param envelope - RuoYi 标准响应。
 * @param fallbackStatus - 缺失业务码时的兜底状态。
 * @returns 解包后的业务数据。
 * @throws {AuthError} 当响应表示失败时抛出认证错误。
 */
export function unwrapRuoyiEnvelope<T>(
  envelope: RuoyiEnvelope<T>,
  fallbackStatus: number,
): T {
  if (envelope.code !== AUTH_SUCCESS_CODE) {
    const errorStatus = envelope.code || fallbackStatus;

    throw createAuthError(errorStatus, errorStatus, envelope.msg);
  }

  return envelope.data;
}
