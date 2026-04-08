/**
 * 文件说明：统一封装前端测试的会话种子、状态清理与默认环境重置。
 * 供认证、profile、video、classroom 等运行态测试复用。
 */
import { APP_DEFAULT_LOCALE, appI18n } from '@/app/i18n';
import {
  createEmptyUserProfile
} from '@/features/profile/types';
import { resetUserProfileStore } from '@/features/profile/stores/user-profile-store';
import { useUserProfileStore } from '@/features/profile/stores/user-profile-store';
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

type SeedCompletedUserProfileOptions = {
  bio?: string;
  userId?: string;
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

/**
 * 为指定用户注入一份已完成 onboarding 的资料，供受保护路由与登录回跳测试复用。
 *
 * @param options - 资料种子选项。
 * @returns 已写入 store 的用户资料。
 */
export function seedCompletedUserProfile(
  options: SeedCompletedUserProfileOptions = {}
) {
  const profile = {
    ...createEmptyUserProfile(options.userId ?? '1'),
    bio: options.bio ?? '浏览器测试资料已完善',
    isCompleted: true
  };

  useUserProfileStore.getState().setProfile(profile);

  return profile;
}
