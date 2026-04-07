/**
 * 文件说明：封装 student-web 统一的 Fetch API Client。
 * 负责请求超时、错误归一化和 JSON / 非 JSON 响应解析。
 */
import {
  decryptBase64,
  decryptWithAes,
  decryptWithRsa,
  encryptBase64,
  encryptWithAes,
  encryptWithRsa,
  generateAesKey,
  getRequestEncryptHeaderFlag,
  isRequestEncryptionEnabled,
} from "@/services/api/request-crypto";
import {
  readNumberProperty,
  readRecord,
  readStringProperty,
  parseJsonText,
} from "@/lib/type-guards";
import {
  emitAuthFailure,
  isAuthFailureStatus
} from "@/services/api/auth-failure";

export type ApiRequestMethod = "get" | "post" | "put" | "patch" | "delete";

export type ApiRequestConfig = {
  url: string;
  method?: ApiRequestMethod;
  data?: unknown;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  encrypt?: boolean;
  authFailureMode?: "auto" | "manual";
};

export type ApiClientResponse<T> = {
  status: number;
  data: T;
  headers: Headers;
};

export interface ApiClient {
  request<T>(config: ApiRequestConfig): Promise<ApiClientResponse<T>>;
}

export class ApiClientError extends Error {
  name = "ApiClientError" as const;

  constructor(
    public status: number,
    message: string,
    public data?: unknown,
    public response?: ApiClientResponse<unknown>,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type CreateApiClientOptions = {
  baseURL?: string;
  credentials?: RequestCredentials;
  timeout?: number;
  /** 可选的访问令牌获取回调，存在时自动注入 Authorization header。 */
  getAccessToken?: () => string | null;
};

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RUOYI_BASE_URL = "http://127.0.0.1:8080";

/**
 * 解析 RuoYi 服务基准地址。
 * 开发环境优先走同源代理，避免浏览器直连双后端时触发跨域预检问题。
 *
 * @param configuredBaseUrl - 显式传入的后端基准地址。
 * @param isDev - 当前是否为开发环境。
 * @returns 可用的 RuoYi 基准地址。
 */
export function resolveRuoyiBaseUrl(
  configuredBaseUrl = import.meta.env.VITE_RUOYI_BASE_URL,
  isDev = import.meta.env.DEV
) {
  const normalizedBaseUrl = configuredBaseUrl?.trim();

  if (normalizedBaseUrl) {
    return normalizedBaseUrl;
  }

  return isDev ? "" : DEFAULT_RUOYI_BASE_URL;
}

function resolveRequestLocale() {
  if (typeof document !== "undefined") {
    const documentLanguage = document.documentElement.lang?.trim();

    if (documentLanguage) {
      return documentLanguage;
    }
  }

  return import.meta.env.VITE_APP_DEFAULT_LOCALE;
}

/**
 * 将 Authorization header 合并到请求头中。
 * 如果 accessToken 为空则不注入。
 *
 * @param headers - 原始请求头。
 * @param accessToken - 可选访问令牌。
 * @returns 合并后的请求头对象。
 */
export function withAuthHeader(
  headers?: HeadersInit,
  accessToken?: string | null,
): Headers {
  const merged = new Headers(headers);

  if (accessToken) {
    merged.set("Authorization", `Bearer ${accessToken}`);
  }

  return merged;
}

function appendDefaultHeaders(headers: Headers) {
  const clientId = import.meta.env.VITE_APP_CLIENT_ID?.trim();

  if (clientId) {
    headers.set("Clientid", clientId);
  }

  headers.set("Content-Language", resolveRequestLocale().replace("-", "_"));
}

function shouldEncryptRequest(
  method: ApiRequestMethod,
  encrypt: boolean | undefined,
) {
  return (
    encrypt === true &&
    isRequestEncryptionEnabled() &&
    (method === "post" || method === "put" || method === "patch")
  );
}

function createEncryptedRequestBody(data: unknown) {
  const aesKey = generateAesKey();
  const encryptedKey = encryptWithRsa(encryptBase64(aesKey));
  const plainPayload =
    typeof data === "string" ? data : JSON.stringify(data ?? null);

  return {
    headerName: getRequestEncryptHeaderFlag(),
    headerValue: encryptedKey,
    body: encryptWithAes(plainPayload, aesKey),
  };
}

/**
 * 判断请求体是否应按 JSON 序列化发送。
 *
 * @param value - 待发送的请求体。
 * @returns 是否可以安全序列化为 JSON。
 */
function isJsonSerializableBody(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return false;
  }

  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return false;
  }

  if (
    typeof URLSearchParams !== "undefined" &&
    value instanceof URLSearchParams
  ) {
    return false;
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return false;
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return false;
  }

  if (
    typeof ReadableStream !== "undefined" &&
    value instanceof ReadableStream
  ) {
    return false;
  }

  return true;
}

/**
 * 从后端错误负载中提取更适合展示的错误消息。
 *
 * @param data - 错误响应体。
 * @param fallbackMessage - 默认兜底文案。
 * @returns 解析后的错误消息。
 */
function parseErrorMessage(data: unknown, fallbackMessage: string) {
  const errorRecord = readRecord(data);
  const errorMessage = errorRecord
    ? readStringProperty(errorRecord, "msg")
    : undefined;

  if (errorMessage && errorMessage.trim().length > 0) {
    return errorMessage;
  }

  return fallbackMessage;
}

/**
 * 根据响应头自动解析 JSON、文本或空响应体。
 *
 * @param response - Fetch 响应对象。
 * @returns 解析后的响应体。
 */
async function parseResponseBody(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const encryptedKey = response.headers.get(getRequestEncryptHeaderFlag());

  if (isRequestEncryptionEnabled() && encryptedKey) {
    const encryptedText = await response.text();

    if (encryptedText.length === 0) {
      return null;
    }

    const decryptedAesKey = decryptBase64(decryptWithRsa(encryptedKey));
    const decryptedPayload = decryptWithAes(encryptedText, decryptedAesKey);

    if (decryptedPayload.length === 0) {
      return null;
    }

    return parseJsonText(decryptedPayload);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const rawJsonText = await response.text();

    if (rawJsonText.length === 0) {
      return null;
    }

    return parseJsonText(rawJsonText);
  }

  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  try {
    return parseJsonText(text);
  } catch {
    return text;
  }
}

/**
 * 结合可选 `baseURL` 解析最终请求地址。
 *
 * @param baseURL - 客户端基础地址。
 * @param url - 调用方传入的相对或绝对地址。
 * @returns 最终请求 URL。
 */
function resolveRequestUrl(baseURL: string | undefined, url: string) {
  if (!baseURL) {
    return url;
  }

  return new URL(url, baseURL).toString();
}

/**
 * 创建带超时控制的请求信号，并桥接外部中断信号。
 *
 * @param timeout - 请求超时时间，单位毫秒。
 * @param signal - 外部传入的中断信号。
 * @returns 组合后的请求信号与清理函数。
 */
function createRequestSignal(timeout: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const relayAbort = () => controller.abort(signal?.reason);

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", relayAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    controller.abort(new Error("Request timeout"));
  }, timeout);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);

      if (signal) {
        signal.removeEventListener("abort", relayAbort);
      }
    },
  };
}

/**
 * 判断异常是否为统一 API Client 抛出的错误类型。
 *
 * @param error - 待判断的异常对象。
 * @returns 是否为 `ApiClientError`。
 */
export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

/**
 * 创建统一的 Fetch API Client，并封装超时、错误归一化与响应解析。
 *
 * @param options - Client 初始化参数。
 * @param options.baseURL - 请求基础地址。
 * @param options.credentials - 默认凭证模式。
 * @param options.timeout - 默认超时时间。
 * @returns 可复用的 API Client 实例。
 */
export function createApiClient({
  baseURL = resolveRuoyiBaseUrl(),
  credentials = "include",
  timeout = DEFAULT_TIMEOUT,
  getAccessToken,
}: CreateApiClientOptions = {}): ApiClient {
  return {
    async request<T>({
      url,
      method = "get",
      data,
      headers,
      credentials: requestCredentials,
      signal,
      encrypt,
      authFailureMode = "auto",
    }: ApiRequestConfig) {
      const requestHeaders = new Headers(headers);
      const requestUrl = resolveRequestUrl(baseURL, url);

      /* 自动注入 Bearer token（仅在 header 尚未显式设置时）。 */
      if (getAccessToken && !requestHeaders.has("Authorization")) {
        const token = getAccessToken();

        if (token) {
          requestHeaders.set("Authorization", `Bearer ${token}`);
        }
      }
      const { signal: requestSignal, cleanup } = createRequestSignal(
        timeout,
        signal,
      );
      const init: RequestInit = {
        method: method.toUpperCase(),
        credentials: requestCredentials ?? credentials,
        headers: requestHeaders,
        signal: requestSignal,
      };

      appendDefaultHeaders(requestHeaders);

      if (data !== undefined) {
        if (shouldEncryptRequest(method, encrypt)) {
          const encryptedRequest = createEncryptedRequestBody(data);

          requestHeaders.set("Content-Type", "application/json");
          requestHeaders.set(
            encryptedRequest.headerName,
            encryptedRequest.headerValue,
          );
          init.body = encryptedRequest.body;
        } else if (isJsonSerializableBody(data)) {
          requestHeaders.set("Content-Type", "application/json");
          init.body = JSON.stringify(data);
        } else {
          init.body = data as BodyInit;
        }
      }

      try {
        const response = await fetch(requestUrl, init);
        const parsedBody = await parseResponseBody(response);
        const result: ApiClientResponse<T> = {
          status: response.status,
          data: parsedBody as T,
          headers: response.headers,
        };

        if (!response.ok) {
          const errorMessage = parseErrorMessage(
            parsedBody,
            response.statusText || "请求失败",
          );

          if (
            authFailureMode !== "manual" &&
            isAuthFailureStatus(response.status)
          ) {
            const payload = readRecord(parsedBody);
            const responseCode = payload
              ? readNumberProperty(payload, "code")
              : undefined;

            emitAuthFailure({
              status: response.status,
              message: errorMessage,
              requestUrl,
              responseCode:
                responseCode !== undefined ? String(responseCode) : null,
              occurredAt: Date.now(),
            });
          }

          throw new ApiClientError(
            response.status,
            errorMessage,
            parsedBody,
            result as ApiClientResponse<unknown>,
          );
        }

        return result;
      } catch (error) {
        if (isApiClientError(error)) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw new ApiClientError(408, "请求超时");
        }

        if (error instanceof Error) {
          throw new ApiClientError(500, error.message);
        }

        throw new ApiClientError(500, "网络请求失败");
      } finally {
        cleanup();
      }
    },
  };
}

export const apiClient = createApiClient();
