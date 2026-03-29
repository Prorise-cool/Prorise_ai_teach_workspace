/**
 * 文件说明：验证认证服务的会话组装与 returnTo 规则。
 */
import { createMockAuthAdapter } from '@/services/api/adapters';
import { createAuthService, normalizeReturnTo } from '@/services/auth';

describe('normalizeReturnTo', () => {
  it('保留安全的站内回跳地址', () => {
    expect(normalizeReturnTo('/video/input?from=home#intro')).toBe(
      '/video/input?from=home#intro'
    );
  });

  it('拦截外部地址与登录页自循环回跳', () => {
    expect(normalizeReturnTo('https://evil.example.com/phishing', '/')).toBe('/');
    expect(normalizeReturnTo('/login?returnTo=%2Fvideo%2Finput', '/')).toBe('/');
  });
});

describe('AuthService', () => {
  const service = createAuthService(createMockAuthAdapter());

  it('登录后返回完整会话对象', async () => {
    const session = await service.login({
      username: 'student_demo',
      password: 'Passw0rd!',
      tenantId: '000000'
    });

    expect(session.accessToken).toBe('mock-auth-student-access-token');
    expect(session.refreshToken).toBe('mock-auth-student-refresh-token');
    expect(session.user.id).toBe('10001');
    expect(session.user.nickname).toBe('小麦同学');
    expect(session.user.roles).toContainEqual(
      expect.objectContaining({ key: 'student' })
    );
    expect(session.user.permissions).toContainEqual(
      expect.objectContaining({ key: 'video:task:add' })
    );
  });

  it('对已登录但无权限账号返回 403 语义错误', async () => {
    await expect(
      service.login({
        username: 'observer_demo',
        password: 'Passw0rd!',
        tenantId: '000000'
      })
    ).rejects.toMatchObject({
      status: 403,
      code: '403',
      message: '当前账号暂无小麦学生端访问权限'
    });
  });
});
