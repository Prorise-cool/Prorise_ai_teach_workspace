import {
  authMockFixtures,
  extractBearerToken,
  getMockCurrentUserEnvelope,
  getMockLoginEnvelope,
  getMockRegisterEnvelope,
  normalizeMockAuthError
} from '@/services/mock/fixtures/auth';

describe('auth mock fixtures', () => {
  it('provides authenticated, registered and forbidden scenarios', () => {
    expect(authMockFixtures.student.userInfoPayload.roles).toEqual(['student']);
    expect(authMockFixtures.registered.userInfoPayload.roles).toEqual([
      'student'
    ]);
    expect(authMockFixtures.errors.unauthorized.status).toBe(401);
    expect(authMockFixtures.errors.forbidden.status).toBe(403);
  });

  it('resolves login and bearer token scenarios consistently', () => {
    expect(
      getMockLoginEnvelope({
        username: 'student_demo',
        password: 'Passw0rd!'
      }).data.access_token
    ).toBe(authMockFixtures.tokens.student);
    expect(
      getMockRegisterEnvelope({
        username: 'new_student',
        password: 'Passw0rd!',
        confirmPassword: 'Passw0rd!'
      }).data.access_token
    ).toBe(authMockFixtures.tokens.registered);
    expect(
      getMockCurrentUserEnvelope(authMockFixtures.tokens.student).data.user
        ?.userId
    ).toBe('10001');
    expect(extractBearerToken(`Bearer ${authMockFixtures.tokens.forbidden}`)).toBe(
      authMockFixtures.tokens.forbidden
    );
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
