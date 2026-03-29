/**
 * 文件说明：集中维护 Story 1.1 的认证 mock 夹具与可编排行为。
 */
import type {
  AuthError,
  AuthLoginInput,
  AuthRegisterInput,
  RuoyiEnvelope,
  RuoyiLoginToken,
  RuoyiUserInfo,
  RuoyiUserRole
} from '@/types/auth';
import {
  AUTH_FORBIDDEN_STATUS,
  AUTH_SUCCESS_CODE,
  AUTH_UNAUTHORIZED_STATUS
} from '@/types/auth';

const DEFAULT_PASSWORD = 'Passw0rd!';
const DEFAULT_TENANT_ID = '000000';

function buildRole(roleId: string, roleKey: string, roleName: string): RuoyiUserRole {
  return {
    roleId,
    roleKey,
    roleName
  };
}

function buildSuccessEnvelope<T>(data: T, msg: string): RuoyiEnvelope<T> {
  return {
    code: AUTH_SUCCESS_CODE,
    msg,
    data
  };
}

function buildAuthError(status: number, msg: string): AuthError {
  return Object.assign(new Error(msg), {
    name: 'AuthError',
    status,
    code: String(status)
  }) as AuthError;
}

/** 认证 mock 数据总入口。 */
export const authMockFixtures = {
  student: {
    credentials: {
      username: 'student_demo',
      password: DEFAULT_PASSWORD,
      tenantId: DEFAULT_TENANT_ID
    },
    tokenPayload: {
      access_token: 'mock-auth-student-access-token',
      refresh_token: 'mock-auth-student-refresh-token',
      expire_in: 7200,
      refresh_expire_in: 604800,
      client_id: 'student-web',
      openid: 'student-open-id',
      scope: 'openid profile'
    } satisfies RuoyiLoginToken,
    userInfoPayload: {
      user: {
        userId: '10001',
        userName: 'student_demo',
        nickName: '小麦同学',
        avatar: 'https://static.prorise.test/avatar/student.png',
        roles: [buildRole('20001', 'student', '学生')]
      },
      roles: ['student'],
      permissions: ['video:task:add', 'classroom:session:add']
    } satisfies RuoyiUserInfo
  },
  registered: {
    credentials: {
      username: 'new_student',
      password: DEFAULT_PASSWORD,
      confirmPassword: DEFAULT_PASSWORD,
      tenantId: DEFAULT_TENANT_ID
    },
    tokenPayload: {
      access_token: 'mock-auth-registered-access-token',
      refresh_token: 'mock-auth-registered-refresh-token',
      expire_in: 7200,
      refresh_expire_in: 604800,
      client_id: 'student-web',
      openid: 'registered-open-id',
      scope: 'openid profile'
    } satisfies RuoyiLoginToken,
    userInfoPayload: {
      user: {
        userId: '10002',
        userName: 'new_student',
        nickName: '新同学',
        avatar: 'https://static.prorise.test/avatar/registered.png',
        roles: [buildRole('20001', 'student', '学生')]
      },
      roles: ['student'],
      permissions: ['video:task:add']
    } satisfies RuoyiUserInfo
  },
  forbidden: {
    credentials: {
      username: 'observer_demo',
      password: DEFAULT_PASSWORD,
      tenantId: DEFAULT_TENANT_ID
    },
    tokenPayload: {
      access_token: 'mock-auth-forbidden-access-token',
      refresh_token: 'mock-auth-forbidden-refresh-token',
      expire_in: 7200,
      refresh_expire_in: 604800,
      client_id: 'student-web',
      openid: 'observer-open-id',
      scope: 'openid profile'
    } satisfies RuoyiLoginToken
  },
  tokens: {
    student: 'mock-auth-student-access-token',
    registered: 'mock-auth-registered-access-token',
    forbidden: 'mock-auth-forbidden-access-token'
  },
  errors: {
    invalidCredentials: {
      status: AUTH_UNAUTHORIZED_STATUS,
      code: AUTH_UNAUTHORIZED_STATUS,
      msg: '用户名或密码错误'
    },
    unauthorized: {
      status: AUTH_UNAUTHORIZED_STATUS,
      code: AUTH_UNAUTHORIZED_STATUS,
      msg: '当前会话已失效，请重新登录'
    },
    forbidden: {
      status: AUTH_FORBIDDEN_STATUS,
      code: AUTH_FORBIDDEN_STATUS,
      msg: '当前账号暂无小麦学生端访问权限'
    }
  }
} as const;

function matchesCredentials(
  input: Pick<AuthLoginInput, 'username' | 'password'>,
  candidate: { username: string; password: string }
) {
  return input.username === candidate.username && input.password === candidate.password;
}

function throwFixtureError(error: { status: number; msg: string }): never {
  throw buildAuthError(error.status, error.msg);
}

/** 读取 Bearer token。 */
export function extractBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
}

/** 统一归一化 mock 夹具抛出的认证错误。 */
export function normalizeMockAuthError(error: unknown): AuthError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    'status' in error &&
    'code' in error &&
    'message' in error
  ) {
    const candidate = error as AuthError;

    if (candidate.name === 'AuthError') {
      return candidate;
    }
  }

  if (error instanceof Error) {
    return buildAuthError(500, error.message);
  }

  return buildAuthError(500, '未知认证错误');
}

/** 为登录请求生成 mock envelope。 */
export function getMockLoginEnvelope(
  input: AuthLoginInput
): RuoyiEnvelope<RuoyiLoginToken> {
  if (matchesCredentials(input, authMockFixtures.student.credentials)) {
    return buildSuccessEnvelope(authMockFixtures.student.tokenPayload, '登录成功');
  }

  if (matchesCredentials(input, authMockFixtures.forbidden.credentials)) {
    return buildSuccessEnvelope(authMockFixtures.forbidden.tokenPayload, '登录成功');
  }

  throwFixtureError(authMockFixtures.errors.invalidCredentials);
}

/** 为注册请求生成 mock envelope。 */
export function getMockRegisterEnvelope(
  input: AuthRegisterInput
): RuoyiEnvelope<RuoyiLoginToken> {
  if (matchesCredentials(input, authMockFixtures.forbidden.credentials)) {
    return buildSuccessEnvelope(authMockFixtures.forbidden.tokenPayload, '注册成功');
  }

  if (!input.username || !input.password) {
    throwFixtureError(authMockFixtures.errors.invalidCredentials);
  }

  return buildSuccessEnvelope(authMockFixtures.registered.tokenPayload, '注册成功');
}

/** 为当前用户请求生成 mock envelope。 */
export function getMockCurrentUserEnvelope(
  accessToken?: string
): RuoyiEnvelope<RuoyiUserInfo> {
  if (!accessToken) {
    throwFixtureError(authMockFixtures.errors.unauthorized);
  }

  if (accessToken === authMockFixtures.tokens.forbidden) {
    throwFixtureError(authMockFixtures.errors.forbidden);
  }

  if (accessToken === authMockFixtures.tokens.student) {
    return buildSuccessEnvelope(authMockFixtures.student.userInfoPayload, '获取成功');
  }

  if (accessToken === authMockFixtures.tokens.registered) {
    return buildSuccessEnvelope(authMockFixtures.registered.userInfoPayload, '获取成功');
  }

  throwFixtureError(authMockFixtures.errors.unauthorized);
}

/** 为登出请求生成 mock envelope。 */
export function getMockLogoutEnvelope() {
  return buildSuccessEnvelope<null>(null, '登出成功');
}
