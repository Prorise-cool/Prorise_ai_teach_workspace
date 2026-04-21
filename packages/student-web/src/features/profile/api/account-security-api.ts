/**
 * 文件说明：账号安全相关 API（Epic 9 Settings）。
 * 当前用于：修改密码（真实 RuoYi 后端承接）。
 */
import { readNumberProperty, readRecord, readStringProperty } from '@/lib/type-guards';
import { ApiClientError } from '@/services/api/client';
import { ruoyiClient } from '@/services/api/ruoyi-client';
import { AUTH_SUCCESS_CODE, type RuoyiEnvelope } from '@/types/auth';

type UpdatePasswordInput = {
  oldPassword: string;
  newPassword: string;
};

function unwrapRuoyiEnvelope<T>(payload: unknown, status: number) {
  const envelope = readRecord(payload);

  if (!envelope) {
    throw new ApiClientError(status, '账号安全接口返回异常', payload);
  }

  const businessCode = readNumberProperty(envelope, 'code');
  const message = readStringProperty(envelope, 'msg') ?? '账号安全接口返回异常';

  if (businessCode === undefined) {
    throw new ApiClientError(status, '账号安全接口返回异常', payload);
  }

  if (status >= 400 || businessCode !== AUTH_SUCCESS_CODE) {
    throw new ApiClientError(status, message, payload);
  }

  return envelope.data as T;
}

/**
 * 修改当前登录用户密码（RuoYi `/system/user/profile/updatePwd`）。
 *
 * 注意：该接口启用 `@ApiEncrypt`，需要 `encrypt: true`。
 */
export async function updateCurrentPassword(input: UpdatePasswordInput) {
  const response = await ruoyiClient.request<RuoyiEnvelope<null>>({
    url: '/system/user/profile/updatePwd',
    method: 'put',
    data: input,
    encrypt: true,
  });

  unwrapRuoyiEnvelope(response.data, response.status);
}

