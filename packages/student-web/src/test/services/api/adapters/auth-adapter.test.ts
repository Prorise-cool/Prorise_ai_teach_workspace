/**
 * 文件说明：验证认证 adapter 的契约映射与真实接口请求格式。
 */
import {
  AuthAdapterError,
  createAuthError,
  createRealAuthAdapter,
  mapRuoyiLoginToken,
  mapRuoyiUserInfo
} from '@/services/api/adapters';
import { ApiClientError } from '@/services/api/client';
import { createAuthService, normalizeReturnTo } from '@/services/auth';
import { authMockFixtures } from '@/services/mock/fixtures/auth';
import {
  AUTH_DEFAULT_USER_TYPE,
  DEFAULT_AUTH_RETURN_TO
} from '@/types/auth';

type AuthEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

type RecordedRequest = {
  url?: string;
  method?: string;
  data?: Record<string, unknown>;
  headers?: Headers | Record<string, string>;
  encrypt?: boolean;
};

/**
 * 生成测试用的 ApiClientError。
 *
 * @param status - HTTP 状态码。
 * @param payload - 错误 payload。
 * @returns API Client 错误实例。
 */
function createApiClientError<T>(status: number, payload: AuthEnvelope<T>) {
  return new ApiClientError(status, payload.msg, payload, {
    status,
    data: payload,
    headers: new Headers()
  });
}

describe('auth adapter contract helpers', () => {
  it('maps RuoYi token payload and current user payload into stable domain objects', () => {
    const token = mapRuoyiLoginToken(authMockFixtures.student.tokenPayload);
    const user = mapRuoyiUserInfo(authMockFixtures.student.userInfoPayload);

    expect(token).toMatchObject({
      accessToken: 'mock-auth-student-access-token',
      refreshToken: 'mock-auth-student-refresh-token',
      clientId: 'student-web',
      scopes: ['openid', 'profile']
    });
    expect(user).toMatchObject({
      id: '10001',
      nickname: '小麦同学',
      avatarUrl: 'https://static.prorise.test/avatar/student.png'
    });
    expect(user.roles).toEqual([{ key: 'student', name: '学生' }]);
    expect(user.permissions).toEqual([
      { key: 'video:task:add' },
      { key: 'classroom:session:add' }
    ]);
  });

  it('normalizes nullable token fields from RuoYi password login responses', () => {
    const token = mapRuoyiLoginToken({
      access_token: 'real-access-token',
      refresh_token: null,
      expire_in: 604800,
      refresh_expire_in: null,
      client_id: 'e5cd7e4891bf95d1d19206ce24a7b32e',
      openid: null,
      scope: undefined
    });

    expect(token).toMatchObject({
      accessToken: 'real-access-token',
      refreshToken: null,
      expiresIn: 604800,
      refreshExpiresIn: null,
      clientId: 'e5cd7e4891bf95d1d19206ce24a7b32e',
      openId: null,
      scopes: []
    });
  });

  it('sanitizes returnTo values to app-internal non-login routes only', () => {
    expect(normalizeReturnTo('/video/input?mode=single#draft')).toBe(
      '/video/input?mode=single#draft'
    );
    expect(normalizeReturnTo('/login?returnTo=/video/input')).toBe(
      DEFAULT_AUTH_RETURN_TO
    );
    expect(normalizeReturnTo('https://evil.example/phish')).toBe(
      DEFAULT_AUTH_RETURN_TO
    );
    expect(normalizeReturnTo('//evil.example/phish')).toBe(
      DEFAULT_AUTH_RETURN_TO
    );
    expect(normalizeReturnTo(undefined)).toBe(DEFAULT_AUTH_RETURN_TO);
  });

  it('converts 401 and 403 semantics into AuthAdapterError instances', () => {
    const unauthorizedError = createAuthError(
      401,
      401,
      '当前会话已失效，请重新登录'
    );
    const forbiddenError = createAuthError(
      403,
      403,
      '当前账号暂无小麦学生端访问权限'
    );

    expect(unauthorizedError).toBeInstanceOf(AuthAdapterError);
    expect(unauthorizedError).toMatchObject({
      status: 401,
      code: '401',
      message: '当前会话已失效，请重新登录'
    });

    expect(forbiddenError).toBeInstanceOf(AuthAdapterError);
    expect(forbiddenError).toMatchObject({
      status: 403,
      code: '403',
      message: '当前账号暂无小麦学生端访问权限'
    });
  });
});

describe('real adapter integration', () => {
  it('lets auth service compose a full session from login token and current user', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '登录成功',
          data: authMockFixtures.admin.tokenPayload
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '获取成功',
          data: authMockFixtures.admin.userInfoPayload
        }
      });

    const service = createAuthService(
      createRealAuthAdapter({
        client: {
          request
        } as never
      })
    );

    const session = await service.login({
      username: 'admin',
      password: 'admin123'
    });

    const requestCalls = request.mock.calls as unknown[][];
    const firstRequest = requestCalls[0]?.[0] as RecordedRequest | undefined;
    const secondRequest = requestCalls[1]?.[0] as RecordedRequest | undefined;
    const secondRequestHeaders = secondRequest?.headers as Headers | undefined;

    expect(firstRequest).toMatchObject({
      url: '/auth/login',
      method: 'post',
      encrypt: true
    });
    expect(firstRequest?.data).toMatchObject({
      tenantId: '000000',
      grantType: 'password'
    });
    expect(secondRequest).toMatchObject({
      url: '/system/user/getInfo',
      method: 'get'
    });
    expect(secondRequestHeaders).toBeInstanceOf(Headers);
    expect(secondRequestHeaders?.get('Authorization')).toBe(
      'Bearer mock-auth-admin-access-token'
    );
    expect(session.user.nickname).toBe('平台管理员');
  });

  it('submits register payloads to the shared auth register endpoint', async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        code: 200,
        msg: '注册成功',
        data: null
      }
    });
    const adapter = createRealAuthAdapter({
      client: {
        request
      } as never
    });

    await expect(
      adapter.register({
        username: 'new_student',
        password: 'Passw0rd!',
        confirmPassword: 'Passw0rd!',
        code: 'A1B2',
        uuid: 'captcha-uuid',
        clientId: 'demo-client'
      })
    ).resolves.toBeUndefined();

    const registerRequest = request.mock.calls[0]?.[0] as RecordedRequest | undefined;

    expect(registerRequest).toMatchObject({
      url: '/auth/register',
      method: 'post',
      encrypt: true
    });
    expect(registerRequest?.data).toMatchObject({
      username: 'new_student',
      password: 'Passw0rd!',
      confirmPassword: 'Passw0rd!',
      tenantId: '000000',
      grantType: 'password',
      userType: AUTH_DEFAULT_USER_TYPE,
      clientId: 'demo-client',
      code: 'A1B2',
      uuid: 'captcha-uuid'
    });
  });

  it('sends social callback payloads through the shared login endpoint', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '登录成功',
          data: authMockFixtures.social.tokenPayload
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '获取成功',
          data: authMockFixtures.social.userInfoPayload
        }
      });

    const service = createAuthService(
      createRealAuthAdapter({
        client: {
          request
        } as never
      })
    );

    await service.login({
      grantType: 'social',
      source: 'github',
      socialCode: 'oauth-code',
      socialState: 'oauth-state'
    });

    const firstRequest = request.mock.calls[0]?.[0] as RecordedRequest | undefined;

    expect(firstRequest?.data).toMatchObject({
      tenantId: '000000',
      grantType: 'social',
      source: 'github',
      socialCode: 'oauth-code'
    });
    expect(firstRequest?.encrypt).toBe(true);
  });

  it('requests the social auth binding url with tenant and domain params', async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      data: 'https://oauth.example.com/github'
    });
    const adapter = createRealAuthAdapter({
      client: {
        request
      } as never
    });

    const url = await adapter.getSocialAuthUrl({
      source: 'github',
      tenantId: '000000',
      domain: 'localhost:4173'
    });

    expect(url).toBe('https://oauth.example.com/github');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: '/auth/binding/github?tenantId=000000&domain=localhost%3A4173'
      })
    );
  });

  it('loads captcha metadata from the dedicated auth code endpoint', async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        code: 200,
        msg: '获取成功',
        data: {
          captchaEnabled: true,
          uuid: 'captcha-uuid',
          img: 'captcha-image-base64'
        }
      }
    });
    const adapter = createRealAuthAdapter({
      client: {
        request
      } as never
    });

    await expect(adapter.getCaptcha()).resolves.toMatchObject({
      captchaEnabled: true,
      uuid: 'captcha-uuid',
      imageBase64: 'captcha-image-base64'
    });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/auth/code',
        method: 'get'
      })
    );
  });

  it('loads the backend register toggle from the config endpoint', async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        code: 200,
        msg: '获取成功',
        data: true
      }
    });
    const adapter = createRealAuthAdapter({
      client: {
        request
      } as never
    });

    await expect(adapter.getRegisterEnabled('tenant-demo')).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/auth/register/enabled?tenantId=tenant-demo',
        method: 'get'
      })
    );
  });

  it('normalizes fetch client errors into contract-safe auth errors', async () => {
    const adapter = createRealAuthAdapter({
      client: {
        request: vi.fn().mockRejectedValue(
          createApiClientError(403, {
            code: 403,
            msg: '当前账号暂无小麦学生端访问权限',
            data: null
          })
        )
      } as never
    });

    await expect(adapter.getCurrentUser()).rejects.toMatchObject({
      status: 403,
      code: '403',
      message: '当前账号暂无小麦学生端访问权限'
    });
  });
});
