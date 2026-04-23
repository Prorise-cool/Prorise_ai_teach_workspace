/**
 * 文件说明：后端统一返回包 `{ code, msg, data }` 与 ApiClient 响应外壳的
 * 解包工具。
 *
 * 后端约定所有业务接口返回 `{ code: number, msg: string, data: T }` 信封，
 * ApiClient 又会把整个信封塞进 `ApiClientResponse.data`，导致每个 adapter
 * 都要写 `response.data.data` 双重解嵌套。这里提供一个语义化 helper 减少
 * 噪音并集中收口（未来若信封字段名变化只需改一处）。
 */
import type { ApiClientResponse } from './client/client-helpers';

/**
 * 后端通用响应信封。
 *
 * @typeParam T - 业务负载类型。
 */
export interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

/**
 * 解包 `ApiClient.request<ApiEnvelope<T>>` 的双层嵌套响应，
 * 取出业务数据 `data`。
 *
 * @typeParam T - 业务负载类型。
 * @param response - `ApiClient.request<ApiEnvelope<T>>` 的返回值，或任意
 *   形如 `{ data: { data: T } }` 的兼容结构（如带额外字段的视频信封）。
 * @returns 业务负载数据 `T`。
 *
 * @example
 * ```ts
 * const response = await client.request<ApiEnvelope<UserProfile>>({...});
 * const profile = unwrapEnvelope(response);
 * ```
 */
export function unwrapEnvelope<T>(
  response: ApiClientResponse<{ data: T }>,
): T {
  return response.data.data;
}
