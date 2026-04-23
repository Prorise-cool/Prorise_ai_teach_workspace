/**
 * 文件说明：入口页/落地页顶栏导航与任务中心相关 i18n 资源。
 * 由 entry-page-content.ts 聚合后再对外导出，外部仍通过 entry-page-content 导入。
 */

export const zhCnEntryNavResources = {
  entryNav: {
    brand: '小麦 XiaoMai',
    homeBrand: 'XiaoMai',
    userMenu: {
      trigger: '用户菜单',
      learningCenter: '学习中心',
      profile: '个人资料',
      settings: '设置',
      logout: '退出登录',
      loggingOut: '退出中…'
    },
    links: [
      {
        label: '关于我们',
        href: '/landing#testimonials'
      },
      {
        label: '产品亮点',
        href: '/landing#features'
      },
      {
        label: '销售计划',
        href: '/landing#pricing'
      },
      {
        label: '常见问题',
        href: '/landing#faq'
      }
    ],
    landingLinks: [
      {
        label: '口碑',
        href: '#testimonials'
      },
      {
        label: '使用流程',
        href: '#how-it-works'
      },
      {
        label: '联系',
        href: '#contact'
      },
      {
        label: '常见问题',
        href: '#faq'
      }
    ],
    featureLabel: '产品亮点',
    featurePreview: [
      {
        title: '双入口即达',
        description: '“我想学 XXX” 与 “帮我讲这道题” 同屏清晰呈现。'
      },
      {
        title: '4 种 AI 老师',
        description: '严肃、幽默、耐心、高效，三秒内感知差异。'
      },
      {
        title: '5 分钟生成',
        description: '从知识点理解到动画合成，全流程分钟级完成。'
      }
    ],
    workspaceRoutes: [
      {
        label: '主题课堂',
        href: '/classroom/input',
        icon: 'layout-template'
      },
      {
        label: '单题讲解',
        href: '/video/input',
        icon: 'video'
      },
      {
        label: '学习中心',
        href: '/learning',
        icon: 'book-open'
      }
    ],
    repoLabel: '查看参考仓库',
    openWorkspace: '进入工作区',
    signIn: '登录',
    signOut: '退出',
    backHome: '返回首页',
    openLanding: '查看落地页',
    themeToggle: '切换亮暗色',
    localeToggle: 'EN',
    taskCenter: {
      openLabel: '查看进行中的任务',
      title: '进行中的任务',
      empty: '暂无进行中的任务',
      count: '{{count}} 项',
      viewAll: '查看全部任务',
      viewAllCount: '查看全部 {{count}} 个任务',
      cancel: '取消',
      delete: '删除',
      enter: '进入工作区',
      viewResult: '查看结果',
      deleteSuccess: '任务已删除',
      deleteFailed: '删除任务失败',
      statusPending: '排队中',
      statusProcessing: '处理中',
      statusCompleted: '已完成',
      statusFailed: '失败',
      statusCancelled: '已取消',
      stage: {
        understanding: '理解中',
        solve: '解题中',
        storyboard: '分镜中',
        manim_gen: '脚本生成中',
        manim_fix: '脚本修复中',
        render: '渲染中',
        render_verify: '验证中',
        tts: '旁白生成中',
        compose: '合成中',
        upload: '上传中'
      },
      fallbackTitle: '视频讲解任务',
      fallbackMessage: '任务处理中',
      cancelTaskAria: '取消任务 {{title}}',
      deleteTaskAria: '删除任务 {{title}}',
      enterTaskAria: '进入任务 {{title}}'
    }
  },
} as const;

export const enUsEntryNavResources = {
  entryNav: {
    brand: 'XiaoMai',
    homeBrand: 'XiaoMai',
    userMenu: {
      trigger: 'User menu',
      learningCenter: 'Learning center',
      profile: 'Profile',
      settings: 'Settings',
      logout: 'Log out',
      loggingOut: 'Logging out…'
    },
    links: [
      {
        label: 'About',
        href: '/landing#testimonials'
      },
      {
        label: 'Highlights',
        href: '/landing#features'
      },
      {
        label: 'Pricing',
        href: '/landing#pricing'
      },
      {
        label: 'FAQ',
        href: '/landing#faq'
      }
    ],
    landingLinks: [
      {
        label: 'Testimonials',
        href: '#testimonials'
      },
      {
        label: 'How It Works',
        href: '#how-it-works'
      },
      {
        label: 'Contact',
        href: '#contact'
      },
      {
        label: 'FAQ',
        href: '#faq'
      }
    ],
    featureLabel: 'Highlights',
    featurePreview: [
      {
        title: 'Dual entry flows',
        description:
          '“I want to learn XXX” and “Explain this problem” are visible on the same surface.'
      },
      {
        title: 'Four AI teachers',
        description:
          'Serious, humorous, patient, and efficient. Users feel the difference in seconds.'
      },
      {
        title: 'Five-minute generation',
        description:
          'From topic understanding to animation rendering, the full pipeline completes in minutes.'
      }
    ],
    workspaceRoutes: [
      {
        label: 'Topic Classroom',
        href: '/classroom/input',
        icon: 'layout-template'
      },
      {
        label: 'Video Explainer',
        href: '/video/input',
        icon: 'video'
      },
      {
        label: 'Learning Center',
        href: '/learning',
        icon: 'book-open'
      }
    ],
    repoLabel: 'View reference repository',
    openWorkspace: 'Open Workspace',
    signIn: 'Sign in',
    signOut: 'Sign out',
    backHome: 'Back home',
    openLanding: 'Open landing page',
    themeToggle: 'Toggle light and dark mode',
    localeToggle: '中',
    taskCenter: {
      openLabel: 'View active tasks',
      title: 'Active tasks',
      empty: 'No active tasks',
      count: '{{count}} items',
      viewAll: 'View all tasks',
      viewAllCount: 'View all {{count}} tasks',
      cancel: 'Cancel',
      delete: 'Delete',
      enter: 'Open workspace',
      viewResult: 'View result',
      deleteSuccess: 'Task deleted',
      deleteFailed: 'Failed to delete task',
      statusProcessing: 'Processing',
      statusCompleted: 'Completed',
      statusFailed: 'Failed',
      statusCancelled: 'Cancelled',
      stage: {
        understanding: 'Understanding',
        solve: 'Solving',
        storyboard: 'Storyboarding',
        manim_gen: 'Generating script',
        manim_fix: 'Fixing script',
        render: 'Rendering',
        render_verify: 'Verifying',
        tts: 'Generating voiceover',
        compose: 'Compositing',
        upload: 'Uploading'
      },
      fallbackTitle: 'Video explainer task',
      fallbackMessage: 'Task is in progress',
      cancelTaskAria: 'Cancel task {{title}}',
      deleteTaskAria: 'Delete task {{title}}',
      enterTaskAria: 'Enter task {{title}}'
    }
  },
} as const;
