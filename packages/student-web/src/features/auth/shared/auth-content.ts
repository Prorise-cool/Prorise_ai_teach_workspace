/**
 * 文件说明：认证页文案与默认值。
 * 静态文案通过 i18n 资源读取，表单默认值与本地存储 key 保持独立常量。
 */
import type { AuthSocialSource } from '@/types/auth';
import { useAppTranslation } from '@/app/i18n/use-app-translation';

export const AUTH_THEME_STORAGE_KEY = 'xiaomai-theme';

export function useAuthPageCopy() {
  const { t } = useAppTranslation();

  return {
    brand: t('auth.page.brand'),
    heroTitle: [
      t('auth.page.heroTitleLine1'),
      t('auth.page.heroTitleLine2')
    ],
    loginTitle: t('auth.page.loginTitle'),
    loginSubtitle: t('auth.page.loginSubtitle'),
    registerTitle: t('auth.page.registerTitle'),
    registerSubtitle: t('auth.page.registerSubtitle'),
    backHome: t('auth.page.backHome'),
    cancelReturnTo: t('auth.page.cancelReturnTo'),
    pendingReturnTo: t('auth.page.pendingReturnTo'),
    loginTab: t('auth.page.loginTab'),
    registerTab: t('auth.page.registerTab'),
    themeToggle: t('auth.page.themeToggle'),
    rememberSession: t('auth.page.rememberSession'),
    agreement: t('auth.page.agreement'),
    loginSubmit: t('auth.page.loginSubmit'),
    loginSubmitting: t('auth.page.loginSubmitting'),
    socialSubmitting: t('auth.page.socialSubmitting'),
    registerSubmit: t('auth.page.registerSubmit'),
    registerSubmitting: t('auth.page.registerSubmitting'),
    divider: t('auth.page.divider'),
    socialHint: t('auth.page.socialHint'),
    forgotPassword: t('auth.page.forgotPassword'),
    registerComingSoon: t('auth.page.registerComingSoon'),
    switchToRegisterPrefix: t('auth.page.switchToRegisterPrefix'),
    switchToRegisterAction: t('auth.page.switchToRegisterAction'),
    switchToLoginPrefix: t('auth.page.switchToLoginPrefix'),
    switchToLoginAction: t('auth.page.switchToLoginAction'),
    registerSuccess: t('auth.page.registerSuccess'),
    captchaRefresh: t('auth.page.captchaRefresh'),
    captchaUnavailable: t('auth.page.captchaUnavailable'),
    captchaLoading: t('auth.page.captchaLoading')
  } as const;
}

export function useAuthFieldCopy() {
  const { t } = useAppTranslation();

  return {
    common: {
      codeLabel: t('auth.field.common.codeLabel'),
      codePlaceholder: t('auth.field.common.codePlaceholder')
    },
    login: {
      usernameLabel: t('auth.field.login.usernameLabel'),
      usernamePlaceholder: t('auth.field.login.usernamePlaceholder'),
      passwordLabel: t('auth.field.login.passwordLabel'),
      passwordPlaceholder: t('auth.field.login.passwordPlaceholder')
    },
    register: {
      usernameLabel: t('auth.field.register.usernameLabel'),
      usernamePlaceholder: t('auth.field.register.usernamePlaceholder'),
      passwordLabel: t('auth.field.register.passwordLabel'),
      passwordPlaceholder: t('auth.field.register.passwordPlaceholder'),
      confirmPasswordLabel: t('auth.field.register.confirmPasswordLabel'),
      confirmPasswordPlaceholder: t('auth.field.register.confirmPasswordPlaceholder')
    }
  } as const;
}

export function useAuthSocialProviders(): ReadonlyArray<{
  source: AuthSocialSource;
  label: string;
  glyph: string;
  enabled: boolean;
}> {
  const { t } = useAppTranslation();

  return [
    {
      source: 'wechat',
      label: t('auth.social.providers.wechat.label'),
      glyph: t('auth.social.providers.wechat.glyph'),
      enabled: false
    },
    {
      source: 'qq',
      label: t('auth.social.providers.qq.label'),
      glyph: t('auth.social.providers.qq.glyph'),
      enabled: true
    },
    {
      source: 'github',
      label: t('auth.social.providers.github.label'),
      glyph: t('auth.social.providers.github.glyph'),
      enabled: true
    }
  ] as const;
}

export const loginFormDefaultValues = {
  username: '',
  password: '',
  code: '',
  rememberSession: true
} as const;

export const registerFormDefaultValues = {
  username: '',
  password: '',
  confirmPassword: '',
  code: '',
  agreeToTerms: false
} as const;
