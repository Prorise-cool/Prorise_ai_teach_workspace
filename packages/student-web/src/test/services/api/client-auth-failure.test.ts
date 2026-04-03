/**
 * 文件说明：验证 API Client 的全局 401 / 403 认证失败分发。
 */
import { setAuthFailureHandler } from '@/services/api/auth-failure';
import { createApiClient } from '@/services/api/client';

describe('api client auth failure dispatch', () => {
  afterEach(() => {
    setAuthFailureHandler(null);
    vi.unstubAllGlobals();
  });

  it('emits a 401 auth failure event for protected requests by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 401, msg: '当前会话已失效，请重新登录' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
    const handler = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    setAuthFailureHandler(handler);

    const client = createApiClient({
      baseURL: 'http://api.prorise.local'
    });

    await expect(
      client.request({
        url: '/protected',
        method: 'get'
      })
    ).rejects.toMatchObject({
      status: 401
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        message: '当前会话已失效，请重新登录',
        requestUrl: 'http://api.prorise.local/protected',
        responseCode: '401'
      })
    );
  });

  it('emits a 403 auth failure event and keeps the upstream message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 403, msg: '当前账号暂无访问权限' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
    const handler = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    setAuthFailureHandler(handler);

    const client = createApiClient({
      baseURL: 'http://api.prorise.local'
    });

    await expect(
      client.request({
        url: '/permission-probe',
        method: 'get'
      })
    ).rejects.toMatchObject({
      status: 403
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 403,
        message: '当前账号暂无访问权限',
        responseCode: '403'
      })
    );
  });

  it('does not emit auth failure events for requests opting into manual handling', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 401, msg: '登录失败' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
    const handler = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    setAuthFailureHandler(handler);

    const client = createApiClient({
      baseURL: 'http://api.prorise.local'
    });

    await expect(
      client.request({
        url: '/auth/login',
        method: 'post',
        authFailureMode: 'manual'
      })
    ).rejects.toMatchObject({
      status: 401
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
