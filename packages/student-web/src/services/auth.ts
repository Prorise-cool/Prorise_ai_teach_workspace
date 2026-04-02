/**
 * 文件说明：提供 Story 1.1 直接消费的认证服务入口与回跳规则。
 */
import type {
  AuthAdapter
} from '@/services/api/adapters';
import type {
  AuthCaptcha,
  AuthLoginInput,
  AuthSocialAuthInput,
  AuthRegisterInput,
  AuthSession
} from '@/types/auth';
import {
  AUTH_LOGIN_PATH,
  AUTH_RETURN_TO_ALLOWED_SOURCES,
  AUTH_RETURN_TO_QUERY_KEY,
  AUTH_SOCIAL_RETURN_TO_STORAGE_KEY,
  DEFAULT_AUTH_RETURN_TO
} from '@/types/auth';
import { resolveAuthAdapter } from '@/services/api/adapters';

export type AuthService = {
  login(input: AuthLoginInput): Promise<AuthSession>;
  register(input: AuthRegisterInput): Promise<void>;
  getCaptcha(): Promise<AuthCaptcha>;
  getRegisterEnabled(tenantId?: string): Promise<boolean>;
  getSocialAuthUrl(input: AuthSocialAuthInput): Promise<string>;
  logout(accessToken?: string): Promise<void>;
  getCurrentUser(accessToken?: string): ReturnType<AuthAdapter['getCurrentUser']>;
};

const BLOCKED_RETURN_TO_PREFIXES = [AUTH_LOGIN_PATH];

/**
 * 归一化认证回跳地址，只允许安全的站内相对路径。
 *
 * @param rawReturnTo - 原始回跳地址。
 * @param fallbackPath - 回跳地址不可用时的兜底路径。
 * @returns 安全可用的站内路径。
 */
export function normalizeReturnTo(
  rawReturnTo: string | null | undefined,
  fallbackPath = DEFAULT_AUTH_RETURN_TO
) {
  if (!rawReturnTo) {
    return fallbackPath;
  }

  if (!rawReturnTo.startsWith('/') || rawReturnTo.startsWith('//')) {
    return fallbackPath;
  }

  if (
    BLOCKED_RETURN_TO_PREFIXES.some(prefix => rawReturnTo === prefix || rawReturnTo.startsWith(`${prefix}?`))
  ) {
    return fallbackPath;
  }

  try {
    const normalized = new URL(rawReturnTo, 'http://xiaomai.local');

    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  } catch {
    return fallbackPath;
  }
}

/** 暴露固定回跳参数名，供后续页面与路由复用。 */
export const AUTH_RETURN_TO_KEY = AUTH_RETURN_TO_QUERY_KEY;

/** 暴露允许的 returnTo 来源，供路由与 CTA 统一对齐。 */
export const AUTH_RETURN_TO_SOURCES = AUTH_RETURN_TO_ALLOWED_SOURCES;

/** 暴露第三方登录回跳缓存键，供页面与测试复用。 */
export { AUTH_SOCIAL_RETURN_TO_STORAGE_KEY };

/**
 * 暂存第三方登录回跳地址，避免外部 OAuth 往返后丢失原上下文。
 *
 * @param returnTo - 待保存的站内回跳地址。
 */
export function persistSocialAuthReturnTo(returnTo: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    AUTH_SOCIAL_RETURN_TO_STORAGE_KEY,
    normalizeReturnTo(returnTo, DEFAULT_AUTH_RETURN_TO)
  );
}

/**
 * 读取第三方登录流程暂存的回跳地址。
 *
 * @returns 已暂存的站内回跳地址；不存在时返回 `undefined`。
 */
export function readSocialAuthReturnTo() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const storedReturnTo = window.sessionStorage.getItem(
    AUTH_SOCIAL_RETURN_TO_STORAGE_KEY
  );

  if (!storedReturnTo) {
    return undefined;
  }

  return normalizeReturnTo(storedReturnTo, DEFAULT_AUTH_RETURN_TO);
}

/** 清除第三方登录流程暂存的回跳地址。 */
export function clearSocialAuthReturnTo() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(AUTH_SOCIAL_RETURN_TO_STORAGE_KEY);
}

/**
 * 执行外部认证地址跳转。
 *
 * @param url - 第三方登录或统一认证入口地址。
 */
export function redirectToAuthUrl(url: string) {
  window.location.assign(url);
}

/**
 * 基于认证 adapter 组装统一的认证服务接口。
 *
 * @param adapter - 底层认证 adapter，实现真实接口或 mock 行为。
 * @returns 可供页面直接消费的认证服务。
 */
export function createAuthService(adapter: AuthAdapter = resolveAuthAdapter()): AuthService {
  return {
    async login(input) {
      const tokens = await adapter.login(input);
      const user = await adapter.getCurrentUser(tokens.accessToken);

      return {
        ...tokens,
        user
      };
    },
    async register(input) {
      await adapter.register(input);
    },
    getCaptcha() {
      return adapter.getCaptcha();
    },
    getRegisterEnabled(tenantId) {
      return adapter.getRegisterEnabled(tenantId);
    },
    getSocialAuthUrl(input) {
      return adapter.getSocialAuthUrl(input);
    },
    async logout(accessToken) {
      await adapter.logout(accessToken);
    },
    getCurrentUser(accessToken) {
      return adapter.getCurrentUser(accessToken);
    }
  };
}

/** 默认认证服务实例。 */
export const authService = createAuthService();
