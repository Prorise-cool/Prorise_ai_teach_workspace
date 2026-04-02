/**
 * 文件说明：student-web 英文资源样例。
 * 当前只覆盖已接入 i18n 的最小页面范围，用于验证资源扩展能力。
 */
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
      captchaLoading: 'Loading captcha...'
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
    scaffoldLabel: 'Student Web Scaffold',
    title: 'XiaoMai student web scaffold is ready',
    description:
      'The project skeleton, theme tokens, and dependency baseline are now in place. Business pages, components, and API adapters will continue to be built in upcoming epics.'
  }
} as const;
