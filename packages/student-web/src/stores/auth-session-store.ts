/**
 * 文件说明：持久化认证会话状态。
 * 用于统一保存当前登录会话，并提供重置入口给页面与测试复用。
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthSession } from '@/types/auth';

export const AUTH_SESSION_STORAGE_KEY = 'xiaomai-auth-session';

type AuthSessionStoreState = {
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

const AUTH_SESSION_INITIAL_STATE = {
  session: null
} satisfies Pick<AuthSessionStoreState, 'session'>;

export const useAuthSessionStore = create<AuthSessionStoreState>()(
  persist(
    set => ({
      ...AUTH_SESSION_INITIAL_STATE,
      setSession: session => set({ session }),
      clearSession: () => set(AUTH_SESSION_INITIAL_STATE)
    }),
    {
      name: AUTH_SESSION_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        session: state.session
      })
    }
  )
);

/**
 * 重置认证会话状态，并清理本地持久化缓存。
 *
 * @returns 无返回值。
 */
export function resetAuthSessionStore() {
  useAuthSessionStore.setState(AUTH_SESSION_INITIAL_STATE);

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  }
}
