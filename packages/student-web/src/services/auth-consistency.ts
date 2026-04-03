/**
 * 文件说明：封装 Story 1.3 所需的前后端认证一致性探针请求。
 * 负责向 FastAPI 发送受保护访问验证与权限不足验证请求。
 */
import {
  createApiClient,
  isApiClientError,
  type ApiClient,
  type ApiRequestConfig
} from '@/services/api/client';

const DEFAULT_FASTAPI_BASE_URL = 'http://127.0.0.1:8090';

/**
 * 解析 FastAPI 服务基准地址。
 * 开发环境优先走同源代理，避免浏览器验证 Story 1.3 时被跨域策略拦截。
 *
 * @param configuredBaseUrl - 显式传入的后端基准地址。
 * @param isDev - 当前是否为开发环境。
 * @returns 可用的 FastAPI 基准地址。
 */
export function resolveFastapiBaseUrl(
  configuredBaseUrl = import.meta.env.VITE_FASTAPI_BASE_URL,
  isDev = import.meta.env.DEV
) {
  const normalizedBaseUrl = configuredBaseUrl?.trim();

  if (normalizedBaseUrl) {
    return normalizedBaseUrl;
  }

  return isDev ? '' : DEFAULT_FASTAPI_BASE_URL;
}

const fastapiClient = createApiClient({
  baseURL: resolveFastapiBaseUrl()
});

type DataEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

export type AuthSessionProbe = {
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
  onlineTtlSeconds: number | null;
  requestId: string | null;
};

export type AuthPermissionProbe = AuthSessionProbe & {
  requiredPermission: string;
  granted: boolean;
};

export class AuthConsistencyServiceError extends Error {
  name = 'AuthConsistencyServiceError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface AuthConsistencyService {
  getSessionProbe(accessToken?: string): Promise<AuthSessionProbe>;
  getPermissionProbe(
    requiredPermission: string,
    accessToken?: string
  ): Promise<AuthPermissionProbe>;
}

/**
 * 生成认证请求头。
 *
 * @param accessToken - 可选访问令牌。
 * @returns 认证请求头。
 */
function createAuthHeaders(accessToken?: string) {
  const headers = new Headers();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

/**
 * 把底层 API Client 异常映射为认证一致性服务错误。
 *
 * @param error - 原始异常对象。
 * @returns 统一服务错误。
 */
function mapAuthConsistencyError(error: unknown) {
  if (isApiClientError(error)) {
    const payload = error.data as
      | {
          code?: number | string;
          msg?: string;
        }
      | undefined;

    return new AuthConsistencyServiceError(
      error.status,
      String(payload?.code ?? error.status),
      payload?.msg ?? error.message
    );
  }

  if (error instanceof AuthConsistencyServiceError) {
    return error;
  }

  return new AuthConsistencyServiceError(
    500,
    '500',
    error instanceof Error ? error.message : '认证一致性校验失败'
  );
}

/**
 * 发送探针请求并解包业务数据。
 *
 * @param client - API Client 实例。
 * @param config - 请求配置。
 * @returns 解包后的业务数据。
 */
async function requestProbeData<T>(
  client: ApiClient,
  config: ApiRequestConfig
) {
  try {
    const response = await client.request<DataEnvelope<T>>(config);

    return response.data.data;
  } catch (error) {
    throw mapAuthConsistencyError(error);
  }
}

/**
 * 创建认证一致性服务。
 *
 * @param client - 可替换的 API Client。
 * @returns 认证一致性服务实例。
 */
export function createAuthConsistencyService(
  client: ApiClient = fastapiClient
): AuthConsistencyService {
  return {
    getSessionProbe(accessToken) {
      return requestProbeData<AuthSessionProbe>(client, {
        url: '/api/v1/contracts/session-probe',
        method: 'get',
        headers: createAuthHeaders(accessToken)
      });
    },
    getPermissionProbe(requiredPermission, accessToken) {
      return requestProbeData<AuthPermissionProbe>(client, {
        url: `/api/v1/contracts/permission-probe?permission=${encodeURIComponent(requiredPermission)}`,
        method: 'get',
        headers: createAuthHeaders(accessToken)
      });
    }
  };
}

export const authConsistencyService = createAuthConsistencyService();
