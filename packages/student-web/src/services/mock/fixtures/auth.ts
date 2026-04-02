/**
 * 文件说明：集中维护 student-web 认证链路的 mock 夹具与可编排行为。
 * 覆盖账密登录、第三方登录入口、社交回调登录、当前用户读取与邮箱注册场景。
 */
import type {
  AuthCaptcha,
  AuthError,
  AuthLoginInput,
  AuthRegisterInput,
  AuthSocialAuthInput,
  AuthSocialSource,
  RuoyiEnvelope,
  RuoyiCaptchaPayload,
  RuoyiLoginToken,
  RuoyiUserInfo,
  RuoyiUserRole,
} from "@/types/auth";
import {
  AUTH_DEFAULT_TENANT_ID,
  AUTH_FORBIDDEN_STATUS,
  AUTH_SOCIAL_CALLBACK_PATH,
  AUTH_SUCCESS_CODE,
  AUTH_UNAUTHORIZED_STATUS,
} from "@/types/auth";
import { readNumber, readRecord, readString } from "@/lib/type-guards";

const DEFAULT_PASSWORD = "Passw0rd!";
const DEFAULT_DOMAIN = "localhost:4173";

/**
 * 构造角色 payload，减少夹具重复。
 *
 * @param roleId - 角色 ID。
 * @param roleKey - 角色 key。
 * @param roleName - 角色显示名。
 * @returns RuoYi 角色 payload。
 */
function buildRole(
  roleId: string,
  roleKey: string,
  roleName: string,
): RuoyiUserRole {
  return {
    roleId,
    roleKey,
    roleName,
  };
}

/**
 * 构造成功响应包。
 *
 * @param data - 业务数据。
 * @param msg - 成功提示。
 * @returns RuoYi 标准成功响应。
 */
function buildSuccessEnvelope<T>(data: T, msg: string): RuoyiEnvelope<T> {
  return {
    code: AUTH_SUCCESS_CODE,
    msg,
    data,
  };
}

/**
 * 构造统一认证错误。
 *
 * @param status - HTTP / 业务状态码。
 * @param msg - 错误提示。
 * @returns 可直接在 adapter 中消费的认证错误。
 */
function buildAuthError(status: number, msg: string): AuthError {
  return Object.assign(new Error(msg), {
    name: "AuthError" as const,
    status,
    code: String(status),
  });
}

/**
 * 统一生成登录 token payload。
 *
 * @param accessToken - 访问令牌。
 * @param refreshToken - 刷新令牌。
 * @param openId - 可选 openId。
 * @returns RuoYi 登录 token payload。
 */
function buildTokenPayload(
  accessToken: string,
  refreshToken: string,
  openId: string,
): RuoyiLoginToken {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expire_in: 7200,
    refresh_expire_in: 604800,
    client_id: "student-web",
    openid: openId,
    scope: "openid profile",
  };
}

/**
 * 编码第三方登录 state，模拟后端重定向携带的 Base64 JSON。
 *
 * @param payload - state 载荷。
 * @returns Base64 字符串。
 */
function encodeSocialState(payload: Record<string, string>) {
  const rawValue = JSON.stringify(payload);

  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(rawValue);
  }

  throw new Error("当前环境不支持第三方登录 state 编码");
}

/**
 * 判断账密登录输入是否匹配夹具账号。
 *
 * @param input - 登录输入。
 * @param candidate - 候选凭证。
 * @returns 是否命中该夹具。
 */
function matchesCredentials(
  input: Pick<AuthLoginInput, "username" | "password">,
  candidate: {
    username: string;
    email?: string;
    password: string;
  },
) {
  const normalizedUsername = input.username?.trim().toLowerCase() ?? "";
  const candidateEmail = candidate.email?.trim().toLowerCase();

  return (
    input.password === candidate.password &&
    (normalizedUsername === candidate.username.toLowerCase() ||
      normalizedUsername === candidateEmail)
  );
}

/**
 * 判断社交登录回调输入是否有效。
 *
 * @param input - 登录输入。
 * @returns 是否为可消费的社交回调 payload。
 */
function hasValidSocialPayload(input: AuthLoginInput) {
  return (
    input.grantType === "social" &&
    Boolean(input.source) &&
    Boolean(input.socialCode) &&
    Boolean(input.socialState)
  );
}

/**
 * 统一抛出夹具错误。
 *
 * @param error - 错误夹具。
 */
function throwFixtureError(error: { status: number; msg: string }): never {
  throw buildAuthError(error.status, error.msg);
}

/** 认证 mock 数据总入口。 */
export const authMockFixtures = {
  student: {
    credentials: {
      username: "student_demo",
      email: "student_demo@xiaomai.test",
      password: DEFAULT_PASSWORD,
      tenantId: AUTH_DEFAULT_TENANT_ID,
    },
    tokenPayload: buildTokenPayload(
      "mock-auth-student-access-token",
      "mock-auth-student-refresh-token",
      "student-open-id",
    ),
    userInfoPayload: {
      user: {
        userId: "10001",
        userName: "student_demo",
        nickName: "小麦同学",
        avatar: "https://static.prorise.test/avatar/student.png",
        roles: [buildRole("20001", "student", "学生")],
      },
      roles: ["student"],
      permissions: ["video:task:add", "classroom:session:add"],
    } satisfies RuoyiUserInfo,
  },
  admin: {
    credentials: {
      username: "admin",
      email: "admin@xiaomai.test",
      password: "admin123",
      tenantId: AUTH_DEFAULT_TENANT_ID,
    },
    tokenPayload: buildTokenPayload(
      "mock-auth-admin-access-token",
      "mock-auth-admin-refresh-token",
      "admin-open-id",
    ),
    userInfoPayload: {
      user: {
        userId: "1",
        userName: "admin",
        nickName: "平台管理员",
        avatar: "https://static.prorise.test/avatar/admin.png",
        roles: [buildRole("10000", "admin", "管理员")],
      },
      roles: ["admin"],
      permissions: ["video:task:add", "classroom:session:add", "system:*:*"],
    } satisfies RuoyiUserInfo,
  },
  social: {
    codes: {
      github: "mock-github-code",
      wechat: "mock-wechat-code",
      qq: "mock-qq-code",
    } as const satisfies Record<AuthSocialSource, string>,
    tokenPayload: buildTokenPayload(
      "mock-auth-social-access-token",
      "mock-auth-social-refresh-token",
      "social-open-id",
    ),
    userInfoPayload: {
      user: {
        userId: "10003",
        userName: "social_student",
        nickName: "三方同学",
        avatar: "https://static.prorise.test/avatar/social.png",
        roles: [buildRole("20001", "student", "学生")],
      },
      roles: ["student"],
      permissions: ["video:task:add", "classroom:session:add"],
    } satisfies RuoyiUserInfo,
  },
  registered: {
    credentials: {
      username: "new_student",
      email: "new_student@xiaomai.test",
      password: DEFAULT_PASSWORD,
      tenantId: AUTH_DEFAULT_TENANT_ID,
    },
    tokenPayload: buildTokenPayload(
      "mock-auth-registered-access-token",
      "mock-auth-registered-refresh-token",
      "registered-open-id",
    ),
    userInfoPayload: {
      user: {
        userId: "10002",
        userName: "new_student",
        nickName: "新同学",
        avatar: "https://static.prorise.test/avatar/registered.png",
        roles: [buildRole("20001", "student", "学生")],
      },
      roles: ["student"],
      permissions: ["video:task:add"],
    } satisfies RuoyiUserInfo,
  },
  forbidden: {
    credentials: {
      username: "observer_demo",
      email: "observer_demo@xiaomai.test",
      password: DEFAULT_PASSWORD,
      tenantId: AUTH_DEFAULT_TENANT_ID,
    },
    tokenPayload: buildTokenPayload(
      "mock-auth-forbidden-access-token",
      "mock-auth-forbidden-refresh-token",
      "observer-open-id",
    ),
  },
  tokens: {
    student: "mock-auth-student-access-token",
    admin: "mock-auth-admin-access-token",
    social: "mock-auth-social-access-token",
    registered: "mock-auth-registered-access-token",
    forbidden: "mock-auth-forbidden-access-token",
  },
  errors: {
    invalidCredentials: {
      status: AUTH_UNAUTHORIZED_STATUS,
      code: AUTH_UNAUTHORIZED_STATUS,
      msg: "账号或密码不正确，请重试",
    },
    unauthorized: {
      status: AUTH_UNAUTHORIZED_STATUS,
      code: AUTH_UNAUTHORIZED_STATUS,
      msg: "当前会话已失效，请重新登录",
    },
    forbidden: {
      status: AUTH_FORBIDDEN_STATUS,
      code: AUTH_FORBIDDEN_STATUS,
      msg: "当前账号暂无小麦学生端访问权限",
    },
  },
  settings: {
    registerEnabled: false,
    captchaEnabled: false,
  },
} as const;

/** 读取 Bearer token。 */
export function extractBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

/** 统一归一化 mock 夹具抛出的认证错误。 */
export function normalizeMockAuthError(error: unknown): AuthError {
  const candidate = readRecord(error);

  if (candidate) {
    const name = readString(candidate.name);
    const status = readNumber(candidate.status);
    const code = readString(candidate.code);
    const message = readString(candidate.message);

    if (
      name === "AuthError" &&
      status !== undefined &&
      code !== undefined &&
      message !== undefined
    ) {
      return Object.assign(new Error(message), {
        name: "AuthError" as const,
        status,
        code,
      });
    }
  }

  if (error instanceof Error) {
    return buildAuthError(500, error.message);
  }

  return buildAuthError(500, "未知认证错误");
}

/**
 * 生成第三方登录入口 mock 地址。
 *
 * @param input - 第三方登录入口参数。
 * @returns 直接回到本地回调页的 mock URL。
 */
export function getMockSocialAuthUrl(input: AuthSocialAuthInput) {
  const socialCode = authMockFixtures.social.codes[input.source];
  const socialState = encodeSocialState({
    tenantId: input.tenantId ?? AUTH_DEFAULT_TENANT_ID,
    domain: input.domain ?? DEFAULT_DOMAIN,
  });

  const searchParams = new URLSearchParams({
    source: input.source,
    code: socialCode,
    state: socialState,
  });

  return `${AUTH_SOCIAL_CALLBACK_PATH}?${searchParams.toString()}`;
}

/** 为登录请求生成 mock envelope。 */
export function getMockLoginEnvelope(
  input: AuthLoginInput,
): RuoyiEnvelope<RuoyiLoginToken> {
  if (hasValidSocialPayload(input)) {
    return buildSuccessEnvelope(
      authMockFixtures.social.tokenPayload,
      "第三方登录成功",
    );
  }

  if (matchesCredentials(input, authMockFixtures.student.credentials)) {
    return buildSuccessEnvelope(
      authMockFixtures.student.tokenPayload,
      "登录成功",
    );
  }

  if (matchesCredentials(input, authMockFixtures.admin.credentials)) {
    return buildSuccessEnvelope(
      authMockFixtures.admin.tokenPayload,
      "登录成功",
    );
  }

  if (matchesCredentials(input, authMockFixtures.forbidden.credentials)) {
    return buildSuccessEnvelope(
      authMockFixtures.forbidden.tokenPayload,
      "登录成功",
    );
  }

  throwFixtureError(authMockFixtures.errors.invalidCredentials);
}

/** 为注册请求生成 mock envelope。 */
export function getMockRegisterEnvelope(
  input: AuthRegisterInput,
): RuoyiEnvelope<null> {
  if (!input.username || !input.password) {
    throwFixtureError(authMockFixtures.errors.invalidCredentials);
  }

  return buildSuccessEnvelope<null>(null, "注册成功");
}

/** 为注册开关查询生成 mock envelope。 */
export function getMockRegisterEnabledEnvelope(): RuoyiEnvelope<boolean> {
  return buildSuccessEnvelope(
    authMockFixtures.settings.registerEnabled,
    "获取成功",
  );
}

/** 为验证码查询生成 mock envelope。 */
export function getMockCaptchaEnvelope(): RuoyiEnvelope<RuoyiCaptchaPayload> {
  const payload: AuthCaptcha = authMockFixtures.settings.captchaEnabled
    ? {
        captchaEnabled: true,
        uuid: "mock-captcha-uuid",
        imageBase64: "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      }
    : {
        captchaEnabled: false,
      };

  return buildSuccessEnvelope(
    {
      captchaEnabled: payload.captchaEnabled,
      uuid: payload.uuid,
      img: payload.imageBase64,
    },
    "获取成功",
  );
}

/** 为当前用户请求生成 mock envelope。 */
export function getMockCurrentUserEnvelope(
  accessToken?: string,
): RuoyiEnvelope<RuoyiUserInfo> {
  if (!accessToken) {
    throwFixtureError(authMockFixtures.errors.unauthorized);
  }

  if (accessToken === authMockFixtures.tokens.forbidden) {
    throwFixtureError(authMockFixtures.errors.forbidden);
  }

  if (accessToken === authMockFixtures.tokens.student) {
    return buildSuccessEnvelope(
      authMockFixtures.student.userInfoPayload,
      "获取成功",
    );
  }

  if (accessToken === authMockFixtures.tokens.admin) {
    return buildSuccessEnvelope(
      authMockFixtures.admin.userInfoPayload,
      "获取成功",
    );
  }

  if (accessToken === authMockFixtures.tokens.social) {
    return buildSuccessEnvelope(
      authMockFixtures.social.userInfoPayload,
      "获取成功",
    );
  }

  if (accessToken === authMockFixtures.tokens.registered) {
    return buildSuccessEnvelope(
      authMockFixtures.registered.userInfoPayload,
      "获取成功",
    );
  }

  throwFixtureError(authMockFixtures.errors.unauthorized);
}

/** 为登出请求生成 mock envelope。 */
export function getMockLogoutEnvelope() {
  return buildSuccessEnvelope<null>(null, "登出成功");
}
