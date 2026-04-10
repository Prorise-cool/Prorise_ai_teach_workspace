/**
 * 文件说明：API Client 模块统一导出入口。
 * 保持与原 client.ts 完全一致的公开 API。
 */

export type { ApiRequestMethod } from "./request-encryption";
export type { ApiRequestConfig, ApiClientResponse, ApiClient } from "./client-helpers";
export {
  ApiClientError,
  withAuthHeader,
  isApiClientError,
  resolveRuoyiBaseUrl,
} from "./client-helpers";
export { createApiClient, apiClient } from "./create-client";
