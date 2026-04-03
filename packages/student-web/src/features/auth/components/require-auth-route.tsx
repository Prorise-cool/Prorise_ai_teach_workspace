/**
 * 文件说明：受保护路由守卫。
 * 未登录访问业务页时统一跳转到登录页；本地存在会话时继续做一次真实校验。
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
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

function resolveLoginSearch(returnTo: string) {
  return returnTo === DEFAULT_AUTH_RETURN_TO
    ? ''
    : `?${AUTH_RETURN_TO_KEY}=${encodeURIComponent(returnTo)}`;
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
  const { notify, showLoadingBar, hideLoadingBar } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthSessionStore(state => state.session);
  const setSession = useAuthSessionStore(state => state.setSession);
  const clearSession = useAuthSessionStore(state => state.clearSession);
  const hasRedirectedRef = useRef(false);
  const handledQueryErrorAtRef = useRef(0);
  const loadingBarIdRef = useRef<string | null>(null);
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
  const accessToken = session?.accessToken;
  const validationQuery = useQuery({
    queryKey: ['auth', 'current-user', accessToken],
    enabled: Boolean(accessToken),
    retry: false,
    queryFn: async () => service.getCurrentUser(accessToken)
  });

  const validationState: SessionValidationState =
    accessToken && validationQuery.isSuccess
      ? 'ready'
      : accessToken && validationQuery.isError
        ? 'error'
        : 'checking';
  const validationErrorMessage = validationQuery.isError
    ? getAuthFeedbackMessage(
        validationQuery.error,
        t('auth.feedback.sessionCheckFailedMessage')
      )
    : '';
  const isRedirectingAuthError =
    validationQuery.isError &&
    isAuthError(validationQuery.error) &&
    (validationQuery.error.status === 401 ||
      validationQuery.error.status === 403);

  useEffect(() => {
    if (accessToken || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    notify({
      tone: 'warning',
      title: t('auth.feedback.authRequiredTitle'),
      description: t('auth.feedback.authRequiredMessage')
    });

    void navigate(
      {
        pathname: AUTH_LOGIN_PATH,
        search: resolveLoginSearch(returnTo)
      },
      {
        replace: true,
        state: {
          returnTo
        }
      }
    );
  }, [accessToken, navigate, notify, returnTo, t]);

  useEffect(() => {
    const shouldShowLoadingBar =
      Boolean(session?.accessToken) && validationState === 'checking';

    if (shouldShowLoadingBar) {
      if (loadingBarIdRef.current === null) {
        loadingBarIdRef.current = showLoadingBar();
      }

      return;
    }

    if (loadingBarIdRef.current !== null) {
      hideLoadingBar(loadingBarIdRef.current);
      loadingBarIdRef.current = null;
    }
  }, [
    hideLoadingBar,
    session?.accessToken,
    showLoadingBar,
    validationState
  ]);

  useEffect(() => {
    return () => {
      if (loadingBarIdRef.current !== null) {
        hideLoadingBar(loadingBarIdRef.current);
        loadingBarIdRef.current = null;
      }
    };
  }, [hideLoadingBar]);

  useEffect(() => {
    if (!accessToken || !validationQuery.data) {
      return;
    }

    const currentSession = useAuthSessionStore.getState().session;

    if (!currentSession?.accessToken) {
      return;
    }

    setSession({
      ...currentSession,
      user: validationQuery.data
    });
  }, [accessToken, setSession, validationQuery.data]);

  useEffect(() => {
    if (
      !accessToken ||
      !validationQuery.isError ||
      validationQuery.errorUpdatedAt === handledQueryErrorAtRef.current
    ) {
      return;
    }

    handledQueryErrorAtRef.current = validationQuery.errorUpdatedAt;

    if (isAuthError(validationQuery.error) && validationQuery.error.status === 401) {
      clearSession();
      notify({
        tone: 'warning',
        title: t('auth.feedback.authRequiredTitle'),
        description: t('auth.feedback.authRequiredMessage')
      });

      void navigate(
        {
          pathname: AUTH_LOGIN_PATH,
          search: resolveLoginSearch(returnTo)
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

    if (isAuthError(validationQuery.error) && validationQuery.error.status === 403) {
      notify({
        tone: 'warning',
        title: t('auth.feedback.permissionDeniedTitle'),
        description: getAuthFeedbackMessage(
          validationQuery.error,
          t('auth.feedback.permissionDeniedMessage')
        )
      });

      void navigate(AUTH_FORBIDDEN_PATH, {
        replace: true,
        state: {
          from: returnTo,
          message: getAuthFeedbackMessage(
            validationQuery.error,
            t('auth.feedback.permissionDeniedMessage')
          )
        }
      });
    }
  }, [
    accessToken,
    clearSession,
    navigate,
    notify,
    returnTo,
    t,
    validationQuery.error,
    validationQuery.errorUpdatedAt,
    validationQuery.isError
  ]);

  if (session?.accessToken && validationState === 'ready') {
    return <Outlet />;
  }

  if (session?.accessToken && validationState === 'error' && !isRedirectingAuthError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-xl flex-col gap-5">
          <FeedbackStateCard
            tone="warning"
            title={t('auth.feedback.sessionCheckFailedTitle')}
            description={validationErrorMessage}
          />

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={validationQuery.isFetching}
              onClick={() => {
                void validationQuery.refetch();
              }}
            >
              {t('auth.page.retrySessionCheck')}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void logout();
              }}
              disabled={isLoggingOut}
            >
              {isLoggingOut
                ? t('auth.page.logoutSubmitting')
                : t('auth.page.logoutAction')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (session?.accessToken && validationState === 'checking') {
    return (
      <main className="min-h-screen w-full" aria-busy="true">
        <p className="sr-only">{t('auth.feedback.sessionCheckingMessage')}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full" aria-busy="true">
      <p className="sr-only">{t('auth.feedback.authRequiredMessage')}</p>
    </main>
  );
}
