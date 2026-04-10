/**
 * Auth feature public API.
 */
// Components
export { AuthScene } from './components/auth-scene';
export type { AuthInteractionZone, AuthScenePhase } from './components/auth-scene';
export { AuthRuntimeBridge } from './components/auth-runtime-bridge';
export { RequireAuthRoute } from './components/require-auth-route';
export { LoginForm } from './components/login-form';
export { RegisterForm } from './components/register-form';

// Hooks
export { useAuthSessionActions } from './hooks/use-auth-session-actions';
export { useAuthPageUiState } from './hooks/use-auth-page-ui-state';
export { useAuthCaptcha } from './hooks/use-auth-captcha';
export { useAuthRedirect } from './hooks/use-auth-redirect';
export { useRegisterEnabledQuery } from './hooks/use-register-enabled-query';

// Pages
export { LoginPage } from './pages/login-page';
export { SocialCallbackPage } from './pages/social-callback-page';
export { ForbiddenPage } from './pages/forbidden-page';

// Shared
export { useAuthPageCopy, useAuthFieldCopy, useAuthSocialProviders, AUTH_THEME_STORAGE_KEY } from './shared/auth-content';
export { getAuthFeedbackMessage } from './shared/auth-feedback';

// Schemas
export type { LoginFormValues, RegisterFormValues } from './schemas/auth-form-schemas';
export { createLoginFormSchema, createRegisterFormSchema } from './schemas/auth-form-schemas';
