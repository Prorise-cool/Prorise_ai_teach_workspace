/**
 * 文件说明：提供 mock / real 共用的认证 adapter 抽象与映射函数。
 */
import type {
  AuthCaptcha,
  AuthError,
  AuthLoginInput,
  AuthPermission,
  AuthRegisterInput,
  AuthRole,
  AuthSocialAuthInput,
  AuthTokenPayload,
  AuthUser,
  RuoyiEnvelope,
  RuoyiCaptchaPayload,
  RuoyiLoginToken,
  RuoyiUserInfo,
} from "@/types/auth";
import {
  AUTH_DEFAULT_USER_TYPE,
  AUTH_DEFAULT_TENANT_ID,
  AUTH_SUCCESS_CODE,
} from "@/types/auth";
import {
  createApiClient,
  withAuthHeader,
  type ApiClient,
  type ApiRequestConfig,
  isApiClientError,
} from "@/services/api/client";
import { resolveFastapiBaseUrl } from "@/services/api/fastapi-base-url";
import {
  getMockCaptchaEnvelope,
  getMockCurrentUserEnvelope,
  getMockLoginEnvelope,
  getMockLogoutEnvelope,
  getMockRegisterEnabledEnvelope,
  getMockRegisterEnvelope,
  getMockSocialAuthUrl,
} from "@/services/mock/fixtures/auth";
import {
  readNumberProperty,
  readRecord,
  readStringProperty,
} from "@/lib/type-guards";

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

/** 可被 `instanceof` 判断的认证错误类型。 */
export class AuthAdapterError extends Error implements AuthError {
  name = "AuthError" as const;

  constructor(
    public status: number,
    code: number | string,
    message: string,
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

const DEFAULT_GRANT_TYPE = "password";
const fastapiAuthClient = createApiClient({
  baseURL: resolveFastapiBaseUrl(),
});

function resolveClientId(inputClientId?: string) {
  return inputClientId ?? import.meta.env.VITE_APP_CLIENT_ID;
}

/**
 * 规范化登录入参，补齐租户与授权类型默认值。
 *
 * @param input - 原始登录入参。
 * @returns 可直接提交给后端的登录 payload。
 */
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

/**
 * 规范化注册入参，补齐租户与授权类型默认值。
 *
 * @param input - 原始注册入参。
 * @returns 可直接提交给后端的注册 payload。
 */
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
 * 构造第三方登录入口请求地址，沿用 RuoYi 认证接口的查询参数格式。
 *
 * @param input - 第三方登录入口参数。
 * @returns 可直接请求的后端地址。
 */
function createSocialBindingRequestUrl(input: AuthSocialAuthInput) {
  const searchParams = new URLSearchParams({
    tenantId: input.tenantId ?? AUTH_DEFAULT_TENANT_ID,
    domain:
      input.domain ??
      (typeof window !== "undefined" ? window.location.host : ""),
  });

  return `/api/v1/auth/binding/${input.source}?${searchParams.toString()}`;
}

/**
 * 创建统一认证错误对象，确保页面与 adapter 层可一致处理。
 *
 * @param status - HTTP 或领域状态码。
 * @param code - 后端返回的业务错误码。
 * @param message - 错误消息。
 * @returns 统一认证错误对象。
 */
export function createAuthError(
  status: number,
  code: number | string,
  message: string,
): AuthError {
  return new AuthAdapterError(status, code, message);
}

/**
 * 判断任意异常是否已归一为认证错误。
 *
 * @param error - 待判断的异常对象。
 * @returns 是否为认证错误。
 */
export function isAuthError(error: unknown): error is AuthError {
  if (error instanceof AuthAdapterError) {
    return true;
  }

  const errorRecord = readRecord(error);

  if (!errorRecord) {
    return false;
  }

  return (
    readStringProperty(errorRecord, "name") === "AuthError" &&
    readNumberProperty(errorRecord, "status") !== undefined &&
    readStringProperty(errorRecord, "code") !== undefined &&
    readStringProperty(errorRecord, "message") !== undefined
  );
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

function mapRuoyiCaptchaPayload(payload: RuoyiCaptchaPayload): AuthCaptcha {
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
function unwrapRuoyiEnvelope<T>(
  envelope: RuoyiEnvelope<T>,
  fallbackStatus: number,
): T {
  if (envelope.code !== AUTH_SUCCESS_CODE) {
    const errorStatus = envelope.code || fallbackStatus;

    throw createAuthError(errorStatus, errorStatus, envelope.msg);
  }

  return envelope.data;
}

/**
 * 把 API Client 层异常映射为认证领域错误。
 *
 * @param error - 原始异常对象。
 * @returns 统一认证错误。
 */
function mapApiClientAuthError(error: unknown): AuthError {
  if (isAuthError(error)) {
    return error;
  }

  if (isApiClientError(error)) {
    const responseData = readRecord(error.data);
    const responseCode =
      responseData?.code !== undefined
        ? readNumberProperty(responseData, "code")
        : undefined;
    const responseMessage = responseData
      ? readStringProperty(responseData, "msg")
      : undefined;
    const status = responseCode ?? error.status ?? 500;
    const code = responseCode ?? error.status ?? 500;
    const message =
      responseMessage && responseMessage.trim().length > 0
        ? responseMessage
        : error.message;

    return createAuthError(status, code, message);
  }

  if (error instanceof Error) {
    return createAuthError(500, 500, error.message);
  }

  return createAuthError(500, 500, "未知认证错误");
}

/**
 * 解析第三方登录入口接口响应，兼容字符串与 RuoYi 包装结构。
 *
 * @param payload - 接口响应体。
 * @param fallbackStatus - 兜底状态码。
 * @returns 可跳转的第三方登录地址。
 */
function unwrapSocialAuthUrl(payload: unknown, fallbackStatus: number) {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  const envelope = readRecord(payload);

  if (envelope && "data" in envelope) {
    const envelopeCode = readNumberProperty(envelope, "code");
    const envelopeMessage = readStringProperty(envelope, "msg") ?? "";

    if (envelopeCode !== undefined) {
      if (envelopeCode !== AUTH_SUCCESS_CODE) {
        const errorStatus = envelopeCode || fallbackStatus;

        throw createAuthError(errorStatus, errorStatus, envelopeMessage);
      }

      if (
        typeof envelope.data === "string" &&
        envelope.data.trim().length > 0
      ) {
        return envelope.data;
      }
    }
  }

  throw createAuthError(
    fallbackStatus,
    fallbackStatus,
    "第三方登录入口暂不可用，请稍后重试",
  );
}

/**
 * 发送统一认证代理请求，并在成功后解包业务数据。
 *
 * @param client - API Client 实例。
 * @param config - 请求配置。
 * @param accessToken - 可选访问令牌。
 * @returns 解包后的业务数据。
 */
async function requestAuthEnvelope<T>(
  client: ApiClient,
  config: ApiRequestConfig,
  accessToken?: string,
) {
  try {
    const response = await client.request<RuoyiEnvelope<T>>({
      ...config,
      authFailureMode: "manual",
      headers: withAuthHeader(config.headers, accessToken),
    });

    return unwrapRuoyiEnvelope(response.data, response.status);
  } catch (error) {
    throw mapApiClientAuthError(error);
  }
}

/**
 * 请求第三方登录入口地址。
 *
 * @param client - API Client 实例。
 * @param input - 第三方登录入口参数。
 * @returns 可跳转的第三方登录地址。
 */
async function requestSocialAuthUrl(
  client: ApiClient,
  input: AuthSocialAuthInput,
) {
  try {
    const response = await client.request<unknown>({
      url: createSocialBindingRequestUrl(input),
      method: "get",
      authFailureMode: "manual",
    });

    return unwrapSocialAuthUrl(response.data, response.status);
  } catch (error) {
      throw mapApiClientAuthError(error);
  }
}

async function requestCaptcha(client: ApiClient) {
  try {
    const response = await client.request<RuoyiEnvelope<RuoyiCaptchaPayload>>({
      url: "/api/v1/auth/code",
      method: "get",
      authFailureMode: "manual",
    });

    return mapRuoyiCaptchaPayload(
      unwrapRuoyiEnvelope(response.data, response.status),
    );
  } catch (error) {
    throw mapApiClientAuthError(error);
  }
}

async function requestRegisterEnabled(
  client: ApiClient,
  tenantId = AUTH_DEFAULT_TENANT_ID,
) {
  try {
    const response = await client.request<RuoyiEnvelope<boolean>>({
      url: `/api/v1/auth/register/enabled?tenantId=${encodeURIComponent(tenantId)}`,
      method: "get",
      authFailureMode: "manual",
    });
    const registerValue = unwrapRuoyiEnvelope(response.data, response.status);

    return Boolean(registerValue);
  } catch (error) {
    throw mapApiClientAuthError(error);
  }
}

/**
 * 在微任务中执行 mock 逻辑，模拟异步接口语义。
 *
 * @param operation - 需要执行的 mock 操作。
 * @returns 异步化后的 mock 执行结果。
 */
function runMockOperation<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(operation);
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
        {
          url: "/api/v1/auth/logout",
          method: "post",
        },
        accessToken,
      );
    },
    async getCurrentUser(accessToken) {
      const payload = await requestAuthEnvelope<RuoyiUserInfo>(
        client,
        {
          url: "/api/v1/auth/me",
          method: "get",
        },
        accessToken,
      );

      return mapRuoyiUserInfo(payload);
    },
  };
}

/**
 * 创建基于本地 fixtures 的认证 mock adapter。
 *
 * @returns mock 认证 adapter。
 */
export function createMockAuthAdapter(): AuthAdapter {
  return {
    login(input) {
      return runMockOperation(() =>
        mapRuoyiLoginToken(getMockLoginEnvelope(input).data),
      );
    },
    register(input) {
      return runMockOperation(() => {
        getMockRegisterEnvelope(input);
      });
    },
    getCaptcha() {
      return runMockOperation(() =>
        mapRuoyiCaptchaPayload(getMockCaptchaEnvelope().data),
      );
    },
    getRegisterEnabled() {
      return runMockOperation(() => {
        const registerValue = getMockRegisterEnabledEnvelope().data;

        return Boolean(registerValue);
      });
    },
    getSocialAuthUrl(input) {
      return runMockOperation(() => getMockSocialAuthUrl(input));
    },
    logout() {
      return runMockOperation(() => {
        getMockLogoutEnvelope();
      });
    },
    getCurrentUser(accessToken) {
      return runMockOperation(() =>
        mapRuoyiUserInfo(getMockCurrentUserEnvelope(accessToken).data),
      );
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
