/**
 * 文件说明：student-web 默认中文资源。
 * 当前先承接认证页与首页占位页文案，后续页面继续按相同结构扩展。
 */
import { zhCnEntryPageResources } from '@/app/i18n/resources/entry-page-content';
import { zhCnLearningCenterResources } from '@/app/i18n/resources/learning-center-content';
import { zhCnProfileOnboardingResources } from '@/app/i18n/resources/profile-onboarding-content';
import { zhCnUserSettingsResources } from '@/app/i18n/resources/user-settings-content';
import { zhCnVideoResources } from '@/app/i18n/resources/video-content';

export const zhCnResources = {
  auth: {
    page: {
      brand: '小麦 XiaoMai',
      heroTitleLine1: '让学习更轻松，',
      heroTitleLine2: '也让小麦课堂更沉浸。',
      loginTitle: '欢迎回来',
      loginSubtitle: '使用账号密码登录，继续你刚才的学习流程。',
      registerTitle: '创建账号',
      registerSubtitle: '创建账号后返回登录，继续进入小麦。',
      backHome: '返回首页',
      cancelReturnTo: '取消回跳，返回首页',
      pendingReturnTo: '登录后将返回',
      loginTab: '登录',
      registerTab: '注册',
      themeToggle: '切换亮暗色',
      rememberSession: '自动登录',
      agreement: '我已阅读并同意《用户协议》和《隐私政策》',
      loginSubmit: '登录',
      loginSubmitting: '登录中...',
      socialSubmitting: '跳转中...',
      registerSubmit: '注册',
      registerSubmitting: '注册中...',
      divider: '或使用以下方式继续',
      socialHint: '当前支持 GitHub / QQ 登录，微信暂未开放',
      forgotPassword: '忘记密码',
      registerComingSoon: '注册功能暂未开放',
      switchToRegisterPrefix: '还不是成员？',
      switchToRegisterAction: '去注册',
      switchToLoginPrefix: '已有账号？',
      switchToLoginAction: '返回登录',
      registerSuccess: '注册成功，请使用新账号登录',
      captchaRefresh: '刷新验证码',
      captchaUnavailable: '暂无验证码',
      captchaLoading: '验证码加载中...',
      logoutAction: '退出登录',
      logoutSubmitting: '退出中...',
      retrySessionCheck: '重新校验登录态',
      forbiddenBadge: '权限不足',
      forbiddenContextLabel: '当前拒绝访问的目标：',
      forbiddenCurrentUser: '当前账号：',
      backToPrevious: '返回上一页',
      switchAccount: '退出并切换账号'
    },
    field: {
      common: {
        codeLabel: '验证码',
        codePlaceholder: '输入验证码'
      },
      login: {
        usernameLabel: '账号',
        usernamePlaceholder: '输入账号',
        passwordLabel: '密码',
        passwordPlaceholder: '输入密码'
      },
      register: {
        usernameLabel: '用户名',
        usernamePlaceholder: '设置用户名',
        passwordLabel: '密码',
        passwordPlaceholder: '设置密码',
        confirmPasswordLabel: '确认密码',
        confirmPasswordPlaceholder: '确认密码'
      }
    },
    social: {
      providers: {
        wechat: {
          label: '微信登录（暂未开放）',
          glyph: '微'
        },
        qq: {
          label: 'QQ 登录',
          glyph: 'Q'
        },
        github: {
          label: 'GitHub 登录',
          glyph: 'GH'
        }
      }
    },
    feedback: {
      invalidCredentials: '账号或密码不正确，请重试',
      loginFailed: '登录失败，请稍后重试',
      socialUnavailable: '第三方登录入口暂不可用，请稍后重试',
      registerFailed: '注册失败，请稍后重试',
      bootstrapFailed: '认证页初始化失败，请稍后刷新重试',
      alreadySignedInTitle: '你已登录',
      alreadySignedInMessage: '正在返回首页，避免你重复进入登录页。',
      loginSuccessTitle: '登录成功',
      loginSuccessMessage: '正在进入系统，请稍候。',
      registerSuccessTitle: '注册成功',
      registerSuccessMessage: '已切回登录，并帮你回填刚注册的账号。',
      registerStateFallbackTitle: '注册入口暂不可用',
      registerStateFallbackMessage: '目前先保留登录入口，你稍后可以刷新重试。',
      authRequiredTitle: '请先登录',
      authRequiredMessage: '当前页面需要登录后才能进入，正在带你回到登录页。',
      sessionExpiredTitle: '登录态已失效',
      sessionExpiredMessage: '系统已清理本地会话，正在带你重新登录。',
      permissionDeniedTitle: '当前账号无权限访问',
      permissionDeniedMessage: '你已登录，但当前账号不具备访问该资源的权限。',
      sessionCheckingTitle: '正在校验登录态',
      sessionCheckingMessage: '正在向后端确认当前会话，请稍候。',
      sessionCheckFailedTitle: '登录态校验失败',
      sessionCheckFailedMessage: '暂时无法确认当前会话，请重试或重新登录。',
      logoutSuccessTitle: '已退出登录',
      logoutSuccessMessage: '当前会话已清理，你可以重新登录。',
      socialProcessing: '正在完成第三方登录，请稍后...',
      socialMissingParams: '缺少必要的第三方登录参数，请返回登录页重试。',
      socialSuccessRedirect: '登录成功，正在返回原页面...',
      socialFailed: '第三方登录失败，请返回登录页重试',
      socialCallbackTitle: '第三方登录处理中'
    },
    accessibility: {
      showPassword: '显示密码',
      hidePassword: '隐藏密码'
    },
    validation: {
      login: {
        usernameRequired: '请输入账号',
        passwordRequired: '请输入密码',
        codeRequired: '请输入验证码'
      },
      register: {
        usernameRequired: '请输入用户名',
        usernameTooShort: '用户名至少需要 2 位',
        usernameTooLong: '用户名长度不能超过 30 个字符',
        passwordRequired: '请输入密码',
        passwordTooShort: '密码至少需要 5 位',
        passwordTooLong: '密码长度不能超过 30 个字符',
        confirmPasswordRequired: '请再次输入密码',
        agreeToTerms: '请先同意用户协议与隐私政策',
        passwordMismatch: '两次输入的密码不一致',
        codeRequired: '请输入验证码'
      }
    }
  },
  home: {
    sessionBadge: '认证一致性',
    title: '登录态与受保护访问已经接到真实校验链路',
    description:
      '当前页面用于验证前端、FastAPI 与 Xiao-Mai 后端对同一会话的判断是否一致，并提供统一的登出与权限不足体验入口。',
    currentSessionTitle: '当前会话',
    currentUserLabel: '显示昵称',
    currentAccountLabel: '登录账号',
    currentRolesLabel: '角色列表',
    currentPermissionsLabel: '权限列表',
    actionsTitle: '一致性操作',
    actionsDescription:
      '你可以在这里验证 FastAPI 受保护探针、体验权限不足反馈，并随时从当前账号退出。',
    sessionProbeTitle: 'FastAPI 受保护探针结果',
    sessionProbeHint:
      '点击“验证受保护访问”后，会向 FastAPI 发送带 Token 的真实请求，并展示 Redis 在线态与权限上下文。',
    sessionProbeAction: '验证受保护访问',
    sessionProbeLoading: '校验中...',
    permissionProbeAction: '验证权限不足反馈',
    sessionProbeSuccessTitle: '受保护访问校验成功',
    sessionProbeSuccessMessage: '前端、FastAPI 与 Xiao-Mai 后端对当前会话判断一致。',
    sessionProbeUserIdLabel: '用户 ID',
    sessionProbeTtlLabel: '在线态 TTL（秒）',
    sessionProbeRequestIdLabel: '请求追踪 ID',
    sessionProbePermissionsLabel: '后端权限快照',
    sessionProbeErrorFallback: '受保护访问校验失败，请稍后重试。'
  },
  ...zhCnProfileOnboardingResources,
  ...zhCnEntryPageResources,
  ...zhCnVideoResources,
  ...zhCnLearningCenterResources,
  ...zhCnUserSettingsResources
} as const;
