/**
 * 文件说明：API Client 内部辅助函数与类型。
 * 包含类型定义、错误类、请求地址解析、超时信号、默认头等工具。
 */
import type { ApiRequestMethod } from "./request-encryption";

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

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

const DEFAULT_RUOYI_BASE_URL = "http://127.0.0.1:8080";

export function resolveRuoyiBaseUrl(
  configuredBaseUrl = import.meta.env.VITE_RUOYI_BASE_URL,
  isDev = import.meta.env.DEV,
) {
  const normalizedBaseUrl = configuredBaseUrl?.trim();
  if (normalizedBaseUrl) return normalizedBaseUrl;
  return isDev ? "" : DEFAULT_RUOYI_BASE_URL;
}

function resolveRequestLocale() {
  if (typeof document !== "undefined") {
    const documentLanguage = document.documentElement.lang?.trim();
    if (documentLanguage) return documentLanguage;
  }
  return import.meta.env.VITE_APP_DEFAULT_LOCALE;
}

export function appendDefaultHeaders(headers: Headers) {
  const clientId = import.meta.env.VITE_APP_CLIENT_ID?.trim();
  if (clientId) headers.set("Clientid", clientId);
  headers.set("Content-Language", resolveRequestLocale().replace("-", "_"));
}

export function resolveRequestUrl(baseURL: string | undefined, url: string) {
  if (!baseURL) return url;
  return new URL(url, baseURL).toString();
}

export function createRequestSignal(timeout: number, signal?: AbortSignal) {
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
      if (signal) signal.removeEventListener("abort", relayAbort);
    },
  };
}
