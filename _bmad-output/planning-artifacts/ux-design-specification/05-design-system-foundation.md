## Design System Foundation

### Design System Choice

**小麦采用 Shadcn/ui CLI v4 + Tailwind CSS v4 作为设计系统基础**

| 技术选型 | 版本/来源 | 用途 |
|----------|-----------|------|
| **UI 组件库** | Shadcn/ui CLI v4 | 基础组件、交互模式 |
| **样式系统** | Tailwind CSS v4 + UnoCSS | 主题定制、响应式 |
| **底层组件** | Radix UI | 无障碍访问基础 |
| **构建工具** | Vite 6.x | 快速开发体验 |
| **框架** | React 19 + TypeScript 5.7+ | 类型安全、性能 |

### Rationale for Selection

**选择 Shadcn/ui 的核心原因：**

| 优势 | 对小麦的价值 |
|------|-------------|
| **可复制而非安装** | 组件代码直接复制到项目中，完全可控，支持深度定制 |
| **基于 Radix UI** | 无障碍访问内置，符合 WCAG AA 标准（高职教育场景必需） |
| **Tailwind 原生** | 样式完全自定义，支持统一品牌风格与少量局部点缀 |
| **TypeScript 支持** | 类型安全，减少运行时错误，提升开发效率 |
| **轻量级** | 只复制需要的组件，保持包体积小，加载快 |
| **React 19 原生** | 充分利用最新特性，性能最优 |

**与项目需求的匹配度：**

| 项目需求 | 设计系统解决方案 |
|----------|------------------|
| 4 种 AI 老师风格选择 | 输入框附近的简单下拉框 + `AgentConfig` 数据预设 |
| 无障碍访问（WCAG AA） | Radix UI 组件内置键盘导航、ARIA 标签 |
| 极简首页（双入口） | Shadcn 的组件足够灵活，不做复杂导航 |
| 视频播放器 | 基于 Video.js 封装，Shadcn 不限制第三方集成 |
| 5 周快速交付 | Shadcn 组件开箱即用，减少从零开发 |

### Implementation Approach

**第 1 周：设计系统搭建**

```
设计系统初始化
├── 初始化 Shadcn/ui CLI v4 Vite 项目
├── 配置 Tailwind CSS v4 主题变量
│   ├── 主色系（小麦品牌色 #f5c547）
│   ├── 局部老师点缀色
│   └── 语义化颜色（成功/警告/错误）
├── 创建核心组件
│   ├── Button（按钮）
│   ├── Input（输入框）
│   ├── Card（卡片）
│   ├── Progress（进度条）
│   └── Avatar（头像）
└── 建立设计 Token
    ├── 颜色系统
    ├── 间距系统
    └── 字体系统
```

**第 2-4 周：业务组件开发**

```
业务组件开发
├── 双入口页面组件
│   ├── 入口选择卡片
│   └── 智能推荐提示
├── 风格选择器组件
│   ├── 输入框附属下拉框
│   ├── 可扩展老师风格选项列表
│   └── 当前会话风格选中态
├── 进度反馈组件
│   ├── 分阶段进度条
│   ├── 预计剩余时间
│   └── 阶段描述文案
├── 视频播放器组件
│   ├── 基于 Video.js 封装
│   ├── 倍速、进度、全屏控制
│   └── 截图笔记功能
├── Companion 伴学组件
│   ├── 当前上下文锚点
│   ├── 问答流与追问建议
│   └── 解释白板
├── Evidence / Retrieval 组件（Provider 驱动）
│   ├── 引用来源展示
│   ├── 资料接入与解析状态
│   └── 来源抽屉 / 证据面板内深挖交互（非独立路由）
└── Learning Coach 组件（流程 / 规划 Provider 驱动）
    ├── checkpoint / quiz
    ├── 路径规划
    └── 解析与推荐
```

**需手动集成的库：**

| 库 | 用途 | 优先级 |
|----|------|:------:|
| Zustand | 状态管理 | P0 |
| Framer Motion | 动画增强 | P1 |
| KaTeX / Temml | 数学公式渲染 | P0 |
| Shiki | 代码高亮 | P1 |
| ky / alova | HTTP 客户端 | P0 |
| react-router-dom | 路由 | P0 |
| react-i18next | 国际化 | P2 |
| Video.js | 视频播放器 | P0 |
| SSE 客户端工具 | 实时进度 | P0 |

### Customization Strategy

**主题变量架构：**

```css
/* Tailwind 主题配置 */
:root {
  /* 小麦品牌色 */
  --primary: {小麦主色};
  --secondary: {辅助色};

  /* 老师局部点缀色 */
  --agent-accent-serious: {严肃型点缀色};
  --agent-accent-humorous: {幽默型点缀色};
  --agent-accent-patient: {耐心型点缀色};
  --agent-accent-efficient: {高效型点缀色};
}

/* 仅在局部元素使用老师点缀色 */
.agent-accent-serious { --agent-accent: var(--agent-accent-serious); }
.agent-accent-humorous { --agent-accent: var(--agent-accent-humorous); }
/* ... */
```

**组件定制原则：**

1. **品牌优先** —— 页面保持统一品牌风格，老师风格仅作为局部业务配置
2. **极简至上** —— 组件设计遵循"少即是多"
3. **无障碍优先** —— 所有组件支持键盘导航和屏幕阅读器
4. **性能优先** —— 组件懒加载，按需引入

**设计 Token 定义：**

| Token 类别 | 定义 | 用途 |
|-----------|------|------|
| **颜色** | 主色/辅助色/老师局部点缀色 | 品牌识别、局部状态表达 |
| **间距** | 4px 基础单位 | 布局一致性 |
| **字体** | 系统字体栈 | 快速加载、原生感 |
| **圆角** | 4px / 8px / 12px | 组件层次 |
| **阴影** | 轻微/中等/强烈 | 深度感知 |

***
