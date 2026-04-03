/**
 * 文件说明：封装当前登录会话的常用动作。
 * 负责统一登出、会话清理和认证页跳转反馈。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { authService, type AuthService } from '@/services/auth';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import { AUTH_LOGIN_PATH } from '@/types/auth';

type LogoutOptions = {
  redirectTo?: string;
  replace?: boolean;
  showFeedback?: boolean;
};

type UseAuthSessionActionsOptions = {
  service?: AuthService;
};

/**
 * 提供当前认证会话的统一动作。
 *
 * @param options - Hook 参数。
 * @param options.service - 可替换的认证服务实现。
 * @returns 登出动作与执行状态。
 */
export function useAuthSessionActions({
  service = authService
}: UseAuthSessionActionsOptions = {}) {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const session = useAuthSessionStore(state => state.session);
  const clearSession = useAuthSessionStore(state => state.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout({
    redirectTo = AUTH_LOGIN_PATH,
    replace = true,
    showFeedback = true
  }: LogoutOptions = {}) {
    setIsLoggingOut(true);

    try {
      await service.logout(session?.accessToken);
    } catch {
      // 本地收口优先，远端登出失败时仍然回收当前会话，避免坏态残留。
    } finally {
      clearSession();
      setIsLoggingOut(false);
    }

    if (showFeedback) {
      notify({
        tone: 'success',
        title: t('auth.feedback.logoutSuccessTitle'),
        description: t('auth.feedback.logoutSuccessMessage')
      });
    }

    void navigate(redirectTo, {
      replace,
      state: null
    });
  }

  return {
    isLoggingOut,
    logout
  };
}
