/**
 * 文件说明：受保护路由守卫。
 * 未登录访问业务页时统一跳转到登录页；本地存在会话时继续做一次真实校验。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { isAuthError } from '@/services/api/adapters';
import { AUTH_RETURN_TO_KEY, normalizeReturnTo } from '@/services/auth';
import { authService, type AuthService } from '@/services/auth';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { getAuthFeedbackMessage } from '@/features/auth/shared/auth-feedback';
import { FeedbackStateCard, useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import {
  AUTH_FORBIDDEN_PATH,
  AUTH_LOGIN_PATH,
  DEFAULT_AUTH_RETURN_TO
} from '@/types/auth';

type RequireAuthRouteProps = {
  service?: AuthService;
};

type SessionValidationState = 'checking' | 'ready' | 'error';

function resolveGuardReturnTo(
  pathname: string,
  search: string,
  hash: string
) {
  return normalizeReturnTo(
    `${pathname}${search}${hash}`,
    DEFAULT_AUTH_RETURN_TO
  );
}

/**
 * 守卫受保护页面。
 *
 * @param props - 路由守卫参数。
 * @param props.service - 可替换的认证服务实现，默认使用正式服务。
 * @returns 已登录时渲染子路由；未登录时显示过渡反馈并跳到登录页。
 */
export function RequireAuthRoute({
  service = authService
}: RequireAuthRouteProps) {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthSessionStore(state => state.session);
  const setSession = useAuthSessionStore(state => state.setSession);
  const clearSession = useAuthSessionStore(state => state.clearSession);
  const [validationState, setValidationState] =
    useState<SessionValidationState>('checking');
  const [validationErrorMessage, setValidationErrorMessage] = useState('');
  const [validationAttempt, setValidationAttempt] = useState(0);
  const hasRedirectedRef = useRef(false);
  const { isLoggingOut, logout } = useAuthSessionActions({ service });

  const returnTo = useMemo(
    () =>
      resolveGuardReturnTo(
        location.pathname,
        location.search,
        location.hash
      ),
    [location.hash, location.pathname, location.search]
  );

  useEffect(() => {
    if (session?.accessToken || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    notify({
      tone: 'warning',
      title: t('auth.feedback.authRequiredTitle'),
      description: t('auth.feedback.authRequiredMessage')
    });

    const search =
      returnTo === DEFAULT_AUTH_RETURN_TO
        ? ''
        : `?${AUTH_RETURN_TO_KEY}=${encodeURIComponent(returnTo)}`;

    void navigate(
      {
        pathname: AUTH_LOGIN_PATH,
        search
      },
      {
        replace: true,
        state: {
          returnTo
        }
      }
    );
  }, [navigate, notify, returnTo, session?.accessToken, t]);

  useEffect(() => {
    const accessToken = session?.accessToken;

    if (!accessToken) {
      setValidationState('checking');
      setValidationErrorMessage('');
      return;
    }

    let cancelled = false;

    async function validateCurrentSession() {
      setValidationState('checking');
      setValidationErrorMessage('');

      try {
        const user = await service.getCurrentUser(accessToken);

        if (cancelled) {
          return;
        }

        const currentSession = useAuthSessionStore.getState().session;

        if (!currentSession?.accessToken) {
          return;
        }

        setSession({
          ...currentSession,
          user
        });
        setValidationState('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isAuthError(error) && error.status === 401) {
          clearSession();
          notify({
            tone: 'warning',
            title: t('auth.feedback.authRequiredTitle'),
            description: t('auth.feedback.authRequiredMessage')
          });

          void navigate(
            {
              pathname: AUTH_LOGIN_PATH,
              search:
                returnTo === DEFAULT_AUTH_RETURN_TO
                  ? ''
                  : `?${AUTH_RETURN_TO_KEY}=${encodeURIComponent(returnTo)}`
            },
            {
              replace: true,
              state: {
                returnTo
              }
            }
          );

          return;
        }

        if (isAuthError(error) && error.status === 403) {
          notify({
            tone: 'warning',
            title: t('auth.feedback.permissionDeniedTitle'),
            description: getAuthFeedbackMessage(
              error,
              t('auth.feedback.permissionDeniedMessage')
            )
          });

          void navigate(AUTH_FORBIDDEN_PATH, {
            replace: true,
            state: {
              from: returnTo,
              message: getAuthFeedbackMessage(
                error,
                t('auth.feedback.permissionDeniedMessage')
              )
            }
          });

          return;
        }

        setValidationState('error');
        setValidationErrorMessage(
          getAuthFeedbackMessage(
            error,
            t('auth.feedback.sessionCheckFailedMessage')
          )
        );
      }
    }

    void validateCurrentSession();

    return () => {
      cancelled = true;
    };
  }, [
    clearSession,
    navigate,
    notify,
    returnTo,
    service,
    session?.accessToken,
    setSession,
    t,
    validationAttempt
  ]);

  if (session?.accessToken && validationState === 'ready') {
    return <Outlet />;
  }

  if (session?.accessToken && validationState === 'error') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-xl flex-col gap-5">
          <FeedbackStateCard
            tone="warning"
            title={t('auth.feedback.sessionCheckFailedTitle')}
            description={validationErrorMessage}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              onClick={() => {
                setValidationAttempt(current => current + 1);
              }}
            >
              {t('auth.page.retrySessionCheck')}
            </button>

            <button
              type="button"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={() => {
                void logout();
              }}
              disabled={isLoggingOut}
            >
              {isLoggingOut
                ? t('auth.page.logoutSubmitting')
                : t('auth.page.logoutAction')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
      <FeedbackStateCard
        tone={session?.accessToken ? 'info' : 'warning'}
        title={
          session?.accessToken
            ? t('auth.feedback.sessionCheckingTitle')
            : t('auth.feedback.authRequiredTitle')
        }
        description={
          session?.accessToken
            ? t('auth.feedback.sessionCheckingMessage')
            : t('auth.feedback.authRequiredMessage')
        }
        loading
      />
    </main>
  );
}
