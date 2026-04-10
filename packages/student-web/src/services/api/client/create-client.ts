/**
 * 文件说明：创建统一的 Fetch API Client 工厂函数。
 */
import {
  readNumberProperty,
  readRecord,
} from "@/lib/type-guards";
import {
  emitAuthFailure,
  isAuthFailureStatus,
} from "@/services/api/auth-failure";
import type { ApiRequestMethod } from "./request-encryption";
import {
  shouldEncryptRequest,
  createEncryptedRequestBody,
  isJsonSerializableBody,
} from "./request-encryption";
import { parseResponseBody } from "./response-parser";
import { parseErrorMessage } from "./error-normalization";
import {
  type ApiRequestConfig,
  type ApiClientResponse,
  type ApiClient,
  ApiClientError,
  resolveRuoyiBaseUrl,
  appendDefaultHeaders,
  resolveRequestUrl,
  createRequestSignal,
} from "./client-helpers";

type CreateApiClientOptions = {
  baseURL?: string;
  credentials?: RequestCredentials;
  timeout?: number;
  getAccessToken?: () => string | null;
};

const DEFAULT_TIMEOUT = 15000;

function prepareRequestBody(
  method: ApiRequestMethod,
  encrypt: boolean | undefined,
  data: unknown,
  headers: Headers,
): BodyInit | undefined {
  if (data === undefined) return undefined;

  if (shouldEncryptRequest(method, encrypt)) {
    const encryptedRequest = createEncryptedRequestBody(data);
    headers.set("Content-Type", "application/json");
    headers.set(encryptedRequest.headerName, encryptedRequest.headerValue);
    return encryptedRequest.body;
  }

  if (isJsonSerializableBody(data)) {
    headers.set("Content-Type", "application/json");
    return JSON.stringify(data);
  }

  return data as BodyInit;
}

function handleResponseError<T>(
  response: Response,
  parsedBody: unknown,
  result: ApiClientResponse<T>,
  requestUrl: string,
  authFailureMode: string,
): never {
  const errorMessage = parseErrorMessage(parsedBody, response.statusText || "请求失败");

  if (authFailureMode !== "manual" && isAuthFailureStatus(response.status)) {
    const payload = readRecord(parsedBody);
    const responseCode = payload ? readNumberProperty(payload, "code") : undefined;

    emitAuthFailure({
      status: response.status,
      message: errorMessage,
      requestUrl,
      responseCode: responseCode !== undefined ? String(responseCode) : null,
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

function normalizeFetchError(error: unknown): never {
  if (error instanceof ApiClientError) throw error;
  if (error instanceof Error && error.name === "AbortError") {
    throw new ApiClientError(408, "请求超时");
  }
  if (error instanceof Error) {
    throw new ApiClientError(500, error.message);
  }
  throw new ApiClientError(500, "网络请求失败");
}

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

      if (getAccessToken && !requestHeaders.has("Authorization")) {
        const token = getAccessToken();
        if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
      }

      const { signal: requestSignal, cleanup } = createRequestSignal(timeout, signal);
      appendDefaultHeaders(requestHeaders);
      const body = prepareRequestBody(method, encrypt, data, requestHeaders);

      const init: RequestInit = {
        method: method.toUpperCase(),
        credentials: requestCredentials ?? credentials,
        headers: requestHeaders,
        signal: requestSignal,
        ...(body !== undefined ? { body } : {}),
      };

      try {
        const response = await fetch(requestUrl, init);
        const parsedBody = await parseResponseBody(response);
        const result: ApiClientResponse<T> = {
          status: response.status,
          data: parsedBody as T,
          headers: response.headers,
        };

        if (!response.ok) {
          handleResponseError(response, parsedBody, result, requestUrl, authFailureMode);
        }

        return result;
      } catch (error) {
        normalizeFetchError(error);
      } finally {
        cleanup();
      }
    },
  };
}

export const apiClient = createApiClient();
