/**
 * 文件说明：统一维护前端认证会话、登录注册提交态与本地持久化同步。
 */
import { create } from 'zustand';

import { authService } from '@/services/auth';
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession
} from '@/services/auth-storage';
import type { AuthLoginInput, AuthRegisterInput, AuthSession } from '@/types/auth';

type AuthStoreState = {
  session: AuthSession | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  hydrateFromStorage: () => void;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  login: (input: AuthLoginInput) => Promise<AuthSession>;
  register: (input: AuthRegisterInput) => Promise<AuthSession>;
  logout: () => Promise<void>;
  setErrorMessage: (message: string | null) => void;
};

function persistSession(session: AuthSession | null) {
  if (!session) {
    clearStoredAuthSession();
    return;
  }

  writeStoredAuthSession(session);
}

const initialSession = readStoredAuthSession();

/** 统一认证会话 store。 */
export const useAuthStore = create<AuthStoreState>((set, get) => ({
  session: initialSession,
  isSubmitting: false,
  errorMessage: null,
  hydrateFromStorage() {
    set({
      session: readStoredAuthSession()
    });
  },
  setSession(session) {
    persistSession(session);
    set({
      session,
      errorMessage: null
    });
  },
  clearSession() {
    persistSession(null);
    set({
      session: null,
      isSubmitting: false
    });
  },
  async login(input) {
    set({
      isSubmitting: true,
      errorMessage: null
    });

    try {
      const session = await authService.login(input);

      get().setSession(session);

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败，请稍后重试';

      set({
        errorMessage: message
      });
      throw error;
    } finally {
      set({
        isSubmitting: false
      });
    }
  },
  async register(input) {
    set({
      isSubmitting: true,
      errorMessage: null
    });

    try {
      const session = await authService.register(input);

      get().setSession(session);

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : '注册失败，请稍后重试';

      set({
        errorMessage: message
      });
      throw error;
    } finally {
      set({
        isSubmitting: false
      });
    }
  },
  async logout() {
    const accessToken = get().session?.accessToken;

    try {
      await authService.logout(accessToken);
    } finally {
      get().clearSession();
    }
  },
  setErrorMessage(message) {
    set({
      errorMessage: message
    });
  }
}));

/** 仅供测试回滚到干净状态。 */
export function resetAuthStoreForTest() {
  clearStoredAuthSession();
  useAuthStore.setState({
    session: null,
    isSubmitting: false,
    errorMessage: null
  });
}
