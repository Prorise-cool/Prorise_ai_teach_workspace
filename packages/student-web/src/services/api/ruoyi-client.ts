/**
 * 文件说明：面向 RuoYi 后端的共享 API 客户端。
 * 自动从 auth session store 读取 Bearer token 并注入到请求头中。
 */
import { createApiClient } from '@/services/api/client';
import { useAuthSessionStore } from '@/stores/auth-session-store';

function getSessionAccessToken(): string | null {
  return useAuthSessionStore.getState().session?.accessToken ?? null;
}

/**
 * 面向 RuoYi 后端的共享 API 客户端。
 * 默认 baseURL 由 `resolveRuoyiBaseUrl()` 决定（dev 下走 Vite proxy）。
 */
export const ruoyiClient = createApiClient({
  getAccessToken: getSessionAccessToken,
});

export function buildRuoyiAuthHeaders(): Record<string, string> {
  const token = getSessionAccessToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

