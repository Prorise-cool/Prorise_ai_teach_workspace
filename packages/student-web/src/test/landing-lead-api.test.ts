/**
 * 文件说明：验证落地页线索 API 的 RuoYi 契约映射与异常边界。
 */
import {
  createLandingLeadApi,
  LANDING_LEAD_API_PATH
} from '@/features/home/api/landing-lead-api';

type RecordedRequest = {
  url?: string;
  method?: string;
  data?: unknown;
  authFailureMode?: string;
};

describe('landing lead api', () => {
  it('posts lead payload to the public endpoint and unwraps generated id fields', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      status: 200,
      data: {
        code: 200,
        msg: '提交成功',
        data: {
          id: 101,
          accepted: 1,
          message: '线索已受理'
        }
      }
    });
    const api = createLandingLeadApi({
      client: {
        request
      } as never
    });

    const result = await api.submitLead({
      contactName: '小林',
      organizationName: '计算机学院',
      contactEmail: 'pilot@example.com',
      subject: '教师试点合作',
      message: '希望了解试点方案',
      sourcePage: '/landing',
      sourceLocale: 'zh-CN'
    });

    const requestConfig = request.mock.calls[0]?.[0] as RecordedRequest | undefined;

    expect(requestConfig).toMatchObject({
      url: LANDING_LEAD_API_PATH,
      method: 'post',
      authFailureMode: 'manual'
    });
    expect(requestConfig?.data).toMatchObject({
      contactName: '小林',
      organizationName: '计算机学院',
      contactEmail: 'pilot@example.com',
      subject: '教师试点合作',
      message: '希望了解试点方案',
      sourcePage: '/landing',
      sourceLocale: 'zh-CN'
    });
    expect(result).toEqual({
      leadId: '101',
      accepted: true,
      message: '线索已受理'
    });
  });

  it('supports alternate payload keys from generated RuoYi responses', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      status: 200,
      data: {
        code: 200,
        msg: 'Accepted',
        data: {
          lead_id: 'lead-001',
          accepted: 'true'
        }
      }
    });
    const api = createLandingLeadApi({
      client: {
        request
      } as never
    });

    const result = await api.submitLead({
      contactName: 'Lin',
      contactEmail: 'pilot@example.com',
      subject: 'Teacher pilot',
      message: 'Need a trial for our school',
      sourcePage: '/landing',
      sourceLocale: 'en-US'
    });

    expect(result).toEqual({
      leadId: 'lead-001',
      accepted: true,
      message: 'Accepted'
    });
  });

  it('throws the RuoYi business message when the submission is rejected', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      status: 200,
      data: {
        code: 500,
        msg: '请勿重复提交',
        data: null
      }
    });
    const api = createLandingLeadApi({
      client: {
        request
      } as never
    });

    await expect(
      api.submitLead({
        contactName: '小林',
        contactEmail: 'pilot@example.com',
        subject: '教师试点合作',
        message: '希望了解试点方案',
        sourcePage: '/landing',
        sourceLocale: 'zh-CN'
      })
    ).rejects.toThrow('请勿重复提交');
  });
});
