# Directory Index: references

> 外部参考项目索引，包含 OpenMAIC、ManimToVideoClaw 等技术参考项目

---

## Files

- **[README.md](./README.md)** - 参考目录说明与快速导航

## Subdirectories

### manim-to-video-claw/

AI 驱动的 Manim 视频生成流水线，包含分镜生成、代码生成、渲染合成完整流程。

- **[README.md](./manim-to-video-claw/README.md)** - 项目英文说明文档
- **[README.zh-CN.md](./manim-to-video-claw/README.zh-CN.md)** - 项目中文说明文档
- **[LICENSE](./manim-to-video-claw/LICENSE)** - 商业软件许可协议

#### manim-to-video-claw/manimtovideo/

Manim 渲染与视频合成核心模块。

- **[handler_fastapi.py](./manim-to-video-claw/manimtovideo/handler_fastapi.py)** - FastAPI 服务入口，视频渲染 API
- **[requirements.txt](./manim-to-video-claw/manimtovideo/requirements.txt)** - Python 依赖清单
- **[setup.py](./manim-to-video-claw/manimtovideo/setup.py)** - 包安装配置

#### manim-to-video-claw/manimtovideo/function_call/

视频创建与帧处理功能模块。

- **[CreatManimVideo.py](./manim-to-video-claw/manimtovideo/function_call/CreatManimVideo.py)** - Manim 视频创建核心函数
- **[CreateLastFrame.py](./manim-to-video-claw/manimtovideo/function_call/CreateLastFrame.py)** - 末帧图像生成功能
- **[score_ops.py](./manim-to-video-claw/manimtovideo/function_call/score_ops.py)** - 评分相关操作

#### manim-to-video-claw/manimtovideo/manimtovideo/

多 TTS 服务商支持（豆包/百度/Spark/Kokoro）。

- **[baidutts.py](./manim-to-video-claw/manimtovideo/manimtovideo/baidutts.py)** - 百度 TTS 语音合成
- **[bytetts.py](./manim-to-video-claw/manimtovideo/manimtovideo/bytetts.py)** - 豆包 TTS 语音合成
- **[sparktts.py](./manim-to-video-claw/manimtovideo/manimtovideo/sparktts.py)** - Spark TTS 语音合成
- **[kokorotts.py](./manim-to-video-claw/manimtovideo/manimtovideo/kokorotts.py)** - Kokoro TTS 语音合成

#### manim-to-video-claw/scenext/

Manim 代码生成与自动修复模块。

- **[handler_fastapi.py](./manim-to-video-claw/scenext/handler_fastapi.py)** - FastAPI 服务入口，代码生成 API
- **[config.yaml](./manim-to-video-claw/scenext/config.yaml)** - 模块配置文件
- **[requirements.txt](./manim-to-video-claw/scenext/requirements.txt)** - Python 依赖清单

#### manim-to-video-claw/scenext/Main/

任务执行入口。

- **[execute.py](./manim-to-video-claw/scenext/Main/execute.py)** - 主执行流程

#### manim-to-video-claw/scenext/auto_fix_code/

AI 辅助代码修复模块。

- **[ai_fix_code.py](./manim-to-video-claw/scenext/auto_fix_code/ai_fix_code.py)** - AI 驱动的代码修复
- **[ast_fix_code.py](./manim-to-video-claw/scenext/auto_fix_code/ast_fix_code.py)** - AST 语法树修复
- **[render_fix_code.py](./manim-to-video-claw/scenext/auto_fix_code/render_fix_code.py)** - 渲染错误修复
- **[stat_check.py](./manim-to-video-claw/scenext/auto_fix_code/stat_check.py)** - 静态检查

#### manim-to-video-claw/scenext/code_render/

代码渲染模板。

- **[render.py](./manim-to-video-claw/scenext/code_render/render.py)** - 代码渲染逻辑
- **[templates/base.j2](./manim-to-video-claw/scenext/code_render/templates/base.j2)** - Jinja2 基础模板
- **[templates/process.j2](./manim-to-video-claw/scenext/code_render/templates/process.j2)** - 处理流程模板

#### manim-to-video-claw/storyboard/

分镜生成模块。

- **[app.py](./manim-to-video-claw/storyboard/app.py)** - FastAPI 分镜生成服务
- **[config.yaml](./manim-to-video-claw/storyboard/config.yaml)** - 模块配置

#### manim-to-video-claw/scenext-forwarding/

API 网关模块。

- **[app.py](./manim-to-video-claw/scenext-forwarding/app.py)** - API 网关入口

---

### openmaic/

开源多智能体互动课堂平台，Next.js + LangGraph 架构，支持幻灯片/测验/交互模拟。

- **[README.md](./openmaic/README.md)** - 项目英文说明文档
- **[README-zh.md](./openmaic/README-zh.md)** - 项目中文说明文档
- **[LICENSE](./openmaic/LICENSE)** - AGPL-3.0 开源许可证
- **[package.json](./openmaic/package.json)** - NPM 包配置
- **[pnpm-workspace.yaml](./openmaic/pnpm-workspace.yaml)** - pnpm 工作区配置

#### openmaic/app/

Next.js App Router 应用目录。

- **[layout.tsx](./openmaic/app/layout.tsx)** - 根布局组件
- **[page.tsx](./openmaic/app/page.tsx)** - 首页（课堂生成输入）
- **[globals.css](./openmaic/app/globals.css)** - 全局样式

#### openmaic/app/api/

服务端 API 路由（~18 个端点）。

- **[chat/route.ts](./openmaic/app/api/chat/route.ts)** - 多智能体讨论 SSE 流式传输
- **[classroom/route.ts](./openmaic/app/api/classroom/route.ts)** - 课堂数据 API
- **[health/route.ts](./openmaic/app/api/health/route.ts)** - 健康检查端点
- **[parse-pdf/route.ts](./openmaic/app/api/parse-pdf/route.ts)** - PDF 解析服务
- **[quiz-grade/route.ts](./openmaic/app/api/quiz-grade/route.ts)** - 测验评分 API
- **[transcription/route.ts](./openmaic/app/api/transcription/route.ts)** - 语音转写服务
- **[web-search/route.ts](./openmaic/app/api/web-search/route.ts)** - 网络搜索服务

#### openmaic/app/api/generate/

场景生成流水线 API。

- **[image/route.ts](./openmaic/app/api/generate/image/route.ts)** - 图片生成 API
- **[tts/route.ts](./openmaic/app/api/generate/tts/route.ts)** - TTS 语音合成 API
- **[video/route.ts](./openmaic/app/api/generate/video/route.ts)** - 视频生成 API
- **[scene-content/route.ts](./openmaic/app/api/generate/scene-content/route.ts)** - 场景内容生成
- **[scene-actions/route.ts](./openmaic/app/api/generate/scene-actions/route.ts)** - 场景动作生成
- **[scene-outlines-stream/route.ts](./openmaic/app/api/generate/scene-outlines-stream/route.ts)** - 场景大纲流式生成
- **[agent-profiles/route.ts](./openmaic/app/api/generate/agent-profiles/route.ts)** - Agent 配置生成

#### openmaic/app/api/generate-classroom/

异步课堂生成 API。

- **[route.ts](./openmaic/app/api/generate-classroom/route.ts)** - 课堂生成任务提交
- **[[jobId]/route.ts](./openmaic/app/api/generate-classroom/[jobId]/route.ts)** - 任务状态轮询

#### openmaic/app/api/pbl/

项目制学习 API。

- **[chat/route.ts](./openmaic/app/api/pbl/chat/route.ts)** - PBL 聊天 API

#### openmaic/app/classroom/[id]/

课堂回放页面。

- **[page.tsx](./openmaic/app/classroom/[id]/page.tsx)** - 课堂回放页面组件

#### openmaic/lib/

核心业务逻辑（复用重点）。

> ⚠️ 目录结构较深，建议使用 ACE 搜索或直接浏览目录

---

### RuoYi-Vue-Plus-5.X/

Java Spring Boot 管理后台框架，ToB 后端服务。

- **[README.md](./RuoYi-Vue-Plus-5.X/README.md)** - 项目说明文档
- **[pom.xml](./RuoYi-Vue-Plus-5.X/pom.xml)** - Maven 根配置

#### RuoYi-Vue-Plus-5.X/ruoyi-modules/

业务模块目录。

- **[pom.xml](./RuoYi-Vue-Plus-5.X/ruoyi-modules/pom.xml)** - 模块聚合配置

---

### ruoyi-plus-soybean-master/

Vue 3 + Naive UI 管理前端，ToB 管理端界面。

- **[README.md](./ruoyi-plus-soybean-master/README.md)** - 项目说明文档
- **[package.json](./ruoyi-plus-soybean-master/package.json)** - NPM 包配置
- **[pnpm-workspace.yaml](./ruoyi-plus-soybean-master/pnpm-workspace.yaml)** - pnpm 工作区配置
- **[vite.config.ts](./ruoyi-plus-soybean-master/vite.config.ts)** - Vite 构建配置

---

## 复用计划摘要

| 项目 | 复用内容 | 许可证 |
|------|----------|--------|
| **openmaic** | LangGraph 编排、生成流水线、动作引擎、LLM/TTS 抽象 | AGPL-3.0 |
| **manim-to-video-claw** | 分镜生成、Manim 代码生成、渲染合成、多 TTS | 商业自有 |
| **RuoYi-Vue-Plus-5.X** | ToB 用户管理、RBAC 权限（赛后） | MIT |
| **ruoyi-plus-soybean-master** | ToB 管理前端（赛后） | MIT |

---

_Index generated by BMAD index-docs workflow_
_Last updated: 2026-03-22_
