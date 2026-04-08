/**
 * 文件说明：统一封装前端测试的会话种子、状态清理与默认环境重置。
 * 供认证、profile、video、classroom 等运行态测试复用。
 */
import { APP_DEFAULT_LOCALE, appI18n } from '@/app/i18n';
import { resetUserProfileStore } from '@/features/profile/stores/user-profile-store';
import { createMockAuthAdapter } from '@/services/api/adapters';
import { createAuthService } from '@/services/auth';
import {
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';

const mockAuthService = createAuthService(createMockAuthAdapter());

type ResetAppTestStateOptions = {
  locale?: string;
  resetProfile?: boolean;
  theme?: 'light' | 'dark';
};

type SeedMockAuthSessionOptions = {
  password?: string;
  rememberSession?: boolean;
  username?: string;
};

/**
 * 重置前端测试运行态，包括 i18n、主题、storage 与 Zustand store。
 *
 * @param options - 重置选项。
 * @returns 无返回值。
 */
export async function resetAppTestState(
  options: ResetAppTestStateOptions = {}
) {
  resetAuthSessionStore();

  if (options.resetProfile !== false) {
    resetUserProfileStore();
  }

  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.dataset.theme = options.theme ?? 'light';
  await appI18n.changeLanguage(options.locale ?? APP_DEFAULT_LOCALE);
}

/**
 * 生成并写入一份 mock 登录态，供受保护路由或页面直接消费。
 *
 * @param options - 登录种子参数。
 * @returns 当前测试使用的认证会话。
 */
export async function seedMockAuthSession(
  options: SeedMockAuthSessionOptions = {}
) {
  const session = await mockAuthService.login({
    username: options.username ?? 'admin',
    password: options.password ?? 'admin123'
  });

  useAuthSessionStore
    .getState()
    .setSession(session, options.rememberSession);

  return session;
}
