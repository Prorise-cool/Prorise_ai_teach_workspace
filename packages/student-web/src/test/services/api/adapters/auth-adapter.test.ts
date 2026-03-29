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
import { DEFAULT_AUTH_RETURN_TO } from '@/types/auth';

type AuthEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

type RecordedRequest = {
  url?: string;
  method?: string;
  data?: {
    tenantId?: string;
    grantType?: string;
  };
  headers?: Headers;
};

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
          data: authMockFixtures.student.tokenPayload
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '获取成功',
          data: authMockFixtures.student.userInfoPayload
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
      username: 'student_demo',
      password: 'Passw0rd!'
    });

    const requestCalls = request.mock.calls as unknown[][];
    const firstRequest = requestCalls[0]?.[0] as RecordedRequest | undefined;
    const secondRequest = requestCalls[1]?.[0] as RecordedRequest | undefined;

    expect(firstRequest).toMatchObject({
      url: '/auth/login',
      method: 'post'
    });
    expect(firstRequest?.data).toMatchObject({
      tenantId: '000000',
      grantType: 'password'
    });
    expect(secondRequest).toMatchObject({
      url: '/system/user/getInfo',
      method: 'get'
    });
    expect(secondRequest?.headers).toBeInstanceOf(Headers);
    expect(secondRequest?.headers?.get('Authorization')).toBe(
      'Bearer mock-auth-student-access-token'
    );
    expect(session.user.nickname).toBe('小麦同学');
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
