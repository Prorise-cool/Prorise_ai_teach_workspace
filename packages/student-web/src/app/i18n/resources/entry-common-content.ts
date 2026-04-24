/**
 * 文件说明：入口页通用文案、首页 Hero、入口路由占位与视频/课堂输入页文案 i18n 资源。
 * 由 entry-page-content.ts 聚合后再对外导出，外部仍通过 entry-page-content 导入。
 */

export const zhCnEntryCommonResources = {
  common: {
    close: '关闭',
    openMenu: '打开菜单',
    previous: '上一页',
    next: '下一页',
    themeLight: '切到浅色',
    themeDark: '切到深色'
  },
  notFound: {
    title: '页面不存在',
    description: '找不到地址 {{path}} 对应的页面。可能已被移除，或链接有误。',
    backHome: '回到首页'
  },
  entryHome: {
    titleLine1: 'XMAI',
    titleLine2: 'VIRTUAL',
    titleLine3: 'CLASSROOM',
    eyebrowLine1: 'YOUR PERSONAL',
    eyebrowAccent: 'AI TEACHER',
    eyebrowLine3: 'AVAILABLE 24/7',
    description:
      'Discover an exclusive learning experience. Enter a topic to get a complete virtual classroom or upload a question for a 5-minute animated explanation.',
    primaryAction: 'Start Learning',
    workspaceHint: 'ENTER WORKSPACE',
    imageAlt: '小麦虚拟课堂角色形象',
    activeTask: {
      title: '当前视频任务',
      subtitle: '不用回输入页，首页也能继续查看或取消',
      note: '视频还会继续在后台生成；你可以直接继续查看，也可以在右上角任务中心管理更多任务。'
    }
  },
  entryRoutes: {
    classroom: {
      badge: '课堂工作区',
      title: '课堂输入壳层已接入真实入口链路',
      description:
        '当前页面先承接 Story 1.4 的入口落位与鉴权回跳，后续主题输入表单与任务创建流程会在课堂 Story 中继续补齐。',
      secondaryAction: '查看产品落地页'
    },
    video: {
      badge: '视频讲解入口',
      title: '单题视频讲解入口已挂入全局导航',
      description:
        '当前路由先验证导航分发、鉴权回跳与主题一致性，后续视频输入表单、图片上传和公开广场会在视频 Story 中继续实现。',
      primaryAction: '返回首页',
      secondaryAction: '查看产品落地页'
    }
  },
	  /** Story 1-6：视频输入页文案。 */
		  videoInput: {
		    badgeLabel: '视频讲解',
		    titleLine1: '输入或拍题，',
		    titleGradient: '5分钟生成动画讲解',
    placeholder:
      '粘贴题目文本，或描述具体题目要求...\n\n例如：\n「求函数 f(x) = x³ - 3x 的极值点并画出变化趋势」',
	    toolUploadImage: '上传图片',
	    toolScreenshot: '截图',
	    submitLabel: '生成视频',
	    submittingLabel: '生成中...',
	    dragOverlayLabel: '松开鼠标，上传参考图片',
	    removeImageLabel: '移除图片',
	    qualityPresetLabel: '生成质量预设',
	    qualityPresetHint: '让输入框保持干净，预设和细项参数都收在工具栏图标里。',
	    advancedSettingsLabel: '高级参数',
	    recordingLabel: '录音中',
	    qualityPresets: {
	      fast: '快速出片',
	      balanced: '均衡讲解',
	      cinematic: '高质细讲',
	    },
	    advancedDialogTitle: '高级生成参数',
	    advancedDialogDescription: '这里对应后端视频任务接口的可调参数，适合想精细控制分段、并发和布局的用户。',
	    advancedDialogReset: '恢复当前预设',
	    advancedDialogDone: '完成设置',
	    advancedFields: {
	      durationMinutes: '目标时长（分钟）',
	      sectionCount: '分段数量',
	      sectionConcurrency: '并发生成数',
	      renderQuality: '渲染质量',
	      layoutHint: '布局偏好',
	    },
	    renderQualityOptions: {
	      l: '轻量预览',
	      m: '标准清晰',
	      h: '高质精修',
	    },
		    layoutHintOptions: {
		      center_stage: '居中舞台',
		      two_column: '双栏讲解',
		    },
		    summaryUnits: {
		      duration: '分钟',
		      section: '段',
		      concurrency: '并发',
		    },
		    validation: {
		      durationRange: '时长需在 1-10 分钟之间',
		      sectionCountRange: '分段数需在 1-12 段之间',
		      sectionConcurrencyRange: '并发数需在 1-8 之间',
		      textMin: '请输入至少 {{count}} 个字符的题目描述',
		      textMax: '输入内容不能超过 {{count}} 个字符',
		      imageRequired: '请上传至少一张图片作为输入',
		      imageType: '仅支持 JPG、PNG、WebP 格式的图片',
		      imageSize: '图片大小不能超过 30MB',
		    },
		    feedback: {
		      unsupportedImageTitle: '图片格式不支持',
		      unsupportedImageDescription: '{{name}} 不是支持的图片格式，请上传 JPG、PNG 或 WebP',
		      imageTooLargeTitle: '图片过大',
		      imageTooLargeDescription: '{{name}} 超过 30MB，请压缩后再试',
		    },
		    activeTask: {
		      title: '当前任务',
		      subtitle: '返回工作区后也能继续查看或取消',
		      queueCount: '{{count}} 项',
		      progressLabel: '当前进度',
		      stageLabel: '当前阶段：{{stage}}',
		      moreTasksHint: '还有 {{count}} 个任务',
		      continueAction: '继续查看',
		      continueTaskAria: '继续查看任务 {{title}}',
		      defaultInlineNote: '任务会继续保留在右上角的进行中列表里，你可以稍后回来继续查看，或直接在这里取消。',
		      returnedInlineNote: '你刚刚离开等待页，当前任务仍在继续生成，可以随时回来继续查看。',
		      cancelledInlineNote: '刚才的任务已经取消完成；如果你还有别的任务，它们会继续保留在这里。',
		      returnedToastTitle: '已返回视频工作区',
		      returnedToastDescription: '当前任务仍在继续生成，你可以在输入页随时继续查看或取消。',
		      cancelledToastTitle: '任务已取消',
		      cancelledToastDescription: '你可以继续编辑题目后重新发起视频生成。',
		    },
		    suggestionsLabel: '试试这些题目',
	    suggestions: ['证明洛必达法则', '求解偏导数方程', '解释傅里叶变换'],
    feedTitle: '题目讲解视频浏览区',
    feedDesc: '先查看你自己的历史题目视频，再浏览其他同学生成的优质 Manim 动画讲解。',
    feedPrivateTitle: '我的题目',
    feedPrivateDesc: '仅用户自己可见',
    feedPrivateEmptyTitle: '你的私有视频会显示在这里',
    feedPrivateEmptyDesc: '完成生成后，最近的视频结果会自动出现在这里，方便你继续回看。',
    feedPublicTitle: '热门题目讲解视频',
    feedPublicDesc: '浏览其他同学生成的优质 Manim 动画讲解',
    feedLoadMore: '加载更多解题视频',
    feedLoading: '正在拉取数据...',
    feedEmptyTitle: '暂无公开视频，快来创建第一个',
    feedEmptyDesc: '公开发现区为空时，不会影响你继续输入题目并直接生成新视频。',
    feedErrorTitle: '公开视频暂时不可用',
    feedErrorDesc: '推荐区加载失败不会阻断主流程，你仍然可以直接输入题目并发起新任务。',
    feedPrivateVisibilityLabel: '私有',
    feedPublicVisibilityLabel: '公开',
    feedPublishedBadge: '已公开',
    feedPrivateViewAction: '查看结果',
    feedViewAction: '查看讲解',
    feedReuseAction: '复用题目',
    feedReuseToastTitle: '已复用题目到输入区',
    feedReuseToastDesc: '你可以继续补充细节后再生成新视频。'
  },
  /** Story 1-6：课堂输入页文案。 */
  classroomInput: {
    badgeLabel: '多智能体课堂',
    titleLine1: '输入主题，',
    titleGradient: '即刻生成完整虚拟课堂',
    placeholder:
      '你想系统地学点什么？\n\n例如：\n「结合生活案例，系统讲解一下微积分中的链式法则」',
    smartMatchHint: '智能师生匹配',
    smartMatchDesc: '根据您的配置自动适配 AI 老师',
    multiAgentHint: '支持多 Agent 讨论模式',
    toolUploadFile: '上传课件/PDF',
    toolVoiceInput: '语音输入',

    toolWebSearch: '开启联网',
    submitLabel: '生成课堂',
    suggestionsLabel: 'Try These',
    suggestions: ['二叉树原理图解', '泰勒展开式推导', '微积分链式法则'],
    feedTitle: '探索优质课堂案例',
    feedDesc: '看看大家都在用小麦学什么系统课程',
    feedLoadMore: '加载更多案例',
    feedLoading: '正在为您检索课程...',
    feedComingSoon: '公开课堂即将开放，敬请期待',
    feedEmptyTitle: '还没有公开课堂',
    feedEmptyDesc: '来成为第一个公开课堂的创造者——生成完成后在播放页点击"公开"。',
    feedErrorTitle: '公开课堂暂时不可用',
    feedErrorDesc: '网络或服务出了点问题，不影响你在上方输入题目直接生成新课堂。',
    feedViewAction: '进入课堂',
    feedPublicBadge: '公开',
    advanced: {
      triggerLabel: '高级',
      dialogTitle: '高级设置',
      dialogDescription: '调整生成的场景数量、目标时长和互动风格。',
      doneLabel: '完成',
      sceneCountLabel: '课堂页数',
      sceneCountHint: '生成恰好这么多页课件内容（1-30 页）',
      durationLabel: '目标时长',
      durationUnit: '分钟',
      interactiveLabel: '互动优先模式',
      interactiveHint: '开启后会安排更多互动练习页，减少纯讲解页',
      interactiveOn: '已开启',
      interactiveOff: '已关闭',
    }
  },
} as const;

export const enUsEntryCommonResources = {
  common: {
    close: 'Close',
    openMenu: 'Open menu',
    previous: 'Previous',
    next: 'Next',
    themeLight: 'Switch to light mode',
    themeDark: 'Switch to dark mode'
  },
  notFound: {
    title: 'Page not found',
    description: 'The address {{path}} does not match any page. It may have been removed or the link is incorrect.',
    backHome: 'Back to home'
  },
  entryHome: {
    titleLine1: 'XMAI',
    titleLine2: 'VIRTUAL',
    titleLine3: 'CLASSROOM',
    eyebrowLine1: 'YOUR PERSONAL',
    eyebrowAccent: 'AI TEACHER',
    eyebrowLine3: 'AVAILABLE 24/7',
    description:
      'Discover an exclusive learning experience. Enter a topic to get a complete virtual classroom or upload a question for a 5-minute animated explanation.',
    primaryAction: 'Start Learning',
    workspaceHint: 'ENTER WORKSPACE',
    imageAlt: 'XiaoMai virtual classroom mascot',
    activeTask: {
      title: 'Current Video Task',
      subtitle: 'You can resume or cancel it right from the home page',
      note: 'The video keeps generating in the background. Resume it here or manage the rest from the task center in the top right.'
    }
  },
  entryRoutes: {
    classroom: {
      badge: 'Classroom workspace',
      title: 'The classroom entry shell now uses the real routing chain',
      description:
        'This page currently locks down the Story 1.4 entry path and auth redirect flow. The actual topic-input form and task creation flow will arrive in later classroom stories.',
      secondaryAction: 'View the landing page'
    },
    video: {
      badge: 'Video explainer entry',
      title: 'The single-problem video route is now wired into global navigation',
      description:
        'This route currently verifies navigation distribution, auth redirect recovery, and theming consistency. The full video input form, image upload, and public gallery will land in later video stories.',
      primaryAction: 'Back home',
      secondaryAction: 'View the landing page'
    }
  },
	  /** Story 1-6: Video input page copy. */
		  videoInput: {
		    badgeLabel: 'Video Explainer',
		    titleLine1: 'Enter or snap a problem, ',
		    titleGradient: '5-minute animated explainer',
    placeholder:
      'Paste problem text or describe the question...\n\nFor example:\n"Find the extrema of f(x) = x³ - 3x and sketch the trend"',
	    toolUploadImage: 'Upload image',
	    toolScreenshot: 'Screenshot',
	    submitLabel: 'Generate Video',
	    submittingLabel: 'Generating...',
	    dragOverlayLabel: 'Release to upload reference images',
	    removeImageLabel: 'Remove image',
	    qualityPresetLabel: 'Quality Preset',
	    qualityPresetHint: 'Keep the input clean and open presets or deeper controls only from the toolbar icons.',
	    advancedSettingsLabel: 'Advanced Settings',
	    recordingLabel: 'Recording',
	    qualityPresets: {
	      fast: 'Fast Draft',
	      balanced: 'Balanced Explainer',
	      cinematic: 'High Fidelity',
	    },
	    advancedDialogTitle: 'Advanced Video Parameters',
	    advancedDialogDescription: 'These controls map directly to the backend task interface for duration, section count, concurrency, render quality, and layout.',
	    advancedDialogReset: 'Reset to Preset',
	    advancedDialogDone: 'Done',
	    advancedFields: {
	      durationMinutes: 'Target Duration (min)',
	      sectionCount: 'Section Count',
	      sectionConcurrency: 'Concurrency',
	      renderQuality: 'Render Quality',
	      layoutHint: 'Layout Preference',
	    },
	    renderQualityOptions: {
	      l: 'Light Preview',
	      m: 'Balanced',
	      h: 'High Quality',
	    },
		    layoutHintOptions: {
		      center_stage: 'Center Stage',
		      two_column: 'Two Columns',
		    },
		    summaryUnits: {
		      duration: 'min',
		      section: 'sections',
		      concurrency: 'Concurrency',
		    },
		    validation: {
		      durationRange: 'Duration must stay between 1 and 10 minutes',
		      sectionCountRange: 'Section count must stay between 1 and 12',
		      sectionConcurrencyRange: 'Concurrency must stay between 1 and 8',
		      textMin: 'Enter at least {{count}} characters for the problem description',
		      textMax: 'Input cannot exceed {{count}} characters',
		      imageRequired: 'Upload at least one image as input',
		      imageType: 'Only JPG, PNG, and WebP images are supported',
		      imageSize: 'Images must be 30MB or smaller',
		    },
		    feedback: {
		      unsupportedImageTitle: 'Unsupported image format',
		      unsupportedImageDescription: '{{name}} is not supported. Please upload a JPG, PNG, or WebP image.',
		      imageTooLargeTitle: 'Image too large',
		      imageTooLargeDescription: '{{name}} is larger than 30MB. Please compress it and try again.',
		    },
		    activeTask: {
		      title: 'Current Task',
		      subtitle: 'You can keep watching or cancel it after returning to the workspace',
		      queueCount: '{{count}} items',
		      progressLabel: 'Current progress',
		      stageLabel: 'Current stage: {{stage}}',
		      moreTasksHint: '{{count}} more in queue',
		      continueAction: 'Resume task',
		      continueTaskAria: 'Resume task {{title}}',
		      defaultInlineNote: 'The task stays in the active-task list at the top right, so you can come back later or cancel it here.',
		      returnedInlineNote: 'You just left the generating page. The task is still running and ready to resume anytime.',
		      cancelledInlineNote: 'The last task has been cancelled. Any remaining active tasks will stay available here.',
		      returnedToastTitle: 'Back in the video workspace',
		      returnedToastDescription: 'Your current task is still running. You can resume or cancel it from the input page.',
		      cancelledToastTitle: 'Task cancelled',
		      cancelledToastDescription: 'You can refine the prompt and start a new video whenever you are ready.',
		    },
		    suggestionsLabel: 'Try These',
    suggestions: [
      "Prove L'Hôpital's rule",
      'Solve partial differential equations',
      'Explain Fourier transform'
    ],
    feedTitle: 'Problem Video Library',
    feedDesc: 'Review your own recent videos first, then browse high-quality Manim animation explainers created by other students.',
    feedPrivateTitle: 'My Problems',
    feedPrivateDesc: 'Visible only to you',
    feedPrivateEmptyTitle: 'Your private videos will show up here',
    feedPrivateEmptyDesc: 'Once a video finishes generating, the latest results appear here for quick review.',
    feedPublicTitle: 'Trending Problem Explainers',
    feedPublicDesc: 'Browse high-quality Manim animation explainers created by other students',
    feedLoadMore: 'Load more explainers',
    feedLoading: 'Fetching data...',
    feedEmptyTitle: 'No public explainers yet. Be the first to create one.',
    feedEmptyDesc: 'An empty discovery area never blocks you from entering a problem and generating a new video.',
    feedErrorTitle: 'Public explainers are temporarily unavailable',
    feedErrorDesc: 'A failed recommendation request never blocks the core creation flow.',
    feedPrivateVisibilityLabel: 'Private',
    feedPublicVisibilityLabel: 'Public',
    feedPublishedBadge: 'Published',
    feedPrivateViewAction: 'View result',
    feedViewAction: 'View explainer',
    feedReuseAction: 'Reuse prompt',
    feedReuseToastTitle: 'Prompt copied into the input area',
    feedReuseToastDesc: 'You can refine the prompt before generating a new video.'
  },
  /** Story 1-6: Classroom input page copy. */
  classroomInput: {
    badgeLabel: 'Classroom Builder',
    titleLine1: 'Enter a topic, ',
    titleGradient: 'instantly build a virtual classroom',
    placeholder:
      'What do you want to learn systematically?\n\nFor example:\n"Using real-life examples, explain the chain rule in calculus"',
    smartMatchHint: 'Smart student-teacher matching',
    smartMatchDesc: 'Automatically matches the best AI teacher based on your preferences',
    multiAgentHint: 'Multi-agent discussion mode',
    toolUploadFile: 'Upload courseware/PDF',
    toolVoiceInput: 'Voice input',
    toolEnhanceSettings: 'Enhancement settings',
    toolWebSearch: 'Enable web search',
    submitLabel: 'Generate Classroom',
    suggestionsLabel: 'Try These',
    suggestions: [
      'Binary tree visual guide',
      'Taylor expansion derivation',
      'Chain rule in calculus'
    ],
    feedTitle: 'Explore Quality Classrooms',
    feedDesc: 'See what systematic courses others are learning with XiaoMai',
    feedLoadMore: 'Load more classrooms',
    feedLoading: 'Searching courses...',
    feedComingSoon: 'Public classrooms launching soon — stay tuned',
    feedEmptyTitle: 'No public classrooms yet',
    feedEmptyDesc: 'Be the first creator — after generation, click "Publish" on the play page.',
    feedErrorTitle: 'Public classrooms are unavailable',
    feedErrorDesc: 'Something went wrong. You can still enter a topic above and generate a new classroom.',
    feedViewAction: 'Open classroom',
    feedPublicBadge: 'Public',
    advanced: {
      triggerLabel: 'Advanced',
      dialogTitle: 'Advanced settings',
      dialogDescription: 'Tune the number of scenes, target duration and interactive style.',
      doneLabel: 'Done',
      sceneCountLabel: 'Slides per lesson',
      sceneCountHint: 'Generate exactly this many slides (1-30)',
      durationLabel: 'Target duration',
      durationUnit: 'min',
      interactiveLabel: 'Interactive-first mode',
      interactiveHint: 'Prefer hands-on practice over lecture-only slides',
      interactiveOn: 'On',
      interactiveOff: 'Off',
    }
  },
} as const;
