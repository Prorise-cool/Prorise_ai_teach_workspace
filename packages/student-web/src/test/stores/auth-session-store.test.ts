/**
 * 文件说明：验证认证会话 store 的持久化策略与记忆模式切换。
 */
import { createAuthService } from '@/services/auth';
import { createMockAuthAdapter } from '@/services/api/adapters';
import {
  AUTH_SESSION_STORAGE_KEY,
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';

const mockAuthService = createAuthService(createMockAuthAdapter());

describe('auth session store', () => {
  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persists remembered sessions to localStorage and preserves that mode across updates', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session, true);

    expect(useAuthSessionStore.getState().rememberSession).toBe(true);
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toContain(
      'mock-auth-admin-access-token'
    );

    useAuthSessionStore.getState().setSession({
      ...session,
      user: {
        ...session.user,
        nickname: '更新后的昵称'
      }
    });

    expect(useAuthSessionStore.getState().rememberSession).toBe(true);
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toContain(
      '更新后的昵称'
    );
  });

  it('persists session-only logins to sessionStorage and keeps that mode on follow-up updates', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session, false);

    expect(useAuthSessionStore.getState().rememberSession).toBe(false);
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toContain(
      'mock-auth-admin-access-token'
    );

    useAuthSessionStore.getState().setSession({
      ...session,
      user: {
        ...session.user,
        nickname: '会话内更新'
      }
    });

    expect(useAuthSessionStore.getState().rememberSession).toBe(false);
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toContain(
      '会话内更新'
    );
  });

  it('clears both storages when the session is reset', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session, false);
    resetAuthSessionStore();

    expect(useAuthSessionStore.getState().session).toBeNull();
    expect(useAuthSessionStore.getState().rememberSession).toBe(true);
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });
});
