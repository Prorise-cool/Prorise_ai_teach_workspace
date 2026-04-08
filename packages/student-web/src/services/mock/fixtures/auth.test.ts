/**
 * 文件说明：验证认证 mock 夹具在账密、社交与用户态场景下的稳定语义。
 */
import {
  authMockFixtures,
  extractBearerToken,
  getMockCaptchaEnvelope,
  getMockCurrentUserEnvelope,
  getMockLoginEnvelope,
  getMockRegisterEnabledEnvelope,
  getMockRegisterEnvelope,
  getMockSocialAuthUrl,
  normalizeMockAuthError
} from '@/services/mock/fixtures/auth';

describe('auth mock fixtures', () => {
  it('provides admin, student, social and forbidden scenarios', () => {
    expect(authMockFixtures.admin.userInfoPayload.roles).toEqual(['admin']);
    expect(authMockFixtures.student.userInfoPayload.roles).toEqual(['student']);
    expect(authMockFixtures.social.userInfoPayload.roles).toEqual(['student']);
    expect(authMockFixtures.errors.unauthorized.status).toBe(401);
    expect(authMockFixtures.errors.forbidden.status).toBe(403);
  });

  it('resolves login and bearer token scenarios consistently', () => {
    expect(
      getMockLoginEnvelope({
        username: 'admin',
        password: 'admin123'
      }).data.access_token
    ).toBe(authMockFixtures.tokens.admin);
    expect(
      getMockLoginEnvelope({
        grantType: 'social',
        source: 'github',
        socialCode: 'mock-github-code',
        socialState: 'demo-state'
      }).data.access_token
    ).toBe(authMockFixtures.tokens.social);
    expect(
      getMockRegisterEnvelope({
        username: 'new_student',
        password: 'Passw0rd!',
        confirmPassword: 'Passw0rd!'
      }).data
    ).toBeNull();
    expect(
      getMockCurrentUserEnvelope(authMockFixtures.tokens.admin).data.user?.userId
    ).toBe('1');
    expect(extractBearerToken(`Bearer ${authMockFixtures.tokens.forbidden}`)).toBe(
      authMockFixtures.tokens.forbidden
    );
  });

  it('exposes register-toggle and captcha mock envelopes', () => {
    expect(getMockRegisterEnabledEnvelope().data).toBe(false);
    expect(getMockCaptchaEnvelope().data).toMatchObject({
      captchaEnabled: false
    });
  });

  it('builds a local social callback url for mock mode', () => {
    const url = getMockSocialAuthUrl({
      source: 'github',
      tenantId: '000000',
      domain: 'localhost:4173'
    });

    expect(url).toContain('/login/social-callback');
    expect(url).toContain('source=github');
    expect(url).toContain('code=mock-github-code');
  });

  it('normalizes fixture-thrown errors into AuthError objects', () => {
    const error = normalizeMockAuthError(new Error('fixture exploded'));

    expect(error).toMatchObject({
      name: 'AuthError',
      status: 500,
      code: '500',
      message: 'fixture exploded'
    });
  });
});
