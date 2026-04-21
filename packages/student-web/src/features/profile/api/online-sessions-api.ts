/**
 * 文件说明：调用 RuoYi 在线设备监控接口（Epic-9 Settings 多端 session）。
 * 对应后端 SysUserOnlineController：
 *   - GET  /monitor/online          查询当前登录用户的全部在线设备
 *   - DELETE /monitor/online/myself/{tokenId}  由用户自己踢掉某端
 */
import { readNumberProperty, readRecord, readStringProperty } from '@/lib/type-guards';
import { ApiClientError } from '@/services/api/client';
import type { ApiClient } from '@/services/api/client';
import { ruoyiClient } from '@/services/api/ruoyi-client';
import type { RuoyiEnvelope } from '@/types/auth';

export type OnlineSession = {
  tokenId: string;
  userName: string | null;
  ipaddr: string | null;
  loginLocation: string | null;
  browser: string | null;
  os: string | null;
  loginTime: number | null;
};

type TableDataInfoEnvelope<T> = {
  code: number;
  msg: string;
  rows: T[];
  total: number;
};

type OnlineSessionRow = {
  tokenId?: string | null;
  userName?: string | null;
  ipaddr?: string | null;
  loginLocation?: string | null;
  browser?: string | null;
  os?: string | null;
  loginTime?: number | null;
};

function unwrapRuoyiEnvelope<T>(payload: unknown, status: number): T {
  const envelope = readRecord(payload);

  if (!envelope) {
    throw new ApiClientError(status, '在线设备接口返回异常', payload);
  }

  const businessCode = readNumberProperty(envelope, 'code');
  const message = readStringProperty(envelope, 'msg') ?? '在线设备接口返回异常';

  if (businessCode === undefined) {
    throw new ApiClientError(status, '在线设备接口返回异常', payload);
  }

  if (status >= 400 || businessCode !== 200) {
    throw new ApiClientError(status, message, payload);
  }

  return envelope as unknown as T;
}

function mapOnlineSession(row: OnlineSessionRow): OnlineSession | null {
  if (!row.tokenId) {
    return null;
  }
  return {
    tokenId: row.tokenId,
    userName: row.userName ?? null,
    ipaddr: row.ipaddr ?? null,
    loginLocation: row.loginLocation ?? null,
    browser: row.browser ?? null,
    os: row.os ?? null,
    loginTime: typeof row.loginTime === 'number' ? row.loginTime : null,
  };
}

/**
 * 查询当前登录用户的在线设备列表。
 *
 * RuoYi 使用 `TableDataInfo` 返回 `rows: SysUserOnline[]`，列表按 loginTime 逆序。
 */
export async function listCurrentOnlineSessions(
  { client = ruoyiClient }: { client?: ApiClient } = {},
): Promise<OnlineSession[]> {
  const response = await client.request<TableDataInfoEnvelope<OnlineSessionRow>>({
    url: '/monitor/online',
    method: 'get',
  });

  const envelope = unwrapRuoyiEnvelope<TableDataInfoEnvelope<OnlineSessionRow>>(
    response.data,
    response.status,
  );

  const rows = Array.isArray(envelope.rows) ? envelope.rows : [];
  return rows
    .map(mapOnlineSession)
    .filter((item): item is OnlineSession => item !== null);
}

/**
 * 自己踢掉当前用户的指定在线设备（需要 token 属于当前 loginId）。
 */
export async function kickCurrentOnlineSession(
  tokenId: string,
  { client = ruoyiClient }: { client?: ApiClient } = {},
): Promise<void> {
  const response = await client.request<RuoyiEnvelope<null>>({
    url: `/monitor/online/myself/${encodeURIComponent(tokenId)}`,
    method: 'delete',
  });

  unwrapRuoyiEnvelope<RuoyiEnvelope<null>>(response.data, response.status);
}
