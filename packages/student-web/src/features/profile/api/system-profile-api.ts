/**
 * 文件说明：调用 RuoYi 系统个人信息接口（昵称、手机号等）。
 * 对应后端 SysProfileController#updateProfile，BO 包含 nickName/email/phonenumber/sex。
 */
import { readNumberProperty, readRecord, readStringProperty } from '@/lib/type-guards';
import type { ApiClient } from '@/services/api/client';
import { ApiClientError } from '@/services/api/client';
import { ruoyiClient } from '@/services/api/ruoyi-client';
import type { RuoyiEnvelope } from '@/types/auth';

type UpdateSystemProfileInput = {
  nickName?: string;
  email?: string;
  phonenumber?: string;
  sex?: string;
};

function unwrapRuoyiEnvelope(payload: unknown, status: number) {
  const envelope = readRecord(payload);

  if (!envelope) {
    throw new ApiClientError(status, '个人信息接口返回异常', payload);
  }

  const businessCode = readNumberProperty(envelope, 'code');
  const message = readStringProperty(envelope, 'msg') ?? '个人信息接口返回异常';

  if (businessCode === undefined) {
    throw new ApiClientError(status, '个人信息接口返回异常', payload);
  }

  if (status >= 400 || businessCode !== 200) {
    throw new ApiClientError(status, message, payload);
  }
}

export async function updateCurrentSystemProfile(
  input: UpdateSystemProfileInput,
  { client = ruoyiClient }: { client?: ApiClient } = {},
) {
  const response = await client.request<RuoyiEnvelope<null>>({
    url: '/system/user/profile',
    method: 'put',
    data: input,
  });

  unwrapRuoyiEnvelope(response.data, response.status);
}

/**
 * 单独更新当前登录用户的手机号（Epic-9 Settings/安全）。
 * 复用 RuoYi `/system/user/profile` PUT：只携带 phonenumber 字段。
 */
export async function updateCurrentSystemPhone(
  phonenumber: string,
  { client = ruoyiClient }: { client?: ApiClient } = {},
) {
  return updateCurrentSystemProfile({ phonenumber }, { client });
}

