/**
 * 文件说明：创建真实认证 adapter 与 adapter 解析器。
 * 组合 mappers 与 requests 模块，对外暴露统一的 AuthAdapter 实现。
 */
import type {
  AuthLoginInput,
  AuthRegisterInput,
  RuoyiLoginToken,
  RuoyiUserInfo,
} from "@/types/auth";
import {
  AUTH_DEFAULT_TENANT_ID,
  AUTH_DEFAULT_USER_TYPE,
} from "@/types/auth";
import type { ApiClient } from "@/services/api/client";
import {
  type AuthAdapter,
  mapRuoyiLoginToken,
  mapRuoyiUserInfo,
} from "./auth-mappers";
import {
  fastapiAuthClient,
  requestAuthEnvelope,
  requestCaptcha,
  requestRegisterEnabled,
  requestSocialAuthUrl,
} from "./auth-requests";
import { createMockAuthAdapter } from "./auth-mock-adapter";

type RealAuthAdapterOptions = {
  client?: ApiClient;
};

type ResolveAuthAdapterOptions = RealAuthAdapterOptions & {
  useMock?: boolean;
};

const DEFAULT_GRANT_TYPE = "password";

function resolveClientId(inputClientId?: string) {
  return inputClientId ?? import.meta.env.VITE_APP_CLIENT_ID;
}

function normalizeLoginInput(input: AuthLoginInput) {
  return {
    username: input.username,
    password: input.password,
    tenantId: input.tenantId ?? AUTH_DEFAULT_TENANT_ID,
    clientId: resolveClientId(input.clientId),
    grantType: input.grantType ?? DEFAULT_GRANT_TYPE,
    code: input.code,
    uuid: input.uuid,
    source: input.source,
    socialCode: input.socialCode,
    socialState: input.socialState,
    returnTo: input.returnTo,
  };
}

function normalizeRegisterInput(input: AuthRegisterInput) {
  return {
    username: input.username,
    password: input.password,
    confirmPassword: input.confirmPassword,
    code: input.code,
    uuid: input.uuid,
    userType: input.userType ?? AUTH_DEFAULT_USER_TYPE,
    tenantId: input.tenantId ?? AUTH_DEFAULT_TENANT_ID,
    clientId: resolveClientId(input.clientId),
    grantType: input.grantType ?? DEFAULT_GRANT_TYPE,
    returnTo: input.returnTo,
  };
}

/**
 * 创建真实接口认证 adapter。
 *
 * @param options - 真实 adapter 参数。
 * @param options.client - 可替换的 API Client。
 * @returns 真实认证 adapter。
 */
export function createRealAuthAdapter({
  client = fastapiAuthClient,
}: RealAuthAdapterOptions = {}): AuthAdapter {
  return {
    async login(input) {
      const payload = await requestAuthEnvelope<RuoyiLoginToken>(client, {
        url: "/api/v1/auth/login",
        method: "post",
        data: normalizeLoginInput(input),
      });

      return mapRuoyiLoginToken(payload);
    },
    async register(input) {
      await requestAuthEnvelope<null>(client, {
        url: "/api/v1/auth/register",
        method: "post",
        data: normalizeRegisterInput(input),
      });
    },
    getCaptcha() {
      return requestCaptcha(client);
    },
    getRegisterEnabled(tenantId) {
      return requestRegisterEnabled(client, tenantId);
    },
    getSocialAuthUrl(input) {
      return requestSocialAuthUrl(client, input);
    },
    async logout(accessToken) {
      await requestAuthEnvelope<null>(
        client,
        { url: "/api/v1/auth/logout", method: "post" },
        accessToken,
      );
    },
    async getCurrentUser(accessToken) {
      const payload = await requestAuthEnvelope<RuoyiUserInfo>(
        client,
        { url: "/api/v1/auth/me", method: "get" },
        accessToken,
      );

      return mapRuoyiUserInfo(payload);
    },
  };
}

/**
 * 根据运行模式选择 mock 或 real 认证 adapter。
 *
 * @param options - 认证 adapter 解析参数。
 * @returns 当前运行模式对应的认证 adapter。
 */
export function resolveAuthAdapter(
  options: ResolveAuthAdapterOptions = {},
): AuthAdapter {
  const useMock = options.useMock ?? import.meta.env.VITE_APP_USE_MOCK === "Y";

  if (useMock) {
    return createMockAuthAdapter();
  }

  return createRealAuthAdapter({ client: options.client });
}

export { createMockAuthAdapter };
