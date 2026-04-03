/**
 * 文件说明：认证页页面容器。
 * 负责装配认证服务、会话写入和回跳逻辑，不直接承载页面细碎的 UI 状态。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, MoonStar, SunMedium } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { AuthScene } from '@/features/auth/components/auth-scene';
import { LoginForm } from '@/features/auth/components/login-form';
import { RegisterForm } from '@/features/auth/components/register-form';
import { useAuthPageUiState } from '@/features/auth/hooks/use-auth-page-ui-state';
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect';
import { useAuthPageCopy } from '@/features/auth/shared/auth-content';
import { authService, type AuthService } from '@/services/auth';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import {
  AUTH_DEFAULT_TENANT_ID,
  type AuthSession
} from '@/types/auth';

import '@/features/auth/styles/login-page.css';

type LoginPageProps = {
  service?: AuthService;
};

type AuthView = 'login' | 'register';

/**
 * 渲染独立认证页，并编排认证服务、会话写入与认证后回跳。
 *
 * @param props - 认证页参数。
 * @param props.service - 可替换的认证服务实现，默认使用生产服务实例。
 * @returns 认证页节点。
 */
export function LoginPage({
  service = authService
}: LoginPageProps) {
  const { t } = useAppTranslation();
  const authPageCopy = useAuthPageCopy();
  const { notify } = useFeedback();
  const [activeView, setActiveView] = useState<AuthView>('login');
  const [registerEnabled, setRegisterEnabled] = useState(false);
  const [registerSucceeded, setRegisterSucceeded] = useState(false);
  const [prefilledLoginUsername, setPrefilledLoginUsername] = useState('');
  const [authRedirectReason, setAuthRedirectReason] = useState<
    'existing-session' | 'login-success'
  >('existing-session');
  const redirectFeedbackShownRef = useRef<'existing-session' | 'login-success' | null>(
    null
  );
  const registerFallbackNotifiedRef = useRef(false);

  // 页面容器 Session状态。
  const session = useAuthSessionStore(state => state.session);
  const setSession = useAuthSessionStore(state => state.setSession);

  const {
    themeMode,
    scenePhase,
    toggleThemeMode,
    handleSceneZoneChange
  } = useAuthPageUiState();
  
  const {
    returnTo,
    redirectAfterAuth
  } = useAuthRedirect();

  /**
   * 在认证成功后写入会话，并执行统一回跳。
   *
   * @param session - 已建立的认证会话。
   */
  function handleAuthenticated(session: AuthSession) {
    setRegisterSucceeded(false);
    setPrefilledLoginUsername('');
    setAuthRedirectReason('login-success');
    setSession(session);
  }

  useEffect(() => {
    if (session?.accessToken) {
      return;
    }

    redirectFeedbackShownRef.current = null;
  }, [session?.accessToken]);

  useLayoutEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    if (redirectFeedbackShownRef.current !== authRedirectReason) {
      const isFreshLogin = authRedirectReason === 'login-success';
      notify({
        tone: isFreshLogin ? 'success' : 'info',
        title: isFreshLogin
          ? t('auth.feedback.loginSuccessTitle')
          : t('auth.feedback.alreadySignedInTitle'),
        description: isFreshLogin
          ? t('auth.feedback.loginSuccessMessage')
          : t('auth.feedback.alreadySignedInMessage')
      });

      redirectFeedbackShownRef.current = authRedirectReason;
    }

    void redirectAfterAuth();
  }, [authRedirectReason, notify, redirectAfterAuth, session?.accessToken, t]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapRegisterState() {
      try {
        const enabled = await service.getRegisterEnabled(AUTH_DEFAULT_TENANT_ID);

        if (cancelled) {
          return;
        }

        setRegisterEnabled(enabled);

        if (!enabled) {
          setActiveView('login');
        }
      } catch {
        if (cancelled) {
          return;
        }

        setRegisterEnabled(false);
        setActiveView('login');

        if (!registerFallbackNotifiedRef.current) {
          registerFallbackNotifiedRef.current = true;
          notify({
            tone: 'warning',
            title: t('auth.feedback.registerStateFallbackTitle'),
            description: t('auth.feedback.registerStateFallbackMessage')
          });
        }
      }
    }

    void bootstrapRegisterState();

    return () => {
      cancelled = true;
    };
  }, [notify, service, t]);

  function switchToLogin() {
    setActiveView('login');
  }

  function switchToRegister() {
    if (!registerEnabled) {
      return;
    }

    setRegisterSucceeded(false);
    setActiveView('register');
  }

  function handleRegistered(username: string) {
    setRegisterSucceeded(true);
    setPrefilledLoginUsername(username);
    setActiveView('login');
    notify({
      tone: 'success',
      title: t('auth.feedback.registerSuccessTitle'),
      description: t('auth.feedback.registerSuccessMessage')
    });
  }

  const isRegisterView = registerEnabled && activeView === 'register';
  const viewTitle = isRegisterView
    ? authPageCopy.registerTitle
    : authPageCopy.loginTitle;
  if (session?.accessToken) {
    return null;
  }

  return (
    <main className="xm-auth-page">
      <div className="xm-auth-container">
        <AuthScene phase={scenePhase} />

        <section className="xm-auth-right-panel">
          <div className="xm-auth-brand-header">
            <span className="xm-auth-brand-icon" aria-hidden="true">
              <img
                src="/entry/logo.png"
                alt=""
                className="xm-auth-brand-logo"
              />
            </span>
            <span>{authPageCopy.brand}</span>
          </div>

          <Link className="xm-auth-back-link" to="/">
            <ArrowLeft size={16} />
            <span>{authPageCopy.backHome}</span>
          </Link>

          <div className="xm-auth-toolbar">
            <button
              type="button"
              className="xm-auth-icon-btn"
              aria-label={authPageCopy.themeToggle}
              onClick={toggleThemeMode}
            >
              {themeMode === 'dark' ? (
                <SunMedium size={18} />
              ) : (
                <MoonStar size={18} />
              )}
            </button>
          </div>

          <h1 className="xm-auth-view-title">
            {viewTitle}
          </h1>

          {registerSucceeded ? (
            <div className="xm-auth-return-banner" role="status">
              <span>{authPageCopy.registerSuccess}</span>
            </div>
          ) : null}

          {registerEnabled ? (
            <div className="xm-auth-tabs">
              <button
                type="button"
                className={`xm-auth-tab${!isRegisterView ? ' is-active' : ''}`}
                aria-pressed={!isRegisterView}
                onClick={switchToLogin}
              >
                {authPageCopy.loginTab}
              </button>
              <button
                type="button"
                className={`xm-auth-tab${isRegisterView ? ' is-active' : ''}`}
                aria-pressed={isRegisterView}
                onClick={switchToRegister}
              >
                {authPageCopy.registerTab}
              </button>
            </div>
          ) : null}

          {isRegisterView ? (
            <RegisterForm
              service={service}
              onRegistered={handleRegistered}
              onSwitchToLogin={switchToLogin}
              onSceneZoneChange={handleSceneZoneChange}
            />
          ) : (
            <LoginForm
              service={service}
              returnTo={returnTo}
              canRegister={registerEnabled}
              initialUsername={prefilledLoginUsername}
              onAuthenticated={handleAuthenticated}
              onSwitchToRegister={switchToRegister}
              onSceneZoneChange={handleSceneZoneChange}
            />
          )}
        </section>
      </div>
    </main>
  );
}
