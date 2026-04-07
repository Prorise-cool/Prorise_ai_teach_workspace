/**
 * 文件说明：解析 FastAPI 服务基准地址。
 * 独立于具体业务模块，供所有 FastAPI adapter 和 client 复用。
 */

const DEFAULT_FASTAPI_BASE_URL = "http://127.0.0.1:8090";

/**
 * 解析 FastAPI 服务基准地址。
 * 开发环境优先走同源代理，避免浏览器直连双后端时触发跨域预检问题。
 *
 * @param configuredBaseUrl - 显式传入的后端基准地址。
 * @param isDev - 当前是否为开发环境。
 * @returns 可用的 FastAPI 基准地址。
 */
export function resolveFastapiBaseUrl(
  configuredBaseUrl = import.meta.env.VITE_FASTAPI_BASE_URL,
  isDev = import.meta.env.DEV,
) {
  const normalizedBaseUrl = configuredBaseUrl?.trim();

  if (normalizedBaseUrl) {
    return normalizedBaseUrl;
  }

  return isDev ? "" : DEFAULT_FASTAPI_BASE_URL;
}
