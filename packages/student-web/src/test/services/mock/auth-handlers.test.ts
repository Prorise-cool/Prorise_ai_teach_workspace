/**
 * 文件说明：验证认证 mock handlers 的成功态、未登录态与无权限态。
 */
import { setupServer } from 'msw/node';

import type { RuoyiEnvelope } from '@/types/auth';
import { authHandlers } from '@/services/mock/handlers/auth';

const server = setupServer(...authHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

async function readEnvelope<T>(response: Response) {
  return (await response.json()) as RuoyiEnvelope<T>;
}

describe('authHandlers', () => {
  it('返回登录成功的统一包装 payload', async () => {
    const response = await fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'student_demo',
        password: 'Passw0rd!',
        tenantId: '000000'
      })
    });

    const payload = await readEnvelope<{
      access_token: string;
    }>(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      code: 200,
      msg: '登录成功',
      data: {
        access_token: 'mock-auth-student-access-token'
      }
    });
  });

  it('对未携带 token 的当前用户请求返回 401', async () => {
    const response = await fetch('http://localhost/system/user/getInfo');
    const payload = await readEnvelope<null>(response);

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      code: 401,
      msg: '当前会话已失效，请重新登录'
    });
  });

  it('对无权限账号返回 403', async () => {
    const response = await fetch('http://localhost/system/user/getInfo', {
      headers: {
        Authorization: 'Bearer mock-auth-forbidden-access-token'
      }
    });
    const payload = await readEnvelope<null>(response);

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      code: 403,
      msg: '当前账号暂无小麦学生端访问权限'
    });
  });
});
