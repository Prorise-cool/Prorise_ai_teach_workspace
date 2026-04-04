/**
 * 文件说明：集中维护 Story 1.5 用户配置引导页的多语言文案。
 * 包含个人简介页、偏好收集页、导览页及相关校验、反馈文本。
 */

export const zhCnProfileOnboardingResources = {
  profileSetup: {
    intro: {
      title: '个人信息简介',
      subtitle: '简单介绍一下你自己，让我们更好地认识你。',
      skip: '跳过',
      avatarLabel: '点击上传头像',
      avatarHint: '上传头像后，后续 AI 老师会更快记住你。',
      avatarPlaceholder: 'Avatar',
      bioLabel: '个人简介',
      bioPlaceholder: '例如：我是一名大二学生，最近在准备英语六级考试...',
      bioHelper: '大模型会分析你的用户简介，为你个性化推荐内容。',
      countLabel: '{{count}} / {{max}}',
      next: '下一步',
      themeToggle: '切换亮暗色',
      backHome: '返回首页'
    },
    preferences: {
      introBack: '返回上一页',
      titleStep1: '你的日常性格更偏向于哪一类？',
      subtitleStep1: '这有助于大模型为你匹配更适合的学习节奏与交流方式。',
      titleStep2: '你希望匹配什么样的专属 AI 导师？',
      subtitleStep2: '选择你喜欢的性格标签，可多选。',
      next: '下一步',
      continue: '继续',
      skip: '跳过'
    },
    tour: {
      back: '返回上一步',
      continue: '继续',
      finish: '进入小麦',
      skip: '跳过导览',
      slides: [
        {
          title: '学习计划生成',
          description:
            '一键生成你的专属学习大纲，合理规划学习路径，轻松攻克每一项目标。'
        },
        {
          title: '沉浸式课堂输入',
          description:
            '与 AI 老师在虚拟课堂中实时语音文字互动，打破传统枯燥的听课体验。'
        },
        {
          title: '一键视频生成',
          description:
            '将学到的知识或笔记瞬间转化为生动有趣的短视频，分享从未如此简单。'
        }
      ],
      placeholderLabel: '此处放置 GIF {{index}}：{{title}}'
    },
    personality: {
      action_oriented: {
        label: '目标明确，专注结果的行动派'
      },
      explorer: {
        label: '对世界充满好奇的探索者'
      },
      methodological: {
        label: '踏实严谨，喜欢按部就班'
      },
      social: {
        label: '乐于交流，思维发散的社交派'
      },
      creative: {
        label: '天马行空，不拘一格的创意家'
      }
    },
    teacherTags: {
      humorous: '幽默风趣',
      logical: '严密逻辑',
      imaginative: '脑洞大开',
      strict: '严格督学',
      patient: '循循善诱',
      friendly: '朋友般陪伴',
      direct: '直击核心',
      knowledgeable: '旁征博引',
      encouraging: '温和鼓励',
      interactive: '互动狂魔',
      calm: '冷静客观',
      passionate: '充满激情'
    },
    feedback: {
      saveFailedTitle: '用户配置保存失败',
      saveFailedMessage: '当前已回退到本地保存，你稍后可以继续完善。',
      missingSession: '当前登录态不存在，请重新登录后再继续。',
      avatarReadFailed: '头像读取失败，请换一张图片再试。'
    },
    validation: {
      bioTooLong: '个人简介不能超过 {{max}} 个字符'
    }
  }
} as const;

export const enUsProfileOnboardingResources = {
  profileSetup: {
    intro: {
      title: 'Tell XiaoMai about yourself',
      subtitle: 'A quick introduction helps us tailor your learning experience.',
      skip: 'Skip',
      avatarLabel: 'Upload avatar',
      avatarHint: 'An avatar helps your AI teachers recognize you faster.',
      avatarPlaceholder: 'Avatar',
      bioLabel: 'Short bio',
      bioPlaceholder:
        'For example: I am a sophomore preparing for the CET-6 exam...',
      bioHelper:
        'Your profile description will be analyzed to personalize the experience.',
      countLabel: '{{count}} / {{max}}',
      next: 'Next',
      themeToggle: 'Toggle light and dark mode',
      backHome: 'Back home'
    },
    preferences: {
      introBack: 'Go back',
      titleStep1: 'Which personality feels closer to your everyday self?',
      subtitleStep1:
        'This helps the model align with your learning pace and communication style.',
      titleStep2: 'What kind of AI tutor would you like to be matched with?',
      subtitleStep2: 'Choose as many traits as you like.',
      next: 'Next',
      continue: 'Continue',
      skip: 'Skip'
    },
    tour: {
      back: 'Previous',
      continue: 'Continue',
      finish: 'Enter XiaoMai',
      skip: 'Skip tour',
      slides: [
        {
          title: 'Learning plan generation',
          description:
            'Generate a tailored study outline in one step and plan a clearer learning path.'
        },
        {
          title: 'Immersive classroom input',
          description:
            'Interact with AI teachers in a virtual classroom through text and voice.'
        },
        {
          title: 'One-click video generation',
          description:
            'Turn your notes and knowledge into vivid learning videos that are easy to share.'
        }
      ],
      placeholderLabel: 'Place GIF {{index}} here: {{title}}'
    },
    personality: {
      action_oriented: {
        label: 'Action-oriented and focused on outcomes'
      },
      explorer: {
        label: 'A curious explorer who loves discovering new things'
      },
      methodological: {
        label: 'Methodical and steady, with a step-by-step mindset'
      },
      social: {
        label: 'A social communicator with divergent thinking'
      },
      creative: {
        label: 'Creative, unconventional, and full of imagination'
      }
    },
    teacherTags: {
      humorous: 'Humorous',
      logical: 'Logical',
      imaginative: 'Imaginative',
      strict: 'Strict',
      patient: 'Patient',
      friendly: 'Friendly',
      direct: 'Direct',
      knowledgeable: 'Knowledgeable',
      encouraging: 'Encouraging',
      interactive: 'Highly interactive',
      calm: 'Calm and objective',
      passionate: 'Passionate'
    },
    feedback: {
      saveFailedTitle: 'Failed to save profile',
      saveFailedMessage:
        'The flow has fallen back to local storage. You can keep editing and sync later.',
      missingSession: 'No active session was found. Please sign in again.',
      avatarReadFailed: 'The avatar could not be read. Please try another image.'
    },
    validation: {
      bioTooLong: 'Your bio must be {{max}} characters or fewer'
    }
  }
} as const;
