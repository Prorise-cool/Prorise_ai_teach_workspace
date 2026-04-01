import { emitAuthSignal } from '@/services/auth-signals';
import { readStoredAccessToken } from '@/services/auth-storage';

export type ApiRequestMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type ApiRequestConfig = {
  url: string;
  method?: ApiRequestMethod;
  data?: unknown;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  authSignalMode?: 'default' | 'silent';
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
  name = 'ApiClientError' as const;

  constructor(
    public status: number,
    message: string,
    public data?: unknown,
    public response?: ApiClientResponse<unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type CreateApiClientOptions = {
  baseURL?: string;
  credentials?: RequestCredentials;
  timeout?: number;
};

const DEFAULT_TIMEOUT = 15000;

function isJsonSerializableBody(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return false;
  }

  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return false;
  }

  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) {
    return false;
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return false;
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return false;
  }

  if (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream) {
    return false;
  }

  return true;
}

function parseErrorMessage(data: unknown, fallbackMessage: string) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'msg' in data &&
    typeof (data as { msg?: unknown }).msg === 'string' &&
    (data as { msg: string }).msg.trim().length > 0
  ) {
    return (data as { msg: string }).msg;
  }

  return fallbackMessage;
}

async function parseResponseBody(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json() as Promise<unknown>;
  }

  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function resolveRequestUrl(baseURL: string | undefined, url: string) {
  if (!baseURL) {
    return url;
  }

  return new URL(url, baseURL).toString();
}

function shouldAttachStoredAccessToken(url: string) {
  return !url.startsWith('/auth/login') && !url.startsWith('/auth/register');
}

function createRequestSignal(timeout: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const relayAbort = () => controller.abort(signal?.reason);

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener('abort', relayAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Request timeout'));
  }, timeout);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);

      if (signal) {
        signal.removeEventListener('abort', relayAbort);
      }
    }
  };
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function createApiClient({
  baseURL = import.meta.env.VITE_RUOYI_BASE_URL,
  credentials = 'include',
  timeout = DEFAULT_TIMEOUT
}: CreateApiClientOptions = {}): ApiClient {
  return {
    async request<T>({
      url,
      method = 'get',
      data,
      headers,
      credentials: requestCredentials,
      signal,
      authSignalMode = 'default'
    }: ApiRequestConfig) {
      const requestHeaders = new Headers(headers);
      const { signal: requestSignal, cleanup } = createRequestSignal(timeout, signal);
      const init: RequestInit = {
        method: method.toUpperCase(),
        credentials: requestCredentials ?? credentials,
        headers: requestHeaders,
        signal: requestSignal
      };
      const storedAccessToken = readStoredAccessToken();

      if (
        storedAccessToken &&
        !requestHeaders.has('Authorization') &&
        shouldAttachStoredAccessToken(url)
      ) {
        requestHeaders.set('Authorization', `Bearer ${storedAccessToken}`);
      }

      if (data !== undefined) {
        if (isJsonSerializableBody(data)) {
          requestHeaders.set('Content-Type', 'application/json');
          init.body = JSON.stringify(data);
        } else {
          init.body = data as BodyInit;
        }
      }

      try {
        const response = await fetch(resolveRequestUrl(baseURL, url), init);
        const parsedBody = await parseResponseBody(response);
        const result: ApiClientResponse<T> = {
          status: response.status,
          data: parsedBody as T,
          headers: response.headers
        };

        if (!response.ok) {
          const error = new ApiClientError(
            response.status,
            parseErrorMessage(parsedBody, response.statusText || '请求失败'),
            parsedBody,
            result as ApiClientResponse<unknown>
          );

          if (
            authSignalMode !== 'silent' &&
            (response.status === 401 || response.status === 403)
          ) {
            emitAuthSignal({
              status: response.status,
              message: error.message
            });
          }

          throw error;
        }

        return result;
      } catch (error) {
        if (isApiClientError(error)) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiClientError(408, '请求超时');
        }

        if (error instanceof Error) {
          throw new ApiClientError(500, error.message);
        }

        throw new ApiClientError(500, '网络请求失败');
      } finally {
        cleanup();
      }
    }
  };
}

export const apiClient = createApiClient();
