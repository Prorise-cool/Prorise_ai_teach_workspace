import type { AuthPermission, AuthRole, AuthSession, AuthUser } from '@/types/auth';

export function createAuthRole(overrides: Partial<AuthRole> = {}): AuthRole {
  return {
    key: 'student',
    name: '学生',
    ...overrides
  };
}

export function createAuthPermission(
  overrides: Partial<AuthPermission> = {}
): AuthPermission {
  return {
    key: 'video:task:add',
    ...overrides
  };
}

export function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: '10001',
    username: 'student_demo',
    nickname: '小麦同学',
    avatarUrl: 'https://static.prorise.test/avatar/student.png',
    roles: [createAuthRole()],
    permissions: [
      createAuthPermission(),
      createAuthPermission({ key: 'classroom:session:add' })
    ],
    ...overrides
  };
}

export function createAuthSession(
  overrides: Partial<AuthSession> = {}
): AuthSession {
  return {
    accessToken: 'mock-auth-student-access-token',
    refreshToken: 'mock-auth-student-refresh-token',
    expiresIn: 7200,
    refreshExpiresIn: 604800,
    clientId: 'student-web',
    openId: 'student-open-id',
    scopes: ['openid', 'profile'],
    user: createAuthUser(),
    ...overrides
  };
}
