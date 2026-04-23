/**
 * 文件说明：student-web 英文资源样例。
 * 当前只覆盖已接入 i18n 的最小页面范围，用于验证资源扩展能力。
 */
import { enUsEntryPageResources } from '@/app/i18n/resources/entry-page-content';
import { enUsLearningCenterResources } from '@/app/i18n/resources/learning-center-content';
import { enUsProfileOnboardingResources } from '@/app/i18n/resources/profile-onboarding-content';
import { enUsUserSettingsResources } from '@/app/i18n/resources/user-settings-content';
import { enUsVideoResources } from '@/app/i18n/resources/video-content';
import { enUsOpenMAICResources } from '@/app/i18n/resources/openmaic-content';
import { enUsClassroomResources } from '@/app/i18n/resources/classroom-content';

export const enUsResources = {
  auth: {
    page: {
      brand: 'XiaoMai',
      heroTitleLine1: 'Make your learning easier and',
      heroTitleLine2: "immersive with XiaoMai's App",
      loginTitle: 'Welcome back!',
      loginSubtitle:
        'Sign in with your account and continue your learning flow.',
      registerTitle: 'Create account',
      registerSubtitle:
        'Create your account, then return to sign in and enter XiaoMai.',
      backHome: 'Back home',
      cancelReturnTo: 'Cancel redirect and go home',
      pendingReturnTo: 'You will return to',
      loginTab: 'Sign in',
      registerTab: 'Register',
      themeToggle: 'Toggle light and dark mode',
      rememberSession: 'Keep me signed in',
      agreement: 'I agree to the Terms of Service and Privacy Policy',
      loginSubmit: 'Sign in',
      loginSubmitting: 'Signing in...',
      socialSubmitting: 'Redirecting...',
      registerSubmit: 'Create account',
      registerSubmitting: 'Creating account...',
      divider: 'or continue with',
      socialHint: 'GitHub / QQ are available right now. WeChat is not open yet.',
      forgotPassword: 'Forgot password',
      registerComingSoon: 'Registration is not available right now',
      switchToRegisterPrefix: 'Not a member yet?',
      switchToRegisterAction: 'Create account',
      switchToLoginPrefix: 'Already have an account?',
      switchToLoginAction: 'Back to sign in',
      registerSuccess: 'Registration succeeded. Please sign in with your new account.',
      captchaRefresh: 'Refresh captcha',
      captchaUnavailable: 'Captcha unavailable',
      captchaLoading: 'Loading captcha...',
      logoutAction: 'Sign out',
      logoutSubmitting: 'Signing out...',
      retrySessionCheck: 'Retry session check',
      forbiddenBadge: 'Permission denied',
      forbiddenContextLabel: 'Blocked target:',
      forbiddenCurrentUser: 'Current account:',
      backToPrevious: 'Go back',
      switchAccount: 'Sign out and switch account'
    },
    field: {
      common: {
        codeLabel: 'Captcha',
        codePlaceholder: 'Enter captcha'
      },
      login: {
        usernameLabel: 'Account',
        usernamePlaceholder: 'Enter your account',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Enter your password'
      },
      register: {
        usernameLabel: 'Username',
        usernamePlaceholder: 'Choose a username',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Create a password',
        confirmPasswordLabel: 'Confirm password',
        confirmPasswordPlaceholder: 'Confirm your password'
      }
    },
    social: {
      providers: {
        wechat: {
          label: 'WeChat sign-in (coming later)',
          glyph: '微'
        },
        qq: {
          label: 'QQ sign-in',
          glyph: 'Q'
        },
        github: {
          label: 'GitHub sign-in',
          glyph: 'GH'
        }
      }
    },
    feedback: {
      invalidCredentials: 'Incorrect account or password. Please try again.',
      loginFailed: 'Sign-in failed. Please try again later.',
      socialUnavailable: 'Social sign-in is temporarily unavailable. Please try again later.',
      registerFailed: 'Registration failed. Please try again later.',
      bootstrapFailed: 'The auth page failed to initialize. Please refresh and try again.',
      alreadySignedInTitle: 'You are already signed in',
      alreadySignedInMessage: 'Returning you home so you do not land on the sign-in page again.',
      loginSuccessTitle: 'Sign-in successful',
      loginSuccessMessage: 'Entering the app now. Please wait a moment.',
      registerSuccessTitle: 'Registration successful',
      registerSuccessMessage: 'Switched back to sign-in and prefilled your new account.',
      registerStateFallbackTitle: 'Registration is temporarily unavailable',
      registerStateFallbackMessage: 'The page will stay in sign-in mode for now. Please refresh and try again later.',
      authRequiredTitle: 'Sign in required',
      authRequiredMessage: 'This page requires a signed-in account. Taking you to the sign-in page now.',
      sessionExpiredTitle: 'Session expired',
      sessionExpiredMessage: 'The local session has been cleared. Redirecting you to sign in again.',
      permissionDeniedTitle: 'This account cannot access the resource',
      permissionDeniedMessage: 'You are signed in, but the current account does not have permission to access this resource.',
      sessionCheckingTitle: 'Checking session',
      sessionCheckingMessage: 'Confirming the current session with the backend. Please wait.',
      sessionCheckFailedTitle: 'Session verification failed',
      sessionCheckFailedMessage: 'The current session could not be verified. Retry or sign in again.',
      logoutSuccessTitle: 'Signed out',
      logoutSuccessMessage: 'The current session has been cleared. You can sign in again.',
      socialProcessing: 'Finishing social sign-in. Please wait...',
      socialMissingParams:
        'Required social sign-in parameters are missing. Please return to the sign-in page and try again.',
      socialSuccessRedirect: 'Sign-in succeeded. Returning to your page...',
      socialFailed: 'Social sign-in failed. Please return to the sign-in page and try again.',
      socialCallbackTitle: 'Processing social sign-in'
    },
    accessibility: {
      showPassword: 'Show password',
      hidePassword: 'Hide password'
    },
    validation: {
      login: {
        usernameRequired: 'Please enter your account',
        passwordRequired: 'Please enter your password',
        codeRequired: 'Please enter the captcha'
      },
      register: {
        usernameRequired: 'Please enter a username',
        usernameTooShort: 'Username must be at least 2 characters',
        usernameTooLong: 'Username must be 30 characters or fewer',
        passwordRequired: 'Please enter your password',
        passwordTooShort: 'Password must be at least 5 characters',
        passwordTooLong: 'Password must be 30 characters or fewer',
        confirmPasswordRequired: 'Please confirm your password',
        agreeToTerms: 'Please agree to the Terms of Service and Privacy Policy first',
        passwordMismatch: 'The two passwords do not match',
        codeRequired: 'Please enter the captcha'
      }
    }
  },
  home: {
    sessionBadge: 'Auth consistency',
    title: 'Session and protected-access checks now use the real validation chain',
    description:
      'This page verifies whether the frontend, FastAPI, and Xiao-Mai backend agree on the same session, while also exposing unified sign-out and permission-denied flows.',
    currentSessionTitle: 'Current session',
    currentUserLabel: 'Display name',
    currentAccountLabel: 'Account',
    currentRolesLabel: 'Roles',
    currentPermissionsLabel: 'Permissions',
    actionsTitle: 'Consistency actions',
    actionsDescription:
      'Use these actions to verify protected FastAPI access, experience the permission-denied flow, and sign out from the current account.',
    sessionProbeTitle: 'FastAPI protected probe result',
    sessionProbeHint:
      'Select "Verify protected access" to send a real token-bearing request to FastAPI and inspect the Redis online session plus permission context.',
    sessionProbeAction: 'Verify protected access',
    sessionProbeLoading: 'Checking...',
    permissionProbeAction: 'Verify permission-denied flow',
    sessionProbeSuccessTitle: 'Protected access verified',
    sessionProbeSuccessMessage: 'The frontend, FastAPI, and Xiao-Mai backend agree on the current session.',
    sessionProbeUserIdLabel: 'User ID',
    sessionProbeTtlLabel: 'Online TTL (seconds)',
    sessionProbeRequestIdLabel: 'Request trace ID',
    sessionProbePermissionsLabel: 'Backend permission snapshot',
    sessionProbeErrorFallback: 'The protected access check failed. Please try again later.'
  },
  ...enUsProfileOnboardingResources,
  ...enUsEntryPageResources,
  ...enUsVideoResources,
  ...enUsLearningCenterResources,
  ...enUsUserSettingsResources,
  ...enUsOpenMAICResources,
  ...enUsClassroomResources
} as const;
