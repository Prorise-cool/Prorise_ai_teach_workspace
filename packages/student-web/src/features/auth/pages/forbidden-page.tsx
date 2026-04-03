/**
 * 文件说明：统一承接权限不足状态页。
 * 用于区分登录失效与已登录但无权限两类认证失败分支。
 */
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { FeedbackStateCard } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import { AUTH_LOGIN_PATH, DEFAULT_AUTH_RETURN_TO } from '@/types/auth';

/**
 * 从路由状态中提取来源路径。
 *
 * @param state - 当前路由状态。
 * @returns 可展示的来源路径。
 */
function readForbiddenFrom(state: unknown) {
  if (!state || typeof state !== 'object' || !('from' in state)) {
    return DEFAULT_AUTH_RETURN_TO;
  }

  return typeof state.from === 'string'
    ? state.from
    : DEFAULT_AUTH_RETURN_TO;
}

/**
 * 从路由状态中提取权限不足说明。
 *
 * @param state - 当前路由状态。
 * @returns 最终展示的说明文案。
 */
function readForbiddenMessage(state: unknown) {
  if (!state || typeof state !== 'object' || !('message' in state)) {
    return undefined;
  }

  return typeof state.message === 'string' ? state.message : undefined;
}

/**
 * 渲染权限不足提示页。
 *
 * @returns 权限不足页节点。
 */
export function ForbiddenPage() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthSessionStore(state => state.session);
  const { isLoggingOut, logout } = useAuthSessionActions();

  const returnTo = readForbiddenFrom(location.state);
  const message =
    readForbiddenMessage(location.state) ??
    t('auth.feedback.permissionDeniedMessage');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
      <Card className="xm-surface-card w-full max-w-3xl">
        <CardContent className="flex flex-col gap-6 p-8">
          <Badge variant="floating" className="w-fit">
            {t('auth.page.forbiddenBadge')}
          </Badge>

          <FeedbackStateCard
            tone="warning"
            title={t('auth.feedback.permissionDeniedTitle')}
            description={message}
          />

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t('auth.page.forbiddenContextLabel')}</p>
            <strong className="block text-foreground">{returnTo}</strong>
            {session?.user.nickname ? (
              <p>
                {t('auth.page.forbiddenCurrentUser')}
                <strong className="ml-1 text-foreground">
                  {session.user.nickname}
                </strong>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => {
                void navigate(returnTo, {
                  replace: true,
                  state: null
                });
              }}
            >
              {t('auth.page.backToPrevious')}
            </Button>

            <Button asChild variant="outline">
              <Link to={DEFAULT_AUTH_RETURN_TO}>{t('auth.page.backHome')}</Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void logout({
                  redirectTo: AUTH_LOGIN_PATH
                });
              }}
              disabled={isLoggingOut}
            >
              {isLoggingOut
                ? t('auth.page.logoutSubmitting')
                : t('auth.page.switchAccount')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
