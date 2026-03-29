/**
 * 文件说明：提供 mock / real 共用的认证 adapter 抽象与映射函数。
 */
import type {
  AuthError,
  AuthLoginInput,
  AuthRegisterInput,
  AuthTokenPayload,
  AuthPermission,
  AuthRole,
  AuthUser,
  RuoyiEnvelope,
  RuoyiLoginToken,
  RuoyiUserInfo
} from '@/types/auth';
import { AUTH_SUCCESS_CODE } from '@/types/auth';
import {
  apiClient,
  type ApiClient,
  type ApiRequestConfig,
  isApiClientError
} from '@/services/api/client';
import {
  getMockCurrentUserEnvelope,
  getMockLoginEnvelope,
  getMockLogoutEnvelope,
  getMockRegisterEnvelope
} from '@/services/mock/fixtures/auth';

/** 认证 adapter 统一接口。 */
export interface AuthAdapter {
  login(input: AuthLoginInput): Promise<AuthTokenPayload>;
  register(input: AuthRegisterInput): Promise<AuthTokenPayload>;
  logout(accessToken?: string): Promise<void>;
  getCurrentUser(accessToken?: string): Promise<AuthUser>;
}

/** 可被 `instanceof` 判断的认证错误类型。 */
export class AuthAdapterError extends Error implements AuthError {
  name = 'AuthError' as const;

  constructor(
    public status: number,
    code: number | string,
    message: string
  ) {
    super(message);
    this.code = String(code);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  code: string;
}

type RealAuthAdapterOptions = {
  client?: ApiClient;
};

type ResolveAuthAdapterOptions = RealAuthAdapterOptions & {
  useMock?: boolean;
};

const DEFAULT_TENANT_ID = '000000';
const DEFAULT_GRANT_TYPE = 'password';

function mergeRequestHeaders(
  headers?: HeadersInit,
  accessToken?: string
) {
  const mergedHeaders = new Headers(headers);

  if (accessToken) {
    mergedHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  return mergedHeaders;
}

function normalizeLoginInput(input: AuthLoginInput) {
  return {
    username: input.username,
    password: input.password,
    tenantId: input.tenantId ?? DEFAULT_TENANT_ID,
    clientId: input.clientId,
    grantType: input.grantType ?? DEFAULT_GRANT_TYPE,
    code: input.code,
    uuid: input.uuid
  };
}

function normalizeRegisterInput(input: AuthRegisterInput) {
  return {
    username: input.username,
    password: input.password,
    confirmPassword: input.confirmPassword,
    userType: input.userType,
    tenantId: input.tenantId ?? DEFAULT_TENANT_ID,
    clientId: input.clientId,
    grantType: input.grantType ?? DEFAULT_GRANT_TYPE,
    code: input.code,
    uuid: input.uuid
  };
}

/** 创建统一认证错误对象。 */
export function createAuthError(
  status: number,
  code: number | string,
  message: string
): AuthError {
  return new AuthAdapterError(status, code, message);
}

/** 判断任意异常是否已是认证错误。 */
export function isAuthError(error: unknown): error is AuthError {
  if (error instanceof AuthAdapterError) {
    return true;
  }

  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    'status' in error &&
    'code' in error &&
    'message' in error &&
    (error as AuthError).name === 'AuthError'
  );
}

/** 把 RuoYi 登录 payload 映射为领域 token。 */
export function mapRuoyiLoginToken(payload: RuoyiLoginToken): AuthTokenPayload {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expire_in,
    refreshExpiresIn: payload.refresh_expire_in,
    clientId: payload.client_id ?? null,
    openId: payload.openid ?? null,
    scopes: payload.scope ? payload.scope.split(/\s+/).filter(Boolean) : []
  };
}

/** 把 RuoYi 用户信息 payload 映射为领域用户对象。 */
export function mapRuoyiUserInfo(payload: RuoyiUserInfo): AuthUser {
  const sourceUser = payload.user;
  const rolesByKey = new Map<string, AuthRole>();
  const permissions: AuthPermission[] = payload.permissions.map(key => ({ key }));

  for (const role of sourceUser?.roles ?? []) {
    rolesByKey.set(role.roleKey, {
      key: role.roleKey,
      name: role.roleName
    });
  }

  for (const roleKey of payload.roles) {
    if (!rolesByKey.has(roleKey)) {
      rolesByKey.set(roleKey, {
        key: roleKey,
        name: roleKey
      });
    }
  }

  return {
    id: String(sourceUser?.userId ?? ''),
    username: sourceUser?.userName ?? '',
    nickname: sourceUser?.nickName ?? sourceUser?.userName ?? '',
    avatarUrl: sourceUser?.avatar ?? null,
    roles: [...rolesByKey.values()],
    permissions
  };
}

function unwrapRuoyiEnvelope<T>(
  envelope: RuoyiEnvelope<T>,
  fallbackStatus: number
): T {
  if (envelope.code !== AUTH_SUCCESS_CODE) {
    const errorStatus = envelope.code || fallbackStatus;

    throw createAuthError(errorStatus, errorStatus, envelope.msg);
  }

  return envelope.data;
}

function mapApiClientAuthError(error: unknown): AuthError {
  if (isAuthError(error)) {
    return error;
  }

  if (isApiClientError(error)) {
    const responseData = error.data as Partial<RuoyiEnvelope<unknown>> | undefined;
    const status = Number(responseData?.code ?? error.status ?? 500);
    const code = responseData?.code ?? error.status ?? 500;
    const message =
      typeof responseData?.msg === 'string' && responseData.msg.trim().length > 0
        ? responseData.msg
        : error.message;

    return createAuthError(status, code, message);
  }

  if (error instanceof Error) {
    return createAuthError(500, 500, error.message);
  }

  return createAuthError(500, 500, '未知认证错误');
}

async function requestRuoyiEnvelope<T>(
  client: ApiClient,
  config: ApiRequestConfig,
  accessToken?: string
) {
  try {
    const response = await client.request<RuoyiEnvelope<T>>({
      ...config,
      headers: mergeRequestHeaders(config.headers, accessToken)
    });

    return unwrapRuoyiEnvelope(response.data, response.status);
  } catch (error) {
    throw mapApiClientAuthError(error);
  }
}

function runMockOperation<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(operation);
}

/** 创建真实接口认证 adapter。 */
export function createRealAuthAdapter({
  client = apiClient
}: RealAuthAdapterOptions = {}): AuthAdapter {
  return {
    async login(input) {
      const payload = await requestRuoyiEnvelope<RuoyiLoginToken>(client, {
        url: '/auth/login',
        method: 'post',
        data: normalizeLoginInput(input)
      });

      return mapRuoyiLoginToken(payload);
    },
    async register(input) {
      const payload = await requestRuoyiEnvelope<RuoyiLoginToken>(client, {
        url: '/auth/register',
        method: 'post',
        data: normalizeRegisterInput(input)
      });

      return mapRuoyiLoginToken(payload);
    },
    async logout(accessToken) {
      await requestRuoyiEnvelope<null>(client, {
        url: '/auth/logout',
        method: 'post'
      }, accessToken);
    },
    async getCurrentUser(accessToken) {
      const payload = await requestRuoyiEnvelope<RuoyiUserInfo>(client, {
        url: '/system/user/getInfo',
        method: 'get'
      }, accessToken);

      return mapRuoyiUserInfo(payload);
    }
  };
}

/** 创建基于本地 fixtures 的认证 mock adapter。 */
export function createMockAuthAdapter(): AuthAdapter {
  return {
    login(input) {
      return runMockOperation(() => mapRuoyiLoginToken(getMockLoginEnvelope(input).data));
    },
    register(input) {
      return runMockOperation(() =>
        mapRuoyiLoginToken(getMockRegisterEnvelope(input).data)
      );
    },
    logout() {
      return runMockOperation(() => {
        getMockLogoutEnvelope();
      });
    },
    getCurrentUser(accessToken) {
      return runMockOperation(() =>
        mapRuoyiUserInfo(getMockCurrentUserEnvelope(accessToken).data)
      );
    }
  };
}

/** 根据运行模式选择认证 adapter。 */
export function resolveAuthAdapter(
  options: ResolveAuthAdapterOptions = {}
): AuthAdapter {
  const useMock = options.useMock ?? import.meta.env.VITE_APP_USE_MOCK === 'Y';

  if (useMock) {
    return createMockAuthAdapter();
  }

  return createRealAuthAdapter({ client: options.client });
}
