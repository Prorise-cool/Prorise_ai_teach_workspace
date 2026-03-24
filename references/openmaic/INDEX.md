# Directory Index

OpenMAIC (Open Multi-Agent Interactive Classroom) 是一个开源 AI 教育平台，通过多智能体编排将任何主题或文档转化为交互式课堂体验，支持 AI 教师、白板、测验和 PBL 项目式学习。

## Files

### Configuration

- **[components.json](./components.json)** - Shadcn UI 组件配置文件
- **[eslint.config.mjs](./eslint.config.mjs)** - ESLint 代码检查配置
- **[next.config.ts](./next.config.ts)** - Next.js 框架配置
- **[package.json](./package.json)** - 项目依赖和脚本配置
- **[pnpm-workspace.yaml](./pnpm-workspace.yaml)** - pnpm monorepo 工作区配置
- **[postcss.config.mjs](./postcss.config.mjs)** - PostCSS 样式处理配置
- **[tsconfig.json](./tsconfig.json)** - TypeScript 编译器配置
- **[vercel.json](./vercel.json)** - Vercel 部署配置

### Docker

- **[.dockerignore](./.dockerignore)** - Docker 构建忽略文件列表
- **[docker-compose.yml](./docker-compose.yml)** - Docker Compose 编排配置
- **[Dockerfile](./Dockerfile)** - Docker 镜像构建文件

### Environment

- **[.env.example](./.env.example)** - 环境变量示例文件
- **[.gitignore](./.gitignore)** - Git 版本控制忽略文件
- **[.nvmrc](./.nvmrc)** - Node.js 版本配置
- **[.prettierignore](./.prettierignore)** - Prettier 格式化忽略文件
- **[.prettierrc](./.prettierrc)** - Prettier 代码格式化配置

### Documentation

- **[LICENSE](./LICENSE)** - AGPL-3.0 开源许可证
- **[README.md](./README.md)** - 项目英文说明文档
- **[README-zh.md](./README-zh.md)** - 项目中文说明文档

### Lock Files

- **[pnpm-lock.yaml](./pnpm-lock.yaml)** - pnpm 依赖锁定文件

## Subdirectories

### app/

Next.js App Router 应用目录，包含页面路由和 API 端点

- **[globals.css](./app/globals.css)** - 全局样式文件
- **[layout.tsx](./app/layout.tsx)** - 根布局组件
- **[page.tsx](./app/page.tsx)** - 首页组件

#### app/api/

后端 API 路由目录

#### app/classroom/

课堂页面路由

#### app/generation-preview/

内容生成预览页面

### assets/

静态资源目录，包含项目图片和媒体文件

- **[banner.png](./assets/banner.png)** - 项目横幅图片
- **[logo-horizontal.png](./assets/logo-horizontal.png)** - 水平 Logo

#### assets/avatars/

AI 角色头像资源

#### assets/logos/

合作伙伴和技术栈 Logo

### community/

社区资源目录

- **[feishu.md](./community/feishu.md)** - 飞书社区群信息

### components/

React 组件目录，包含 UI 和业务组件

- **[header.tsx](./components/header.tsx)** - 页面头部组件
- **[server-providers-init.tsx](./components/server-providers-init.tsx)** - 服务端 Provider 初始化
- **[stage.tsx](./components/stage.tsx)** - 课堂舞台主组件
- **[user-profile.tsx](./components/user-profile.tsx)** - 用户资料组件

#### components/agent/

AI 智能体相关组件

#### components/ai-elements/

AI 交互元素组件

#### components/audio/

音频播放和处理组件

#### components/canvas/

画布绑定组件

#### components/chat/

聊天交互组件

#### components/generation/

内容生成组件

#### components/roundtable/

圆桌讨论组件

#### components/scene-renderers/

场景渲染器组件

#### components/settings/

设置面板组件

#### components/slide-renderer/

幻灯片渲染组件

#### components/stage/

舞台场景组件

#### components/ui/

通用 UI 组件库 (基于 Shadcn)

#### components/whiteboard/

白板绘制组件

### configs/

应用配置目录

- **[animation.ts](./configs/animation.ts)** - 动画配置
- **[chart.ts](./configs/chart.ts)** - 图表配置
- **[element.ts](./configs/element.ts)** - 元素配置
- **[font.ts](./configs/font.ts)** - 字体配置
- **[hotkey.ts](./configs/hotkey.ts)** - 快捷键配置
- **[image-clip.ts](./configs/image-clip.ts)** - 图片裁剪配置
- **[latex.ts](./configs/latex.ts)** - LaTeX 公式配置
- **[lines.ts](./configs/lines.ts)** - 线条样式配置
- **[mime.ts](./configs/mime.ts)** - MIME 类型配置
- **[shapes.ts](./configs/shapes.ts)** - 形状定义配置
- **[storage.ts](./configs/storage.ts)** - 存储配置
- **[symbol.ts](./configs/symbol.ts)** - 符号定义配置
- **[theme.ts](./configs/theme.ts)** - 主题配置

### lib/

核心库和工具函数目录

- **[logger.ts](./lib/logger.ts)** - 日志工具

#### lib/action/

Redux action 定义

#### lib/ai/

AI 模型集成 (OpenAI, Anthropic, Google)

#### lib/api/

API 客户端封装

#### lib/audio/

音频处理工具

#### lib/buffer/

缓冲区管理

#### lib/chat/

聊天功能实现

#### lib/constants/

常量定义

#### lib/contexts/

React Context 上下文

#### lib/export/

内容导出工具 (PPTX, HTML)

#### lib/generation/

内容生成逻辑

#### lib/hooks/

自定义 React Hooks

#### lib/i18n/

国际化支持

#### lib/media/

媒体处理工具

#### lib/orchestration/

多智能体编排 (LangGraph)

#### lib/pbl/

项目式学习 (PBL) 功能

#### lib/pdf/

PDF 处理工具

#### lib/playback/

播放控制

#### lib/prosemirror/

ProseMirror 富文本编辑器

#### lib/server/

服务端工具

#### lib/storage/

存储服务 (IndexedDB)

#### lib/store/

Zustand 状态管理

#### lib/types/

TypeScript 类型定义

#### lib/utils/

通用工具函数

#### lib/web-search/

网络搜索集成

### packages/

Monorepo 子包目录

#### packages/mathml2omml/

MathML 到 Office Math ML 转换库

#### packages/pptxgenjs/

PowerPoint 生成库

### public/

公共静态资源目录

- **[apple-icon.png](./app/apple-icon.png)** - Apple 图标
- **[favicon.ico](./app/favicon.ico)** - 网站图标

### skills/

OpenClaw 技能包目录

#### skills/openmaic/

OpenMAIC OpenClaw 技能集成
