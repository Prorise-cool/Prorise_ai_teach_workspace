/**
 * 文件说明：认证 adapter 层的请求函数。
 * 负责向 API Client 发起认证相关请求并解包响应。
 */
import type {
  AuthSocialAuthInput,
  RuoyiCaptchaPayload,
  RuoyiEnvelope,
} from "@/types/auth";
import { AUTH_DEFAULT_TENANT_ID, AUTH_SUCCESS_CODE } from "@/types/auth";
import {
  createApiClient,
  withAuthHeader,
  type ApiClient,
  type ApiRequestConfig,
} from "@/services/api/client";
import { resolveFastapiBaseUrl } from "@/services/api/fastapi-base-url";
import { readNumberProperty, readRecord, readStringProperty } from "@/lib/type-guards";
import {
  mapRuoyiCaptchaPayload,
  unwrapRuoyiEnvelope,
} from "./auth-mappers";
import {
  mapApiClientAuthError,
  createAuthError,
} from "./auth-errors";

const fastapiAuthClient = createApiClient({
  baseURL: resolveFastapiBaseUrl(),
});

/**
 * 发送统一认证代理请求，并在成功后解包业务数据。
 *
 * @param client - API Client 实例。
 * @param config - 请求配置。
 * @param accessToken - 可选访问令牌。
 * @returns 解包后的业务数据。
 */
export async function requestAuthEnvelope<T>(
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
 * 构造第三方登录入口请求地址，沿用 RuoYi 认证接口的查询参数格式。
 *
 * @param input - 第三方登录入口参数。
 * @returns 可直接请求的后端地址。
 */
export function createSocialBindingRequestUrl(input: AuthSocialAuthInput) {
  const searchParams = new URLSearchParams({
    tenantId: input.tenantId ?? AUTH_DEFAULT_TENANT_ID,
    domain:
      input.domain ??
      (typeof window !== "undefined" ? window.location.host : ""),
  });

  return `/api/v1/auth/binding/${input.source}?${searchParams.toString()}`;
}

/**
 * 解析第三方登录入口接口响应，兼容字符串与 RuoYi 包装结构。
 *
 * @param payload - 接口响应体。
 * @param fallbackStatus - 兜底状态码。
 * @returns 可跳转的第三方登录地址。
 */
export function unwrapSocialAuthUrl(payload: unknown, fallbackStatus: number) {
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
 * 请求第三方登录入口地址。
 *
 * @param client - API Client 实例。
 * @param input - 第三方登录入口参数。
 * @returns 可跳转的第三方登录地址。
 */
export async function requestSocialAuthUrl(
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

export async function requestCaptcha(client: ApiClient) {
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

export async function requestRegisterEnabled(
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

export { fastapiAuthClient };
