import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';

import { authMockFixtures } from '@/services/mock/fixtures/auth';
import { authHandlers } from '@/services/mock/handlers/auth';

const server = setupServer(...authHandlers);

describe('auth mock handlers', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('returns a successful login envelope for the authenticated fixture', async () => {
    const response = await fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'student_demo',
        password: 'Passw0rd!'
      })
    });

    const payload = (await response.json()) as {
      code: number;
      msg: string;
      data: { access_token: string };
    };

    expect(payload.code).toBe(200);
    expect(payload.msg).toBe('登录成功');
    expect(payload.data.access_token).toBe(authMockFixtures.tokens.student);
  });

  it('returns a successful register envelope that shares the same domain contract', async () => {
    const response = await fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'new_student',
        password: 'Passw0rd!',
        confirmPassword: 'Passw0rd!'
      })
    });

    const payload = (await response.json()) as {
      code: number;
      msg: string;
      data: { access_token: string };
    };

    expect(payload.code).toBe(200);
    expect(payload.msg).toBe('注册成功');
    expect(payload.data.access_token).toBe(authMockFixtures.tokens.registered);
  });

  it('returns an unauthorized envelope when current user info is requested without a token', async () => {
    const response = await fetch('http://localhost/system/user/getInfo');

    const payload = (await response.json()) as {
      code: number;
      msg: string;
      data: null;
    };

    expect(payload.code).toBe(401);
    expect(payload.msg).toBe('当前会话已失效，请重新登录');
    expect(payload.data).toBeNull();
  });

  it('returns a forbidden envelope for a role-blocked session and supports logout', async () => {
    const infoResponse = await fetch('http://localhost/system/user/getInfo', {
      headers: {
        Authorization: `Bearer ${authMockFixtures.tokens.forbidden}`
      }
    });
    const infoPayload = (await infoResponse.json()) as {
      code: number;
      msg: string;
      data: null;
    };

    expect(infoPayload.code).toBe(403);
    expect(infoPayload.msg).toBe('当前账号暂无小麦学生端访问权限');

    const logoutResponse = await fetch('http://localhost/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authMockFixtures.tokens.student}`
      }
    });
    const logoutPayload = (await logoutResponse.json()) as {
      code: number;
      msg: string;
      data: null;
    };

    expect(logoutPayload.code).toBe(200);
    expect(logoutPayload.msg).toBe('登出成功');
  });
});
