/**
 * 文件说明：持久化认证会话状态。
 * 用于统一保存当前登录会话，并提供重置入口给页面与测试复用。
 */
import { create } from 'zustand';

import type { AuthSession } from '@/types/auth';

export const AUTH_SESSION_STORAGE_KEY = 'xiaomai-auth-session';

type AuthSessionStoreState = {
  session: AuthSession | null;
  rememberSession: boolean;
  setSession: (session: AuthSession, rememberSession?: boolean) => void;
  clearSession: () => void;
};

const AUTH_SESSION_INITIAL_STATE = {
  session: null,
  rememberSession: true
} satisfies Pick<AuthSessionStoreState, 'session' | 'rememberSession'>;

function readStoredAuthSession(storage: Storage | undefined) {
  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);

    return null;
  }
}

function readPersistedAuthSession() {
  if (typeof window === 'undefined') {
    return AUTH_SESSION_INITIAL_STATE;
  }

  const sessionStorageSession = readStoredAuthSession(window.sessionStorage);

  if (sessionStorageSession) {
    return {
      session: sessionStorageSession,
      rememberSession: false
    };
  }

  const localStorageSession = readStoredAuthSession(window.localStorage);

  if (localStorageSession) {
    return {
      session: localStorageSession,
      rememberSession: true
    };
  }

  return AUTH_SESSION_INITIAL_STATE;
}

function clearStoredAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

function persistAuthSession(
  session: AuthSession,
  rememberSession: boolean
) {
  if (typeof window === 'undefined') {
    return;
  }

  clearStoredAuthSession();

  const storage = rememberSession
    ? window.localStorage
    : window.sessionStorage;

  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export const useAuthSessionStore = create<AuthSessionStoreState>()(
  (set, get) => ({
    ...readPersistedAuthSession(),
    setSession: (session, rememberSession) => {
      const nextRememberSession =
        rememberSession ?? get().rememberSession ?? true;

      persistAuthSession(session, nextRememberSession);
      set({
        session,
        rememberSession: nextRememberSession
      });
    },
    clearSession: () => {
      clearStoredAuthSession();
      set(AUTH_SESSION_INITIAL_STATE);
    }
  })
);

/**
 * 重置认证会话状态，并清理本地持久化缓存。
 *
 * @returns 无返回值。
 */
export function resetAuthSessionStore() {
  useAuthSessionStore.setState(AUTH_SESSION_INITIAL_STATE);
  clearStoredAuthSession();
}
