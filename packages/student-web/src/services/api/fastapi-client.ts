/**
 * 文件说明：面向 FastAPI 后端的共享 API 客户端。
 * 自动从 auth session store 读取 Bearer token 并注入到请求头中。
 * 所有 FastAPI adapter 统一使用此实例，避免重复创建和 token 注入逻辑分散。
 */
import { createApiClient } from "@/services/api/client";
import { resolveFastapiBaseUrl } from "@/services/api/fastapi-base-url";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/**
 * 从当前 auth session store 中获取 accessToken。
 * 以非响应式方式读取（getState），适合在请求发起时动态取值。
 *
 * @returns 当前有效的 accessToken，或 null。
 */
function getSessionAccessToken(): string | null {
  return useAuthSessionStore.getState().session?.accessToken ?? null;
}

/**
 * 面向 FastAPI 后端的共享 API 客户端。
 * 自动在每次请求时注入 Authorization: Bearer {token}。
 */
export const fastapiClient = createApiClient({
  baseURL: resolveFastapiBaseUrl(),
  getAccessToken: getSessionAccessToken,
});

/**
 * 构建当前用户的 Bearer token 请求头。
 * 供 mock 模式下原生 fetch 调用使用，与 fastapiClient 自动注入保持一致。
 *
 * @returns 包含 Authorization 的请求头对象，无 token 时返回空对象。
 */
export function buildFastapiAuthHeaders(): Record<string, string> {
  const token = getSessionAccessToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}
