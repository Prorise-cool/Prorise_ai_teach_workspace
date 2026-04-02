/**
 * 文件说明：受保护路由守卫。
 * 未登录访问业务页时，统一跳转到登录页，并保留原始 returnTo。
 */
import { useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { AUTH_RETURN_TO_KEY, normalizeReturnTo } from '@/services/auth';
import { FeedbackStateCard, useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import { AUTH_LOGIN_PATH, DEFAULT_AUTH_RETURN_TO } from '@/types/auth';

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
 * @returns 已登录时渲染子路由；未登录时显示过渡反馈并跳到登录页。
 */
export function RequireAuthRoute() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthSessionStore(state => state.session);
  const hasRedirectedRef = useRef(false);

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

  if (session?.accessToken) {
    return <Outlet />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
      <FeedbackStateCard
        tone="warning"
        title={t('auth.feedback.authRequiredTitle')}
        description={t('auth.feedback.authRequiredMessage')}
        loading
      />
    </main>
  );
}
