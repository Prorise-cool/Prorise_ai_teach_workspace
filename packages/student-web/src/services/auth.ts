/**
 * 文件说明：提供 Story 1.1 直接消费的认证服务入口与回跳规则。
 */
import type {
  AuthAdapter
} from '@/services/api/adapters';
import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthSession
} from '@/types/auth';
import {
  AUTH_RETURN_TO_ALLOWED_SOURCES,
  AUTH_RETURN_TO_QUERY_KEY,
  DEFAULT_AUTH_RETURN_TO
} from '@/types/auth';
import { resolveAuthAdapter } from '@/services/api/adapters';

type AuthService = {
  login(input: AuthLoginInput): Promise<AuthSession>;
  register(input: AuthRegisterInput): Promise<AuthSession>;
  logout(accessToken?: string): Promise<void>;
  getCurrentUser(accessToken?: string): ReturnType<AuthAdapter['getCurrentUser']>;
};

const BLOCKED_RETURN_TO_PREFIXES = ['/login'];

/** 归一化 returnTo，仅允许站内相对路径。 */
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

/** 创建统一认证服务。 */
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
      const tokens = await adapter.register(input);
      const user = await adapter.getCurrentUser(tokens.accessToken);

      return {
        ...tokens,
        user
      };
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
