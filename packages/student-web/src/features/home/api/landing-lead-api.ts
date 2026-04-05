/**
 * 文件说明：封装营销落地页线索提交 API。
 * 负责把公开表单请求对齐到 RuoYi 公共接口，并兼容生成代码常见的字段命名差异。
 */
import {
  apiClient,
  ApiClientError,
  type ApiClient,
  type ApiRequestConfig
} from '@/services/api/client';
import {
  readNumberProperty,
  readRecord,
  readStringProperty
} from '@/lib/type-guards';
import { AUTH_SUCCESS_CODE, type RuoyiEnvelope } from '@/types/auth';

export const LANDING_LEAD_API_PATH = '/api/public/landing-leads';

export type CreateLandingLeadInput = {
  contactName: string;
  organizationName?: string;
  contactEmail: string;
  subject: string;
  message: string;
  sourcePage: string;
  sourceLocale: string;
};

export type CreateLandingLeadResult = {
  leadId: string;
  accepted: boolean;
  message: string;
};

type LandingLeadPayload = {
  leadId?: string | number | null;
  lead_id?: string | number | null;
  id?: string | number | null;
  accepted?: boolean | number | string | null;
  message?: string | null;
  msg?: string | null;
};

type LandingLeadApi = {
  submitLead(input: CreateLandingLeadInput): Promise<CreateLandingLeadResult>;
};

type CreateLandingLeadApiOptions = {
  client?: ApiClient;
};

type EnvelopeResult<T> = {
  data: T;
  message: string;
};

/**
 * 读取 RuoYi 包装中的业务数据。
 *
 * @param payload - 接口原始负载。
 * @param status - HTTP 状态码。
 * @returns 已校验的业务数据与提示文案。
 * @throws {ApiClientError} 当接口包装异常或业务码失败时抛出。
 */
function unwrapRuoyiEnvelope<T>(payload: unknown, status: number): EnvelopeResult<T> {
  const envelope = readRecord(payload);

  if (!envelope) {
    throw new ApiClientError(status, '落地页线索接口返回异常', payload);
  }

  const businessCode = readNumberProperty(envelope, 'code');
  const message =
    readStringProperty(envelope, 'msg') ?? '落地页线索接口返回异常';

  if (businessCode === undefined) {
    throw new ApiClientError(status, '落地页线索接口返回异常', payload);
  }

  if (status >= 400 || businessCode !== AUTH_SUCCESS_CODE) {
    throw new ApiClientError(status, message, payload);
  }

  return {
    data: envelope.data as T,
    message
  };
}

/**
 * 将主键类字段统一转换成字符串。
 *
 * @param value - 原始值。
 * @returns 规范化后的字符串主键。
 */
function normalizeLeadId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

/**
 * 解析后端返回的 accepted 标记，兼容布尔、数字和字符串。
 *
 * @param value - 原始 accepted 值。
 * @returns 是否受理；缺省时返回 `true`。
 */
function parseAcceptedFlag(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === '1' || normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === '0' || normalizedValue === 'false') {
      return false;
    }
  }

  return true;
}

/**
 * 提交落地页线索并解包 RuoYi 响应。
 *
 * @param client - API client。
 * @param config - 请求配置。
 * @returns 落地页线索业务结果。
 */
async function requestLandingLeadEnvelope<T>(
  client: ApiClient,
  config: ApiRequestConfig
) {
  const response = await client.request<RuoyiEnvelope<T>>({
    ...config,
    authFailureMode: 'manual'
  });

  return unwrapRuoyiEnvelope<T>(response.data, response.status);
}

/**
 * 创建真实落地页线索 API。
 *
 * @param options - 初始化选项。
 * @returns 线索提交通道。
 */
export function createLandingLeadApi({
  client = apiClient
}: CreateLandingLeadApiOptions = {}): LandingLeadApi {
  return {
    async submitLead(input) {
      const { data, message } = await requestLandingLeadEnvelope<LandingLeadPayload>(
        client,
        {
          url: LANDING_LEAD_API_PATH,
          method: 'post',
          data: input
        }
      );
      const payload = readRecord(data) ?? {};
      const leadId = normalizeLeadId(
        payload.leadId ?? payload.lead_id ?? payload.id
      );

      return {
        leadId,
        accepted: parseAcceptedFlag(payload.accepted),
        message:
          readStringProperty(payload, 'message')
          ?? readStringProperty(payload, 'msg')
          ?? message
      };
    }
  };
}

export const landingLeadApi = createLandingLeadApi();
