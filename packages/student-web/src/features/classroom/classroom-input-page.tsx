/**
 * 文件说明：课堂工作区入口占位页。
 * 当前先承接 Story 1.3 的一致性验证控制台，并为后续课堂输入 Story 预留正式业务入口。
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { authService, type AuthService } from '@/services/auth';
import {
  authConsistencyService,
  type AuthConsistencyService,
  type AuthSessionProbe
} from '@/services/auth-consistency';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';

import '@/features/home/styles/entry-pages.css';

const FORBIDDEN_DEMO_PERMISSION = 'demo:restricted:enter';

type SessionProbeState =
  | {
      status: 'idle' | 'loading';
      payload: null;
      errorMessage: string;
    }
  | {
      status: 'success';
      payload: AuthSessionProbe;
      errorMessage: string;
    }
  | {
      status: 'error';
      payload: null;
      errorMessage: string;
    };

type EntryNavLink = {
  href: string;
  label: string;
};

type ClassroomInputPageProps = {
  consistencyService?: AuthConsistencyService;
  service?: AuthService;
};

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
  const [sessionProbeState, setSessionProbeState] =
    useState<SessionProbeState>({
      status: 'idle',
      payload: null,
      errorMessage: ''
    });

  async function handleSessionProbe() {
    setSessionProbeState({
      status: 'loading',
      payload: null,
      errorMessage: ''
    });

    try {
      const payload = await consistencyService.getSessionProbe(
        session?.accessToken
      );

      setSessionProbeState({
        status: 'success',
        payload,
        errorMessage: ''
      });
      notify({
        tone: 'success',
        title: t('home.sessionProbeSuccessTitle'),
        description: t('home.sessionProbeSuccessMessage')
      });
    } catch (error) {
      if (error instanceof Error && ('status' in error || 'code' in error)) {
        setSessionProbeState({
          status: 'error',
          payload: null,
          errorMessage: error.message
        });
        return;
      }

      setSessionProbeState({
        status: 'error',
        payload: null,
        errorMessage: t('home.sessionProbeErrorFallback')
      });
    }
  }

  async function handleForbiddenProbe() {
    try {
      await consistencyService.getPermissionProbe(
        FORBIDDEN_DEMO_PERMISSION,
        session?.accessToken
      );
    } catch {
      // 403 分支会由全局认证桥接统一处理并跳到权限不足页。
    }
  }

  return (
    <main className="min-h-screen px-5 pb-12 pt-5 md:px-8">
      <GlobalTopNav
        links={navLinks}
        showAuthAction
        showBrandIcon
        showLocaleToggle
        className="xm-landing-glass-nav"
      />

      <section className="mx-auto mt-10 grid max-w-[1280px] gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="xm-surface-card rounded-[var(--xm-radius-xl)] p-8">
          <span className="xm-floating-pill inline-flex px-3 py-1 text-sm font-medium">
            {t('entryRoutes.classroom.badge')}
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            {t('entryRoutes.classroom.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {t('entryRoutes.classroom.description')}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              onClick={() => {
                void handleSessionProbe();
              }}
              disabled={sessionProbeState.status === 'loading'}
            >
              {sessionProbeState.status === 'loading'
                ? t('home.sessionProbeLoading')
                : t('home.sessionProbeAction')}
            </button>

            <button
              type="button"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={() => {
                void handleForbiddenProbe();
              }}
            >
              {t('home.permissionProbeAction')}
            </button>

            <Link
              to="/landing"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {t('entryRoutes.classroom.secondaryAction')}
            </Link>

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

        <div className="xm-surface-card rounded-[var(--xm-radius-xl)] p-8">
          <h2 className="text-lg font-semibold text-foreground">
            {t('home.currentSessionTitle')}
          </h2>
          <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
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
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-[1280px]">
        <div className="xm-surface-card rounded-[var(--xm-radius-xl)] p-8">
          <h2 className="text-lg font-semibold text-foreground">
            {t('home.sessionProbeTitle')}
          </h2>

          {sessionProbeState.status === 'success' && sessionProbeState.payload ? (
            <dl className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt>{t('home.sessionProbeUserIdLabel')}</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {sessionProbeState.payload.userId}
                </dd>
              </div>
              <div>
                <dt>{t('home.sessionProbeTtlLabel')}</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {sessionProbeState.payload.onlineTtlSeconds ?? '-'}
                </dd>
              </div>
              <div>
                <dt>{t('home.sessionProbeRequestIdLabel')}</dt>
                <dd className="mt-1 break-all font-medium text-foreground">
                  {sessionProbeState.payload.requestId ?? '-'}
                </dd>
              </div>
              <div>
                <dt>{t('home.sessionProbePermissionsLabel')}</dt>
                <dd className="mt-1 break-all font-medium text-foreground">
                  {sessionProbeState.payload.permissions.join(', ') || '-'}
                </dd>
              </div>
            </dl>
          ) : null}

          {sessionProbeState.status === 'error' ? (
            <p className="mt-4 text-sm text-destructive">
              {sessionProbeState.errorMessage}
            </p>
          ) : null}

          {sessionProbeState.status === 'idle' ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t('home.sessionProbeHint')}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
