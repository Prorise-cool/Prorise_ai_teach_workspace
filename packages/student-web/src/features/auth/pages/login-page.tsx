/**
 * 文件说明：认证页页面容器。
 * 负责装配认证服务、会话写入和回跳逻辑，不直接承载页面细碎的 UI 状态。
 */
import { ArrowLeft, MoonStar, SunMedium } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthScene } from '@/features/auth/components/auth-scene';
import { LoginForm } from '@/features/auth/components/login-form';
import { RegisterForm } from '@/features/auth/components/register-form';
import { useAuthPageUiState } from '@/features/auth/hooks/use-auth-page-ui-state';
import { useRegisterEnabledQuery } from '@/features/auth/hooks/use-register-enabled-query';
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect';
import { useAuthPageCopy } from '@/features/auth/shared/auth-content';
import { resolvePostAuthDestination } from '@/features/profile/api/profile-api';
import { authService, type AuthService } from '@/services/auth';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import type { AuthSession } from '@/types/auth';

import '@/features/auth/styles/login-page.scss';

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
	const navigate = useNavigate();
	const [activeView, setActiveView] = useState<AuthView>('login');
	const [registerSucceeded, setRegisterSucceeded] = useState(false);
	const [prefilledLoginUsername, setPrefilledLoginUsername] = useState('');
	const [authRedirectReason, setAuthRedirectReason] = useState<
		'existing-session' | 'login-success'
	>('existing-session');
	const redirectFeedbackShownRef = useRef<'existing-session' | 'login-success' | null>(
		null
	);
	const registerFallbackNotifiedRef = useRef(false);
	const registerEnabledQuery = useRegisterEnabledQuery(service);

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
		returnTo
	} = useAuthRedirect();
	const registerEnabled = registerEnabledQuery.data ?? false;
	const displayedActiveView: AuthView =
		registerEnabled && activeView === 'register' ? 'register' : 'login';

	/**
	 * 在认证成功后写入会话，并执行统一回跳。
	 *
	 * @param session - 已建立的认证会话。
	 * @param rememberSession - 是否将会话写入持久化存储。
	 */
	function handleAuthenticated(
		session: AuthSession,
		rememberSession: boolean
	) {
		setRegisterSucceeded(false);
		setPrefilledLoginUsername('');
		setAuthRedirectReason('login-success');
		setSession(session, rememberSession);
	}

	useEffect(() => {
		if (session?.accessToken) {
			return;
		}

		redirectFeedbackShownRef.current = null;
	}, [session?.accessToken]);

	useLayoutEffect(() => {
		let isActive = true;

		if (!session?.accessToken) {
			return undefined;
		}

		const activeSession = session;

		async function redirectAfterSessionReady() {
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

			const nextPath = await resolvePostAuthDestination({
				userId: activeSession.user.id,
				accessToken: activeSession.accessToken,
				returnTo
			});

			if (!isActive) {
				return;
			}

			void navigate(nextPath, {
				replace: true,
				state: null
			});
		}

		void redirectAfterSessionReady();

		return () => {
			isActive = false;
		};
	}, [
		authRedirectReason,
		navigate,
		notify,
		returnTo,
		session,
		t
	]);

	useEffect(() => {
		if (!registerEnabledQuery.isError || registerFallbackNotifiedRef.current) {
			return;
		}

		registerFallbackNotifiedRef.current = true;
		notify({
			tone: 'warning',
			title: t('auth.feedback.registerStateFallbackTitle'),
			description: t('auth.feedback.registerStateFallbackMessage')
		});
	}, [notify, registerEnabledQuery.isError, t]);

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

	const isRegisterView = displayedActiveView === 'register';
	const viewTitle = isRegisterView
		? authPageCopy.registerTitle
		: authPageCopy.loginTitle;

	if (session?.accessToken) {
		const isFreshLogin = authRedirectReason === 'login-success';

		return (
			<main className="xm-auth-page xm-auth-callback-page">
				<section className="xm-auth-callback-card" aria-live="polite">
					<h1 className="xm-auth-callback-title">
						{isFreshLogin
							? t('auth.feedback.loginSuccessTitle')
							: t('auth.feedback.alreadySignedInTitle')}
					</h1>
					<p className="xm-auth-callback-message">
						{isFreshLogin
							? t('auth.feedback.loginSuccessMessage')
							: t('auth.feedback.alreadySignedInMessage')}
					</p>
				</section>
			</main>
		);
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
						<Button
							type="button"
							variant="surface"
							size="icon"
							className="xm-auth-icon-btn"
							aria-label={authPageCopy.themeToggle}
							onClick={toggleThemeMode}
						>
							{themeMode === 'dark' ? (
								<SunMedium size={18} />
							) : (
								<MoonStar size={18} />
							)}
						</Button>
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
						<Tabs
							value={displayedActiveView}
							onValueChange={nextValue => {
								if (nextValue === 'register') {
									switchToRegister();
									return;
								}

								switchToLogin();
							}}
						>
							<TabsList
								className="xm-auth-tabs"
								aria-label={`${authPageCopy.loginTab}/${authPageCopy.registerTab}`}
							>
								<TabsTrigger className="xm-auth-tab" value="login">
									{authPageCopy.loginTab}
								</TabsTrigger>
								<TabsTrigger className="xm-auth-tab" value="register">
									{authPageCopy.registerTab}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="login">
								<LoginForm
									service={service}
									returnTo={returnTo}
									canRegister={registerEnabled}
									initialUsername={prefilledLoginUsername}
									onAuthenticated={handleAuthenticated}
									onSwitchToRegister={switchToRegister}
									onSceneZoneChange={handleSceneZoneChange}
								/>
							</TabsContent>

							<TabsContent value="register">
								<RegisterForm
									service={service}
									onRegistered={handleRegistered}
									onSwitchToLogin={switchToLogin}
									onSceneZoneChange={handleSceneZoneChange}
								/>
							</TabsContent>
						</Tabs>
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
