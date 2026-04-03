/**
 * 文件说明：Story 1.3 的登录态与访问一致性页面。
 * 负责展示当前会话、触发 FastAPI 受保护探针，并提供统一登出入口。
 */
import { useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
  authConsistencyService,
  type AuthConsistencyService,
  type AuthSessionProbe
} from '@/services/auth-consistency';
import { authService, type AuthService } from '@/services/auth';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';

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

type HomePageProps = {
  consistencyService?: AuthConsistencyService;
  service?: AuthService;
};

/**
 * 渲染当前登录会话与认证一致性操作台。
 *
 * @returns 首页占位页面节点。
 */
export function HomePage({
  consistencyService = authConsistencyService,
  service = authService
}: HomePageProps) {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const session = useAuthSessionStore(state => state.session);
  const { isLoggingOut, logout } = useAuthSessionActions({ service });
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
      if (
        error instanceof Error &&
        ('status' in error || 'code' in error)
      ) {
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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
      <section className="xm-surface-card flex w-full flex-col gap-8 rounded-[var(--xm-radius-xl)] p-10">
        <div className="space-y-4">
          <span className="xm-floating-pill inline-flex px-3 py-1 text-sm font-medium">
            {t('home.sessionBadge')}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {t('home.title')}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {t('home.description')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-[var(--xm-radius-lg)] border border-border/70 bg-background/60 p-6">
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
          </section>

          <section className="rounded-[var(--xm-radius-lg)] border border-border/70 bg-background/60 p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {t('home.actionsTitle')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t('home.actionsDescription')}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
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
          </section>
        </div>

        <section className="rounded-[var(--xm-radius-lg)] border border-border/70 bg-background/60 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t('home.sessionProbeTitle')}
          </h2>

          {sessionProbeState.status === 'success' && sessionProbeState.payload ? (
            <dl className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
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
        </section>
      </section>
    </main>
  );
}
