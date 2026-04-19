/**
 * 文件说明：集中维护 Story 1.4 入口页、落地页与导航相关的 i18n 资源。
 * 这些文案会被首页、落地页、全局导航和入口占位路由共同消费。
 */

export const zhCnEntryPageResources = {
  common: {
    close: '关闭',
    openMenu: '打开菜单',
    previous: '上一页',
    next: '下一页',
    themeLight: '切到浅色',
    themeDark: '切到深色'
  },
  entryNav: {
    brand: '小麦 XiaoMai',
    homeBrand: 'XiaoMai',
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
        label: '单题讲解',
        href: '/video/input',
        icon: 'video'
      },
      {
        label: '虚拟课堂',
        href: '/classroom/input',
        icon: 'layout-template'
      },
      {
        label: '学习中心',
        href: '#',
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
    guideCards: [
      {
        title: '没找到合适讲解？',
        desc: '如果推荐区里暂时没有相似内容，也不会影响你继续拍题、粘贴题目或直接生成新视频。'
      },
      {
        title: '登录后看更多',
        desc: '登录即可解锁更多公开讲解。即使暂未登录，主流程仍然照常可用，绝不卡点。'
      },
      {
        title: '网络不稳也能继续',
        desc: '推荐内容加载慢时，先继续做题更高效。推荐区变慢不影响核心的题目分析与生成。'
      }
    ],
    feedTitle: '热门题目讲解视频',
    feedDesc: '浏览其他同学生成的优质 Manim 动画讲解',
    feedCategories: ['最近高分', '高等数学', '大学物理'],
    feedLoadMore: '加载更多解题视频',
    feedLoading: '正在拉取数据...',
    feedEmptyTitle: '暂无公开视频，快来创建第一个',
    feedEmptyDesc: '公开发现区为空时，不会影响你继续输入题目并直接生成新视频。',
    feedErrorTitle: '公开视频暂时不可用',
    feedErrorDesc: '推荐区加载失败不会阻断主流程，你仍然可以直接输入题目并发起新任务。',
    feedViewAction: '查看讲解',
    feedReuseAction: '复用题目',
    feedReuseToastTitle: '已复用题目到输入区',
    feedReuseToastDesc: '你可以继续补充细节后再生成新视频。'
  },
  /** Story 1-6：课堂输入页文案。 */
  classroomInput: {
    badgeLabel: 'Classroom Builder',
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
    guideCards: [
      {
        title: '没找到合适讲解？',
        desc: '如果推荐区里暂时没有相似内容，也不会影响你继续上传课件或直接生成新课堂。'
      },
      {
        title: '登录后看更多',
        desc: '登录即可解锁更多公开课件。即使暂未登录，主流程仍然照常可用，绝不卡点。'
      },
      {
        title: '网络不稳也能继续',
        desc: '推荐内容加载慢时，先继续构思更高效。推荐区变慢不影响核心的课程生成。'
      }
    ],
    feedTitle: '探索优质课堂案例',
    feedDesc: '看看大家都在用小麦学什么系统课程',
    feedCategories: ['推荐精选', '理工科', '经管文法'],
    feedLoadMore: '加载更多案例',
    feedLoading: '正在为您检索课程...'
  },
  landing: {
    hero: {
      badgeLead: '全新',
      badgeText: 'AIGC 原生虚拟教室现已开放试点',
      titlePrefix: '体验',
      titleAccent: '小麦',
      titleSuffix: '把题目和知识点直接变成一堂会动的课',
      description:
        '面向高职教育的 AI 教学视频智能体。输入“我想学 XXX”或上传题目照片，系统在 5 分钟内生成带有 Manim 动画、多风格 AI 老师和后续追问能力的沉浸式讲解视频。',
      primaryAction: '立即体验',
      secondaryAction: '查看试点方案',
      imageAlt: '小麦落地页课堂展示图'
    },
    sponsors: {
      title: '技术底座与课堂能力',
      items: [
        {
          label: 'Manim 动画',
          icon: 'crown'
        },
        {
          label: 'OCR 识题',
          icon: 'vegan'
        },
        {
          label: '多风格 TTS',
          icon: 'ghost'
        },
        {
          label: 'LangGraph 编排',
          icon: 'puzzle'
        },
        {
          label: 'FFmpeg 合成',
          icon: 'squirrel'
        },
        {
          label: 'FastAPI 服务',
          icon: 'cookie'
        },
        {
          label: '职教教学场景',
          icon: 'drama'
        }
      ]
    },
    benefits: {
      eyebrow: '价值',
      title: '让教师和学生都明显省力',
      description:
        '围绕教师备课提效与学生理解提升两个核心目标，聚焦呈现小麦在生成效率、学习体验与内容传播上的实际价值。',
      items: [
        {
          title: '把 10+ 小时压缩到 5 分钟',
          description:
            '教师不再手工做脚本、动画、配音和剪辑，课堂资源能在当天快速上线。'
        },
        {
          title: '双入口覆盖学与问',
          description:
            '从系统化学习到单题答疑，学生不需要先理解复杂功能分区就能上手。'
        },
        {
          title: '稳定输出高质量动画',
          description:
            '基于 Manim 的程序化讲解更适合公式、几何、流程和抽象概念可视化。'
        },
        {
          title: '结果天然适合分享',
          description:
            '生成完成后即可播放、收藏和传播，适合宿舍讨论、课堂复盘和翻转教学。'
        }
      ]
    },
    features: {
      eyebrow: '亮点',
      title: '真正体现产品差异的关键能力',
      description:
        '围绕输入引导、内容生成、风格表达与学习延展进行设计，让用户从第一次使用开始就感受到更贴近教学场景的完整体验。',
      items: [
        {
          title: '沉浸式桌面学习体验',
          description:
            '围绕生成、播放与学习管理打磨大屏操作流程，让复杂任务也能保持清晰、顺畅和稳定。'
        },
        {
          title: '老师风格一眼可辨',
          description:
            '不同 AI 老师不仅声音不同，在讲解节奏、示例方式和视觉表达上也保持一致，方便用户快速找到适合自己的学习方式。'
        },
        {
          title: '双入口智能引导',
          description:
            '系统会根据输入内容推荐更适合的使用路径，在“系统学一个主题”和“快速讲清一道题”之间自然切换。'
        },
        {
          title: '生成结果更有质感',
          description:
            '统一的品牌视觉结合老师风格配色，让页面展示与生成内容都具备更强的专业感与辨识度。'
        },
        {
          title: '关键进度清晰可见',
          description:
            '从题目理解到脚本生成，再到动画渲染与视频合成，用户始终知道系统正在完成哪一步。'
        },
        {
          title: '学习过程可以延续',
          description:
            '视频生成后仍可继续追问、补充解释或延伸练习，让一次使用自然进入下一轮学习。'
        }
      ]
    },
    services: {
      eyebrow: '场景',
      title: '从备课到答疑，一套流程跑完',
      description:
        '覆盖课堂生成、单题讲解、学习沉淀与院校协同四类核心场景，帮助产品从试用走向真实教学落地。',
      items: [
        {
          title: '课堂生成模式',
          description: '输入知识点，生成完整课堂脚本、视频与测验。',
          pro: false
        },
        {
          title: '单题讲解模式',
          description: '拍照识题或粘贴描述，快速获得单题动画讲解视频。',
          pro: false
        },
        {
          title: '个人学习中心',
          description: '历史记录、收藏、进度追踪，帮助学生建立连续复习路径。',
          pro: false
        },
        {
          title: '院校试点工作台',
          description: '支持教师协作、课程分发和试点数据复盘，适合教学团队联动。',
          pro: true
        }
      ]
    },
    howItWorks: {
      eyebrow: '流程',
      title: '从输入到惊喜，只走 4 步',
      items: [
        {
          badge: '输入',
          title: '输入知识点、题目或拍照上传',
          description:
            '支持打字、粘贴与 OCR 识图，让用户只关注“我想学什么”。',
          imageSrc: '/entry/roboto.png',
          imageAlt: '输入知识点的流程插画'
        },
        {
          badge: '匹配',
          title: '选择最适合你的 AI 老师',
          description:
            '严肃、幽默、耐心、高效四种风格对齐不同学习节奏和心理偏好。',
          imageSrc: '/entry/runner.png',
          imageAlt: 'AI 老师匹配流程插画'
        },
        {
          badge: '生成',
          title: '系统分阶段编排并透明反馈',
          description:
            '题目理解、脚本编写、动画渲染、视频合成每一步都对用户可见。',
          imageSrc: '/entry/pacheco.png',
          imageAlt: '生成过程流程插画'
        },
        {
          badge: '扩展',
          title: '播放结果、继续追问、分享给同伴',
          description:
            '课堂不会停在一个视频上，而是能继续生成解释、测验和复习线索。',
          imageSrc: '/entry/gamestation.png',
          imageAlt: '结果扩展流程插画'
        }
      ]
    },
    testimonials: {
      eyebrow: '口碑',
      title: '来自学生、教师和自学者的第一批反馈',
      reviews: [
        {
          name: '林嘉琪',
          role: '高职学生',
          comment:
            '以前看不懂函数图像，现在题目一丢进去，5 分钟就能看到公式怎么“动”起来，复习压力小了很多。'
        },
        {
          name: '陈老师',
          role: '高职教师',
          comment:
            '最有价值的是不需要我再自己做动画。以前一条视频要做大半天，现在能把精力留给课堂设计。'
        },
        {
          name: 'Ava Li',
          role: '职业转型自学者',
          comment:
            '我喜欢“高效型”老师，解释特别直接，适合下班后 20 分钟内快速补盲点。'
        },
        {
          name: '何文涛',
          role: '考前冲刺学生',
          comment:
            '等待过程不会焦虑，因为我能看到它正在做哪一步，比常见的“加载中”舒服太多。'
        },
        {
          name: '黄教研员',
          role: '课程负责人',
          comment:
            '如果后续把试点数据和学习反馈接起来，这个产品会非常适合院校规模化落地。'
        },
        {
          name: 'Sophia Zhou',
          role: '学习产品观察者',
          comment:
            '最强的点不是 AI 本身，而是它把“找老师、约时间、做视频”压缩成了一个页面内的体验。'
        }
      ]
    },
    team: {
      eyebrow: '老师风格',
      title: '4 位 AI 老师，加上一支教研与工程团队',
      description:
        '当前先展示 4 位 AI 老师，分别覆盖不同学习节奏与理解偏好。后续新增老师时，这里的卡片列表会继续扩展。',
      action: '查看老师简介',
      modalClose: '关闭简介',
      modalPersonalityLabel: '真实性格定位',
      modalStrengthsLabel: '讲解特征',
      modalScenesLabel: '适合场景',
      modalQuoteLabel: '风格示例',
      members: [
        {
          id: 'serious',
          name: '严肃型老师',
          accent: '严谨',
          image: '/entry/teacher-serious.jpg',
          summary:
            '更像一位节奏稳定、要求明确、表达克制的主讲老师，习惯先搭建知识框架，再逐步拆解定义、推导和结论。',
          personality:
            '更像一位节奏稳定、要求明确、表达克制的主讲老师，习惯先搭建知识框架，再逐步拆解定义、推导和结论。',
          strengths: [
            '先搭整体框架，再拆关键步骤',
            '更强调条件、定义和边界',
            '会主动指出高频误区和失分点'
          ],
          scenes: ['章节串讲', '公式推导', '考前复习'],
          quote: '我们先把这部分知识的主干逻辑搭起来，再看每一步为什么成立。'
        },
        {
          id: 'humorous',
          name: '幽默型老师',
          accent: '有趣',
          image: '/entry/teacher-humorous.jpg',
          summary:
            '像一位课堂气氛很好的老师，表达外放、反应快，善于把复杂问题翻译成学生更容易接住的日常语言。',
          personality:
            '像一位课堂气氛很好的老师，表达外放、反应快，善于把复杂问题翻译成学生更容易接住的日常语言。',
          strengths: [
            '更会用生活化类比解释概念',
            '能够快速调动学习注意力',
            '适合第一次接触新知识时建立兴趣'
          ],
          scenes: ['新概念入门', '课堂导入', '降低畏难情绪'],
          quote: '先别急着背定义，把它想成你每天都会碰到的那个场景，就容易多了。'
        },
        {
          id: 'patient',
          name: '耐心型老师',
          accent: '细致',
          image: '/entry/teacher-patient.jpg',
          summary:
            '像一位很会照顾学生节奏的老师，不急着推进，而是会反复确认前一步是否真正理解，再继续下一步。',
          personality:
            '像一位很会照顾学生节奏的老师，不急着推进，而是会反复确认前一步是否真正理解，再继续下一步。',
          strengths: [
            '每一步都解释得更完整',
            '更适合概念补漏和错题纠偏',
            '会照顾基础薄弱用户的理解速度'
          ],
          scenes: ['基础补强', '难点拆解', '反复练习'],
          quote: '这一步我们先不往下跳，确认你真正理解了，再继续后面的推导。'
        },
        {
          id: 'efficient',
          name: '高效型老师',
          accent: '直接',
          image: '/entry/teacher-efficient.jpg',
          summary:
            '像一位节奏很快、目标明确的老师，会优先给出最该掌握的结论和方法，避免把时间耗在次要信息上。',
          personality:
            '像一位节奏很快、目标明确的老师，会优先给出最该掌握的结论和方法，避免把时间耗在次要信息上。',
          strengths: [
            '优先呈现最重要的结论',
            '更适合碎片时间快速复习',
            '有利于错题回顾和临考查漏'
          ],
          scenes: ['快速补盲', '错题回顾', '临考查漏'],
          quote: '先抓住最关键的结论和方法，其他细节放在你真正需要的时候再展开。'
        }
      ]
    },
    community: {
      titleLead: '准备加入',
      titleAccent: '试点社区？',
      description:
        '我们正在和教师、学生与教研团队一起打磨小麦。加入交流群，提交试点申请，或者直接把你最想解决的课堂问题发给我们。',
      action: '加入试点社区'
    },
    pricing: {
      eyebrow: '试点方案',
      title: '先把核心体验跑通，再讨论规模化',
      description:
        '以试点阶段的真实使用门槛和协作深度为依据，分别为学生、教师与院校团队提供清晰的使用方案。',
      plans: [
        {
          title: '学生版',
          description: '适合个人快速试用和日常复习。',
          price: '0',
          period: '/月',
          button: '立即试用',
          popular: false,
          benefits: ['基础问答入口', '历史记录', '收藏与回看', '标准队列']
        },
        {
          title: '教师版',
          description: '适合备课、翻转课堂与资源建设。',
          price: '59',
          period: '/月',
          button: '申请教师试点',
          popular: true,
          benefits: ['双入口可用', '课程导出', '多风格切换', '优先生成队列']
        },
        {
          title: '院校版',
          description: '适合教研组、试点专业与项目制课程。',
          price: '299',
          period: '/月',
          button: '联系合作',
          popular: false,
          benefits: ['院校工作台', '试点数据复盘', '团队协作', '专属支持']
        }
      ]
    },
    contact: {
      eyebrow: '联系',
      title: '联系小麦团队',
      description:
        '无论你是希望申请试点、共创课程，还是反馈产品体验，都可以直接与小麦团队取得联系。',
      info: {
        locationTitle: '找到我们',
        locationValue: '广东省珠海市珠海城市职业技术学院',
        phoneTitle: '电话咨询',
        phoneValue: '+86 157 688 380 46',
        mailTitle: '邮件联系',
        mailValue: '3381292732@qq.com',
        visitTitle: '试点时间',
        visitValue1: '周一至周五',
        visitValue2: '09:00 - 18:00'
      },
      form: {
        firstName: '名字',
        firstNamePlaceholder: '例如：小林',
        lastName: '称呼 / 机构',
        lastNamePlaceholder: '例如：计算机学院',
        email: '邮箱',
        emailPlaceholder: 'your@email.com',
        subject: '咨询主题',
        subjectOptions: [
          '课堂模式试用',
          '问答模式试用',
          '教师试点合作',
          '院校合作咨询',
          '产品反馈建议'
        ],
        message: '留言内容',
        messagePlaceholder: '告诉我们你的课程场景、试点需求或最想解决的问题。',
        errorTitle: '表单不完整',
        errorDescription: '请至少填写名字、邮箱和留言内容后再发送。',
        validation: {
          firstNameRequired: '请填写名字',
          emailRequired: '请填写邮箱',
          emailInvalid: '请输入有效的邮箱地址',
          subjectRequired: '请选择咨询主题',
          messageRequired: '请填写留言内容'
        },
        button: '发送留言'
      }
    },
    faq: {
      eyebrow: '常见问题',
      title: '先回答你最可能问的 5 个问题',
      stillHaveQuestions: '还有问题？',
      contactUs: '直接联系我们',
      items: [
        {
          question: '小麦和普通搜题、题库类产品有什么区别？',
          answer:
            '小麦不是只给答案，而是把知识点生成成带动画、配音、可继续追问的完整讲解视频。'
        },
        {
          question: '双入口应该怎么选？',
          answer:
            '如果你想系统学一个主题，选“我想学 XXX”；如果你手里已经有题目或截图，选“帮我讲这道题”。'
        },
        {
          question: '真的能在 5 分钟左右生成吗？',
          answer:
            '我们的目标是将端到端延迟控制在 5 分钟以内，并用分阶段进度反馈把等待过程讲清楚。'
        },
        {
          question: 'AI 老师风格只是换个声音吗？',
          answer:
            '不是。风格会同时影响语气、讲解节奏、举例方式和页面视觉强调色。'
        },
        {
          question: '移动端可以用吗？',
          answer: 'MVP 优先保障桌面端体验，后续会逐步适配平板和移动端。'
        }
      ]
    },
    footer: {
      brand: '小麦 XiaoMai',
      copyright: '© 2026 小麦 XiaoMai。面向职教场景的 AI 教学视频智能体。',
      groups: [
        {
          title: '联系',
          items: ['邮箱', '试点申请', '问题反馈']
        },
        {
          title: '平台',
          items: ['课堂模式', '问答模式', '学习中心']
        },
        {
          title: '帮助',
          items: ['常见问题', '使用指南', '合作咨询']
        },
        {
          title: '关注',
          items: ['GitHub', '社区', '课程动态']
        }
      ]
    }
  }
} as const;

export const enUsEntryPageResources = {
  common: {
    close: 'Close',
    openMenu: 'Open menu',
    previous: 'Previous',
    next: 'Next',
    themeLight: 'Switch to light mode',
    themeDark: 'Switch to dark mode'
  },
  entryNav: {
    brand: 'XiaoMai',
    homeBrand: 'XiaoMai',
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
        label: 'Video Explainer',
        href: '/video/input',
        icon: 'video'
      },
      {
        label: 'Virtual Classroom',
        href: '/classroom/input',
        icon: 'layout-template'
      },
      {
        label: 'Learning Center',
        href: '#',
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
    guideCards: [
      {
        title: 'No matching explainer?',
        desc: "If similar content isn't available yet, you can still snap a problem, paste text, or generate a new video directly."
      },
      {
        title: 'Sign in for more',
        desc: 'Sign in to unlock more public explainers. The core flow works without an account — no blockers.'
      },
      {
        title: 'Unstable network? Keep going',
        desc: 'If recommendations load slowly, focus on your problem first. A slow feed never blocks core analysis and generation.'
      }
    ],
    feedTitle: 'Trending Problem Explainers',
    feedDesc: 'Browse high-quality Manim animation explainers created by other students',
    feedCategories: ['Top Rated', 'Calculus', 'College Physics'],
    feedLoadMore: 'Load more explainers',
    feedLoading: 'Fetching data...',
    feedEmptyTitle: 'No public explainers yet. Be the first to create one.',
    feedEmptyDesc: 'An empty discovery area never blocks you from entering a problem and generating a new video.',
    feedErrorTitle: 'Public explainers are temporarily unavailable',
    feedErrorDesc: 'A failed recommendation request never blocks the core creation flow.',
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
    guideCards: [
      {
        title: 'No matching explainer?',
        desc: "If similar content isn't available yet, you can still upload courseware or generate a new classroom directly."
      },
      {
        title: 'Sign in for more',
        desc: 'Sign in to unlock more public courseware. The core flow works without an account — no blockers.'
      },
      {
        title: 'Unstable network? Keep going',
        desc: 'If recommendations load slowly, keep brainstorming. A slow feed never blocks core classroom generation.'
      }
    ],
    feedTitle: 'Explore Quality Classrooms',
    feedDesc: 'See what systematic courses others are learning with XiaoMai',
    feedCategories: ['Featured', 'STEM', 'Business & Liberal Arts'],
    feedLoadMore: 'Load more classrooms',
    feedLoading: 'Searching courses...'
  },
  landing: {
    hero: {
      badgeLead: 'New',
      badgeText: 'The AIGC-native virtual classroom is now open for pilot programs',
      titlePrefix: 'Meet ',
      titleAccent: 'XiaoMai',
      titleSuffix: ' the virtual classroom that turns prompts into moving lessons',
      description:
        'Built for vocational education. Type “I want to learn XXX” or upload a problem screenshot, and XiaoMai generates a Manim-powered explainer video with a selectable AI teacher style in about five minutes.',
      primaryAction: 'Try XiaoMai',
      secondaryAction: 'View Pilot Plans',
      imageAlt: 'XiaoMai landing-page classroom showcase'
    },
    sponsors: {
      title: 'Technical foundations and classroom capabilities',
      items: [
        {
          label: 'Manim animation',
          icon: 'crown'
        },
        {
          label: 'OCR recognition',
          icon: 'vegan'
        },
        {
          label: 'Multi-voice TTS',
          icon: 'ghost'
        },
        {
          label: 'LangGraph orchestration',
          icon: 'puzzle'
        },
        {
          label: 'FFmpeg compositing',
          icon: 'squirrel'
        },
        {
          label: 'FastAPI services',
          icon: 'cookie'
        },
        {
          label: 'Vocational classroom scenarios',
          icon: 'drama'
        }
      ]
    },
    benefits: {
      eyebrow: 'Benefits',
      title: 'A product that saves time for both teachers and students',
      description:
        'The original four-card benefits block is preserved, but the content now highlights XiaoMai’s strongest outcome-based value.',
      items: [
        {
          title: 'Compress 10+ hours into 5 minutes',
          description:
            'Teachers no longer have to manually script, animate, narrate, and edit every explainer from scratch.'
        },
        {
          title: 'Two entry flows for learning and Q&A',
          description:
            'From structured study to single-problem support, first-time users do not need to decode complex navigation.'
        },
        {
          title: 'Consistent, high-quality animations',
          description:
            'Manim-based explainers are especially strong for formulas, geometry, workflows, and abstract concepts.'
        },
        {
          title: 'Results that are easy to share',
          description:
            'Every generated video is ready to play, save, and spread inside class groups or dorm-room discussions.'
        }
      ]
    },
    features: {
      eyebrow: 'Highlights',
      title: 'The capabilities that actually make the product feel different',
      description:
        'The design revolves around input guidance, content generation, teaching style, and learning extension, so the first-use experience already feels complete.',
      items: [
        {
          title: 'Immersive desktop-first learning flow',
          description:
            'The large-screen workflow stays clear, stable, and easy to follow even when tasks become complex.'
        },
        {
          title: 'Teacher styles feel visible',
          description:
            'Different AI teachers do not just sound different. Their pacing, examples, and visual emphasis stay coherent too.'
        },
        {
          title: 'Dual-entry guidance',
          description:
            'The system can suggest the best path for the learner, switching naturally between a structured class and a focused problem explainer.'
        },
        {
          title: 'Output with stronger polish',
          description:
            'A unified brand language plus teacher-style accents makes both the pages and generated results feel more premium.'
        },
        {
          title: 'Progress stays legible',
          description:
            'From topic understanding to script generation, rendering, and composition, users always know which stage is running.'
        },
        {
          title: 'Learning can continue after playback',
          description:
            'The generated video is not the end. Learners can continue asking, reviewing, and extending the topic.'
        }
      ]
    },
    services: {
      eyebrow: 'Scenarios',
      title: 'From lesson prep to learner support, in one flow',
      description:
        'The four cards cover classroom generation, single-problem explainers, learning accumulation, and institution pilots.',
      items: [
        {
          title: 'Classroom generation mode',
          description: 'Enter a topic and generate a full lesson flow with script, video, and quiz output.',
          pro: false
        },
        {
          title: 'Single-problem explainer mode',
          description: 'Upload a snapshot or paste the prompt to receive a focused animation explainer.',
          pro: false
        },
        {
          title: 'Personal learning center',
          description: 'Track watch history, favorites, and review behavior across sessions.',
          pro: false
        },
        {
          title: 'Institution pilot workspace',
          description: 'Designed for teaching teams, classroom rollout, and pilot result reviews.',
          pro: true
        }
      ]
    },
    howItWorks: {
      eyebrow: 'How it works',
      title: 'From prompt to surprise in four steps',
      items: [
        {
          badge: 'Input',
          title: 'Type a concept, paste text, or upload a snapshot',
          description:
            'Users only focus on what they want to learn. XiaoMai handles the interface complexity.',
          imageSrc: '/entry/roboto.png',
          imageAlt: 'Input-step illustration'
        },
        {
          badge: 'Match',
          title: 'Choose the AI teacher that fits your rhythm',
          description:
            'Serious, humorous, patient, and efficient cover different emotional and cognitive preferences.',
          imageSrc: '/entry/runner.png',
          imageAlt: 'Teacher-matching illustration'
        },
        {
          badge: 'Generate',
          title: 'Watch the system work through visible stages',
          description:
            'Topic understanding, script drafting, animation rendering, and video compositing are all exposed clearly.',
          imageSrc: '/entry/pacheco.png',
          imageAlt: 'Generation-step illustration'
        },
        {
          badge: 'Extend',
          title: 'Play the result, keep asking, and share it',
          description:
            'The lesson does not stop at one video. XiaoMai keeps the learning loop alive with follow-up interactions.',
          imageSrc: '/entry/gamestation.png',
          imageAlt: 'Extension-step illustration'
        }
      ]
    },
    testimonials: {
      eyebrow: 'Testimonials',
      title: 'Early reactions from students, teachers, and self-learners',
      reviews: [
        {
          name: 'Jiaqi Lin',
          role: 'Vocational student',
          comment:
            'I used to freeze on graph problems. Now I can see formulas move and make sense in a few minutes.'
        },
        {
          name: 'Mr. Chen',
          role: 'Vocational teacher',
          comment:
            'The biggest win is not having to build every animation manually. I can spend my time on pedagogy instead.'
        },
        {
          name: 'Ava Li',
          role: 'Career-switch learner',
          comment:
            'I prefer the efficient teacher. It gets straight to the point and fits my after-work study blocks perfectly.'
        },
        {
          name: 'Wentao He',
          role: 'Exam-prep student',
          comment:
            'The waiting experience feels trustworthy because I always know which stage the system is in.'
        },
        {
          name: 'Curriculum Reviewer Huang',
          role: 'Teaching lead',
          comment:
            'If the pilot data and classroom feedback loop are integrated well, this can scale strongly inside colleges.'
        },
        {
          name: 'Sophia Zhou',
          role: 'Learning product observer',
          comment:
            'The real advantage is not just AI. It compresses teacher search, scheduling, and video creation into one surface.'
        }
      ]
    },
    team: {
      eyebrow: 'Team',
      title: 'Four AI teachers, backed by a teaching and engineering team',
      description:
        'The first release introduces four AI teachers, each mapped to a different learning rhythm and preference.',
      action: 'View teacher profile',
      modalClose: 'Close profile',
      modalPersonalityLabel: 'Personality',
      modalStrengthsLabel: 'Teaching traits',
      modalScenesLabel: 'Best for',
      modalQuoteLabel: 'Example line',
      members: [
        {
          id: 'serious',
          name: 'Serious Teacher',
          accent: 'Rigorous',
          image: '/entry/teacher-serious.jpg',
          summary:
            'Feels like a composed lead instructor who prefers building the framework first, then unpacking definitions, derivations, and conclusions step by step.',
          personality:
            'Feels like a composed lead instructor who prefers building the framework first, then unpacking definitions, derivations, and conclusions step by step.',
          strengths: [
            'Builds the full structure before the details',
            'Emphasizes conditions, definitions, and boundaries',
            'Flags common mistakes before they happen'
          ],
          scenes: ['Chapter walkthroughs', 'Formula derivation', 'Exam review'],
          quote: 'Let’s build the full knowledge structure first, then examine why each step works.'
        },
        {
          id: 'humorous',
          name: 'Humorous Teacher',
          accent: 'Playful',
          image: '/entry/teacher-humorous.jpg',
          summary:
            'Feels like an expressive teacher with strong classroom energy who can translate complex material into language learners grasp immediately.',
          personality:
            'Feels like an expressive teacher with strong classroom energy who can translate complex material into language learners grasp immediately.',
          strengths: [
            'Explains through everyday analogies',
            'Helps learners stay engaged',
            'Great for first exposure to a new concept'
          ],
          scenes: ['Concept introduction', 'Lesson warm-up', 'Lowering anxiety'],
          quote: 'Don’t rush into memorizing the definition. Think of the everyday situation behind it first.'
        },
        {
          id: 'patient',
          name: 'Patient Teacher',
          accent: 'Detailed',
          image: '/entry/teacher-patient.jpg',
          summary:
            'Feels like a teacher who protects the learner’s rhythm, making sure one step is understood before moving to the next.',
          personality:
            'Feels like a teacher who protects the learner’s rhythm, making sure one step is understood before moving to the next.',
          strengths: [
            'Explains each step more completely',
            'Strong for correcting misunderstandings',
            'Matches learners who need more time and reassurance'
          ],
          scenes: ['Foundation building', 'Difficult concepts', 'Repeated practice'],
          quote: 'Let’s not jump ahead yet. We’ll make sure this step is fully clear before moving on.'
        },
        {
          id: 'efficient',
          name: 'Efficient Teacher',
          accent: 'Direct',
          image: '/entry/teacher-efficient.jpg',
          summary:
            'Feels like a fast, goal-oriented teacher who surfaces the most important conclusions first and avoids spending too much time on secondary detail.',
          personality:
            'Feels like a fast, goal-oriented teacher who surfaces the most important conclusions first and avoids spending too much time on secondary detail.',
          strengths: [
            'Prioritizes the highest-value conclusions',
            'Works well for short revision windows',
            'Useful for error review and last-minute checks'
          ],
          scenes: ['Fast catch-up', 'Wrong-answer review', 'Last-minute revision'],
          quote: 'Let’s secure the most important conclusion and method first, then expand only if needed.'
        }
      ]
    },
    community: {
      titleLead: 'Ready to join the ',
      titleAccent: 'pilot community?',
      description:
        'We are shaping XiaoMai with teachers, students, and teaching teams. Join the pilot group, submit a school use case, or tell us the classroom problem you most want solved.',
      action: 'Join the pilot community'
    },
    pricing: {
      eyebrow: 'Pilot plans',
      title: 'Make the core experience work first, then scale it',
      description:
        'The plans below reflect the actual thresholds and collaboration depth of XiaoMai’s pilot stage.',
      plans: [
        {
          title: 'Student',
          description: 'For personal trial and regular review sessions.',
          price: '0',
          period: '/mo',
          button: 'Start free',
          popular: false,
          benefits: ['Q&A entry', 'History', 'Favorites', 'Standard queue']
        },
        {
          title: 'Teacher',
          description: 'For lesson prep, flipped classrooms, and resource production.',
          price: '59',
          period: '/mo',
          button: 'Apply for pilot',
          popular: true,
          benefits: ['Dual entry', 'Lesson export', 'Teacher styles', 'Priority queue']
        },
        {
          title: 'Institution',
          description: 'For teaching teams, pilots, and structured classroom rollout.',
          price: '299',
          period: '/mo',
          button: 'Contact us',
          popular: false,
          benefits: ['Team workspace', 'Pilot analytics', 'Collaboration', 'Dedicated support']
        }
      ]
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Talk to the XiaoMai team',
      description:
        'Whether you want a pilot, a co-created lesson, or simply want to report a rough edge, you can reach us directly.',
      info: {
        locationTitle: 'Find us',
        locationValue: 'Zhuhai City Polytechnic, Guangdong, China',
        phoneTitle: 'Call us',
        phoneValue: '+86 157 688 380 46',
        mailTitle: 'Mail us',
        mailValue: '3381292732@qq.com',
        visitTitle: 'Pilot hours',
        visitValue1: 'Monday - Friday',
        visitValue2: '09:00 - 18:00'
      },
      form: {
        firstName: 'Name',
        firstNamePlaceholder: 'For example: Lin',
        lastName: 'Org / role',
        lastNamePlaceholder: 'For example: Computing School',
        email: 'Email',
        emailPlaceholder: 'your@email.com',
        subject: 'Topic',
        subjectOptions: [
          'Classroom mode trial',
          'Q&A mode trial',
          'Teacher pilot',
          'Institution cooperation',
          'Product feedback'
        ],
        message: 'Message',
        messagePlaceholder:
          'Tell us about your course context, pilot needs, or the classroom problem you most want solved.',
        errorTitle: 'Incomplete form',
        errorDescription:
          'Please provide at least your name, email, and a message before sending.',
        validation: {
          firstNameRequired: 'Please enter your name',
          emailRequired: 'Please enter your email',
          emailInvalid: 'Please enter a valid email address',
          subjectRequired: 'Please choose a topic',
          messageRequired: 'Please enter a message'
        },
        button: 'Send message'
      }
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Five questions we expect first',
      stillHaveQuestions: 'Still have questions?',
      contactUs: 'Contact us directly',
      items: [
        {
          question:
            'How is XiaoMai different from a normal answer-search or problem-bank product?',
          answer:
            'XiaoMai does not stop at the answer. It turns the topic into a narrated, animated, follow-up-ready teaching video.'
        },
        {
          question: 'How do I choose between the two entry points?',
          answer:
            'Choose “I want to learn XXX” for a full lesson. Choose “Explain this problem” when you already have a prompt, question, or screenshot.'
        },
        {
          question: 'Can it really generate in around five minutes?',
          answer:
            'That is our target. We also make the waiting state explicit so the user knows what the system is doing.'
        },
        {
          question: 'Is the teacher style just a different voice?',
          answer:
            'No. It changes narration style, pacing, examples, and the page’s visual emphasis.'
        },
        {
          question: 'Does it support mobile?',
          answer:
            'The MVP optimizes desktop first, with tablet and mobile support planned next.'
        }
      ]
    },
    footer: {
      brand: 'XiaoMai',
      copyright: '© 2026 XiaoMai. An AI teaching video agent for vocational education.',
      groups: [
        {
          title: 'Contact',
          items: ['Email', 'Pilot request', 'Feedback']
        },
        {
          title: 'Platform',
          items: ['Classroom mode', 'Q&A mode', 'Learning center']
        },
        {
          title: 'Help',
          items: ['FAQ', 'Guide', 'Cooperation']
        },
        {
          title: 'Follow',
          items: ['GitHub', 'Community', 'Updates']
        }
      ]
    }
  }
} as const;

export type ZhCnEntryPageResources = typeof zhCnEntryPageResources;
export type EnUsEntryPageResources = typeof enUsEntryPageResources;
