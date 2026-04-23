/**
 * 文件说明：封装 Story 1.3 所需的前后端认证一致性探针请求。
 * 负责向 FastAPI 发送受保护访问验证与权限不足验证请求。
 */
import {
  isApiClientError,
  withAuthHeader,
  type ApiClient,
  type ApiRequestConfig,
} from '@/services/api/client';
import { unwrapEnvelope } from '@/services/api/envelope';
import { fastapiClient } from '@/services/api/fastapi-client';

/* 保持向后兼容：外部模块仍可从此处导入 resolveFastapiBaseUrl。 */
export { resolveFastapiBaseUrl } from '@/services/api/fastapi-base-url';

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

/* createAuthHeaders 已被 withAuthHeader 替代，不再在此重复定义。 */

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

    return unwrapEnvelope(response);
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
        headers: withAuthHeader(undefined, accessToken),
      });
    },
    getPermissionProbe(requiredPermission, accessToken) {
      return requestProbeData<AuthPermissionProbe>(client, {
        url: `/api/v1/contracts/permission-probe?permission=${encodeURIComponent(requiredPermission)}`,
        method: 'get',
        headers: withAuthHeader(undefined, accessToken),
      });
    }
  };
}

export const authConsistencyService = createAuthConsistencyService();
