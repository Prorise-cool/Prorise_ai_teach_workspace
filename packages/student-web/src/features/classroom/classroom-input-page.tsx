/**
 * 文件说明：课堂工作区入口占位页。
 * 当前先承接 Story 1.3 的一致性验证控制台，并为后续课堂输入 Story 预留正式业务入口。
 */
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { authService, type AuthService } from '@/services/auth';
import {
  authConsistencyService,
  type AuthConsistencyService,
  type AuthSessionProbe
} from '@/services/auth-consistency';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';

import '@/features/classroom/styles/classroom-input-page.scss';

const FORBIDDEN_DEMO_PERMISSION = 'demo:restricted:enter';

type EntryNavLink = {
  href: string;
  label: string;
};

type ClassroomInputPageProps = {
  consistencyService?: AuthConsistencyService;
  service?: AuthService;
};

function resolveProbeErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && ('status' in error || 'code' in error)) {
    return error.message;
  }

  return fallbackMessage;
}

/**
 * 渲染课堂工作区占位页，并保留真实登录态验证控制台。
 *
 * @param props - 页面参数。
 * @returns 课堂入口页节点。
 */
export function ClassroomInputPage({
  consistencyService = authConsistencyService,
  service = authService
}: ClassroomInputPageProps) {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const session = useAuthSessionStore(state => state.session);
  const { isLoggingOut, logout } = useAuthSessionActions({ service });
  const navLinks = t('entryNav.landingLinks', {
    returnObjects: true
  }) as EntryNavLink[];
  const sessionProbeMutation = useMutation({
    mutationKey: ['auth', 'session-probe', session?.accessToken],
    retry: false,
    mutationFn: async () => consistencyService.getSessionProbe(session?.accessToken),
    onSuccess: () => {
      notify({
        tone: 'success',
        title: t('home.sessionProbeSuccessTitle'),
        description: t('home.sessionProbeSuccessMessage')
      });
    }
  });
  const permissionProbeMutation = useMutation({
    mutationKey: ['auth', 'permission-probe', session?.accessToken],
    retry: false,
    mutationFn: async () =>
      consistencyService.getPermissionProbe(
        FORBIDDEN_DEMO_PERMISSION,
        session?.accessToken
      )
  });
  const sessionProbePayload: AuthSessionProbe | undefined = sessionProbeMutation.data;
  const sessionProbeErrorMessage = sessionProbeMutation.error
    ? resolveProbeErrorMessage(
        sessionProbeMutation.error,
        t('home.sessionProbeErrorFallback')
      )
    : '';

  return (
    <main className="xm-classroom-input-page min-h-screen px-5 pb-12 pt-5 md:px-8">
      <GlobalTopNav
        links={navLinks}
        showAuthAction
        showBrandIcon
        showLocaleToggle
        className="xm-landing-glass-nav"
      />

      <section className="xm-classroom-input-page__grid mx-auto mt-10 grid max-w-[1280px] gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="xm-surface-card">
          <CardContent className="p-8">
            <Badge variant="floating">{t('entryRoutes.classroom.badge')}</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
              {t('entryRoutes.classroom.title')}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {t('entryRoutes.classroom.description')}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => {
                  sessionProbeMutation.mutate();
                }}
                disabled={sessionProbeMutation.isPending}
              >
                {sessionProbeMutation.isPending
                  ? t('home.sessionProbeLoading')
                  : t('home.sessionProbeAction')}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  permissionProbeMutation.mutate();
                }}
                disabled={permissionProbeMutation.isPending}
              >
                {t('home.permissionProbeAction')}
              </Button>

              <Button asChild variant="outline">
                <Link to="/landing">{t('entryRoutes.classroom.secondaryAction')}</Link>
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
          </CardContent>
        </Card>

        <Card className="xm-surface-card">
          <CardHeader className="pb-0">
            <CardTitle>{t('home.currentSessionTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="space-y-3 text-sm text-muted-foreground">
            <div>
              <dt>{t('home.currentUserLabel')}</dt>
              <dd className="mt-1 font-medium text-foreground">
                {session?.user.nickname ?? '-'}
              </dd>
            </div>
            <div>
              <dt>{t('home.currentAccountLabel')}</dt>
              <dd className="mt-1 font-medium text-foreground">
                {session?.user.username ?? '-'}
              </dd>
            </div>
            <div>
              <dt>{t('home.currentRolesLabel')}</dt>
              <dd className="mt-1 font-medium text-foreground">
                {session?.user.roles.map(role => role.name).join(' / ') || '-'}
              </dd>
            </div>
            <div>
              <dt>{t('home.currentPermissionsLabel')}</dt>
              <dd className="mt-1 break-all font-medium text-foreground">
                {session?.user.permissions.map(permission => permission.key).join(', ') || '-'}
              </dd>
            </div>
            </dl>
          </CardContent>
        </Card>
      </section>

      <section className="xm-classroom-input-page__probe mx-auto mt-6 max-w-[1280px]">
        <Card className="xm-surface-card">
          <CardHeader className="pb-0">
            <CardTitle>{t('home.sessionProbeTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">

          {sessionProbeMutation.isSuccess && sessionProbePayload ? (
            <dl className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt>{t('home.sessionProbeUserIdLabel')}</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {sessionProbePayload.userId}
                </dd>
              </div>
              <div>
                <dt>{t('home.sessionProbeTtlLabel')}</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {sessionProbePayload.onlineTtlSeconds ?? '-'}
                </dd>
              </div>
              <div>
                <dt>{t('home.sessionProbeRequestIdLabel')}</dt>
                <dd className="mt-1 break-all font-medium text-foreground">
                  {sessionProbePayload.requestId ?? '-'}
                </dd>
              </div>
              <div>
                <dt>{t('home.sessionProbePermissionsLabel')}</dt>
                <dd className="mt-1 break-all font-medium text-foreground">
                  {sessionProbePayload.permissions.join(', ') || '-'}
                </dd>
              </div>
            </dl>
          ) : null}

          {sessionProbeMutation.isError ? (
            <p className="mt-4 text-sm text-destructive">
              {sessionProbeErrorMessage}
            </p>
          ) : null}

          {sessionProbeMutation.isIdle ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t('home.sessionProbeHint')}
            </p>
          ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
