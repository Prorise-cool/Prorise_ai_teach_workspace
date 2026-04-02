/**
 * 文件说明：验证认证服务的会话组装、登录注册基础能力与回跳规则。
 */
import { createMockAuthAdapter } from '@/services/api/adapters';
import {
  createAuthService,
  normalizeReturnTo,
  readSocialAuthReturnTo
} from '@/services/auth';

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

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('登录后返回完整会话对象', async () => {
    const session = await service.login({
      username: 'admin',
      password: 'admin123',
      tenantId: '000000'
    });

    expect(session.accessToken).toBe('mock-auth-admin-access-token');
    expect(session.refreshToken).toBe('mock-auth-admin-refresh-token');
    expect(session.user.id).toBe('1');
    expect(session.user.nickname).toBe('平台管理员');
    expect(session.user.roles).toContainEqual(
      expect.objectContaining({ key: 'admin' })
    );
  });

  it('支持通过社交回调 payload 建立完整会话', async () => {
    const session = await service.login({
      grantType: 'social',
      source: 'github',
      socialCode: 'mock-github-code',
      socialState: 'demo-state',
      tenantId: '000000'
    });

    expect(session.accessToken).toBe('mock-auth-social-access-token');
    expect(session.user.username).toBe('social_student');
  });

  it('注册成功时不伪造前端登录态', async () => {
    await expect(
      service.register({
        username: 'new_student',
        password: 'Passw0rd!',
        confirmPassword: 'Passw0rd!'
      })
    ).resolves.toBeUndefined();
  });

  it('暴露验证码与注册开关查询能力', async () => {
    await expect(service.getCaptcha()).resolves.toMatchObject({
      captchaEnabled: false
    });
    await expect(service.getRegisterEnabled('000000')).resolves.toBe(false);
  });

  it('生成第三方登录入口地址', async () => {
    const url = await service.getSocialAuthUrl({
      source: 'github',
      tenantId: '000000',
      domain: 'localhost:4173'
    });

    expect(url).toContain('/login/social-callback');
    expect(url).toContain('source=github');
    expect(url).toContain('code=mock-github-code');
    expect(readSocialAuthReturnTo()).toBeUndefined();
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
