---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - /Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/_bmad-output/planning-artifacts/prd.md
  - /Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/_bmad-output/planning-artifacts/architecture.md
  - /Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/_bmad-output/planning-artifacts/ux-design-specification.md
---

# Prorise_ai_teach_workspace - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Prorise_ai_teach_workspace, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1 [FR-UM-001]: 用户可完成注册、登录与登出，并在未登录访问受保护页面时被拦截或重定向到登录页。
FR2 [FR-UM-002]: 前端、FastAPI 与 RuoYi 必须对登录态做一致判断，失效或非法 Token 访问受保护接口时统一返回 401。
FR3 [FR-UM-003]: 用户可在个人中心查看并修改昵称、头像、学校等基础资料，非法格式或超限上传需被拒绝。
FR4 [FR-UI-001]: 首页必须清晰展示“初学场景”和“问答场景”双入口，并在 1 秒内进入对应功能页面。
FR5 [FR-VS-001]: 用户可通过文本输入或图片上传提交题目，OCR 失败时必须提供有效的应对或提示措施
FR6 [FR-VS-002]: 系统需将题目解析为结构化理解结果，提取题型、知识点与解题结构，并在无法理解时返回明确提示。
FR7 [FR-VS-003]: 系统需基于题目理解生成不少于 3 个有效分镜，每个分镜包含场景描述、讲解重点与旁白内容。
FR8 [FR-VS-004]: 系统需基于分镜生成可执行的 Manim 动画代码，并通过基础语法检查后进入渲染阶段。
FR9 [FR-VS-005]: 当渲染失败时，系统需自动执行有限次数的 Manim 代码修复，并在失败时给出清晰结果或可用降级结果。
FR10 [FR-VS-006]: 系统需在受限环境中执行 Manim 渲染，正确标记超时和异常状态，并向前端暴露阶段性进度。
FR11 [FR-VS-007]: 系统需根据讲解内容完成 TTS 合成，至少支持 2 个可切换 Provider，并在主 Provider 失败时自动切换。
FR12 [FR-VS-008]: 系统需将动画与音频合成为最终 MP4 视频并上传至 COS，上传失败时执行重试或降级策略。
FR13 [FR-VS-009]: 视频任务执行期间，前端需通过 SSE 实时接收关键阶段进度，并在短暂断线后恢复当前状态。
FR14 [FR-VP-001]: 用户可以播放已生成的视频，并支持暂停、继续与重播。
FR15 [FR-VP-002]: 用户可以切换常用播放倍速，并在播放器中看到当前倍速状态。
FR16 [FR-VP-003]: 用户可拖动进度条、查看当前时间与总时长，并切换全屏模式。
FR17 [FR-CS-001]: 用户输入主题后，系统需生成可展示的基础课堂内容，并在失败时返回可理解错误和重试能力。
FR18 [FR-CS-002]: 用户可在严肃、幽默、耐心、高效 4 种预设老师风格中进行选择，未选择时使用默认风格，但要捋清楚，这四个预设风格老师以后还会拓展，而不只是四个，所以他应该在功能页输入框中以下拉框的形式展开
FR19 [FR-CS-003]: 课堂生成结果需包含多张结构化幻灯片，每张包含标题与正文要点，前端支持顺序浏览。
FR20 [FR-CS-004]: 课堂结束后系统需生成 3-5 道基础测验题，用户提交后可看到对错与解析，并进入学习记录闭环。
FR21 [FR-CS-005]: 课堂中需支持多角色 Agent 讨论片段展示，并允许用户以学生身份参与输入和获得回应。
FR22 [FR-CS-006]: 课堂生成过程中前端需通过实时连接展示阶段描述与进度条，并在断线后恢复当前任务状态。
FR23 [FR-CS-007]: 课堂白板展示需避免主要内容严重重叠，确保关键元素可读可见，且复杂布局问题不阻断 MVP 主链路。
FR24 [FR-LR-001]: 视频或课堂任务完成后需自动写入历史记录，并支持按时间倒序展示和重新打开对应结果页。
FR25 [FR-LR-002]: 用户可收藏或取消收藏课堂与视频结果，并在结果页与个人中心查看收藏状态。
FR26 [FR-LR-003]: 用户可删除单条历史记录，删除前必须有确认提示，删除后列表即时更新。
FR27 [FR-UI-005]: 个人中心页面需展示基础资料、历史记录入口与设置入口。

### NonFunctional Requirements

NFR1 [NFR-PF-001]: 非生成类 API 响应时间必须满足 P95 < 200ms。
NFR2 [NFR-PF-002]: 视频生成端到端时延必须满足 P95 < 5 分钟。
NFR3 [NFR-PF-003]: 基础课堂生成端到端时延必须满足 P95 < 5 分钟。
NFR4 [NFR-PF-004]: 视频生成成功率必须大于 80%。
NFR5 [NFR-PF-005]: 基础课堂生成成功率必须大于 90%。
NFR6 [NFR-PF-006]: 系统在 MVP 阶段的可用性目标为不低于 99%。
NFR7 [NFR-PF-007]: 首屏加载时间 FCP 目标为小于 1.5 秒。
NFR8 [NFR-SE-001]: 所有外部访问必须通过 HTTPS 传输。
NFR9 [NFR-SE-002]: 鉴权体系必须与 RuoYi 保持一致。
NFR10 [NFR-SE-003]: 前后端都必须执行输入校验。
NFR11 [NFR-SE-004]: 富文本或 HTML 场景必须有明确的 XSS 消毒策略。
NFR12 [NFR-SE-005]: Manim 沙箱安全边界不得为成功率让步。
NFR13 [NFR-CO-001]: 方案必须符合学生数据隐私保护要求。
NFR14 [NFR-CO-002]: AI 生成内容必须提供必要标识。
NFR15 [NFR-AR-001]: 系统必须采用 FastAPI 功能服务与 RuoYi 长期业务宿主的双后端分层。
NFR16 [NFR-AR-002]: 长期业务数据必须进入 RuoYi/MySQL 或 COS。
NFR17 [NFR-AR-003]: Redis 仅用于运行态与事件缓存，且所有相关数据必须设置 TTL。
NFR18 [NFR-AR-004]: 视频与课堂模块允许共享基础设施，但业务实现必须保持独立。
NFR19 [NFR-AR-005]: Provider 接入必须具备可替换性与 Failover 能力。
NFR20 [NFR-AR-006]: 关键链路必须具备 request_id 与统一日志追踪能力。
NFR21 [NFR-AR-007]: 生产环境必须支持 Linux 容器化部署。
NFR22 [NFR-UX-001]: MVP 以桌面端为主，最小支持宽度为 1024px。
NFR23 [NFR-UX-002]: 浏览器支持需覆盖 Chrome、Edge、Firefox 主流版本。
NFR24 [NFR-UX-003]: 关键交互必须支持键盘操作，颜色对比不得明显违规。
NFR25 [NFR-UX-004]: 完整 WCAG AA 达标可后置到 Post-MVP。
NFR26 [NFR-UX-005]: 需预留 i18n 架构，MVP 默认中文，英文切换后置到 P2。
NFR27 [NFR-DEP-001]: 当 LLM 不可用时，系统必须自动切换备用 Provider；全部不可用时返回明确失败结果。
NFR28 [NFR-DEP-002]: 当 TTS 不可用时，系统必须自动切换备用 Provider；必要时返回降级或明确失败结果。
NFR29 [NFR-DEP-003]: 当 OCR 失败时，系统必须引导用户改为手动输入题目。
NFR30 [NFR-DEP-004]: 当 COS 上传失败时，系统必须执行重试或临时存储降级策略。
NFR31 [NFR-DEP-005]: 当 Redis 故障时，系统必须尽量退化到可接受的状态查询能力。

### Additional Requirements

- 架构已明确采用手动搭建的 greenfield 方案，而非通用 CRUD starter：FastAPI 使用 `Feature-Module + Protocol-DI` 模式，前端使用 `React 19 + Vite 6 + Shadcn/ui CLI v4 + Tailwind CSS v4`。
- FastAPI 只承担功能执行、AI 编排、异步任务协调、SSE 推送与外部 Provider 调用职责，不承担长期业务数据库主宿主角色。
- RuoYi 是用户、RBAC、审计、标准业务表与长期业务数据的主宿主，允许新增小麦业务表和 CRUD 模块，但不改动核心认证/权限机制。
- FastAPI 与 RuoYi 之间必须通过防腐层交互，避免 FastAPI 直接依赖 RuoYi 领域模型。
- 所有 FastAPI 路由统一前缀 `/api/v1`，长耗时功能统一建模为 `tasks` 资源，SSE 统一使用 `events` 子资源。
- FastAPI 响应格式必须与 RuoYi 对齐为 `{code, msg, data}`，时间格式与字段风格保持一致。
- 系统必须执行“运行态入 Redis、长期态入 RuoYi/MySQL、文件入 COS”的三层数据策略。
- Redis 只用于 Token 在线态、任务运行状态、SSE 事件缓存、短期会话上下文和 Provider 健康状态，且所有 Key 必须设置 TTL。
- 学习记录、收藏、课堂会话摘要、视频任务元数据、测验结果、问答日志等长期业务数据必须落到 RuoYi 业务表。
- 视频与课堂都必须接入统一任务框架，统一状态枚举、错误码、进度事件模型和断线恢复机制。
- Provider 层必须支持优先级、健康检查、Failover、超时、重试和缓存策略，覆盖 LLM、TTS 及腾讯云 ADP 相关能力。
- SSE 恢复必须依赖 Redis 中的运行时状态和事件缓存，而不是依赖数据库回放整个过程。
- Manim 渲染必须运行在受限沙箱中，遵守资源限制与安全策略，安全边界优先于渲染成功率。
- 生产环境应采用 Linux 容器化部署，Nginx 作为统一入口，承担 TLS 终结、静态资源分发和双后端反向代理。
- 系统必须具备跨前端、FastAPI、Worker、RuoYi 的统一日志追踪和 request_id 贯通能力。

### UX Design Requirements

UX-DR1 [P0]: 首页 `/` 必须采用桌面端双入口布局，在 3 秒内让用户理解“我想系统地学”和“我有道题不会”两种入口差异。
UX-DR2 [P0]: 首页双入口卡片必须支持悬停上浮、阴影增强、风格色边框与平滑过渡到目标输入页。
UX-DR3 [P0]: 首页需提供智能推荐提示区，能够基于用户历史或输入意图推荐更合适的入口。
UX-DR4 [P0]: 登录与注册入口在首页应以对话框方式打开，而不是强制页面跳转。
UX-DR5 [P0]: 问答输入页 `/video/input` 必须支持打字、拍照、粘贴 3 种输入方式，共用一个题目输入区域和一个明确的主 CTA。
UX-DR6 [P0]: 图片拍照和粘贴图片流程必须接入 OCR，识别结果应自动填充到输入框，而不是进入独立不可编辑流程。
UX-DR7 [P0]: AI 老师风格选择器必须作为输入区域的附属配置入口存在，默认以头像或胶囊触发器形式显示在输入框区域右上角或近输入框位置；用户点击后可展开选择当前会话使用的老师风格。
UX-DR8 [P0]: 展开后的老师风格面板必须支持显示当前可选风格列表；每个风格项至少包含头像、名称、选中态，并为后续扩展更多老师风格保留结构空间，不将交互结构固定为仅 4 张卡片。
UX-DR9 [P0]: 视频与课堂生成必须共用统一的任务进度页面组件，展示分阶段状态、百分比、当前阶段文案和预计剩余时间。
UX-DR10 [P0]: 前端必须将 `connected`、`progress`、`provider_switch`、`completed`、`failed`、`snapshot` 等 SSE 事件映射为明确 UI 反馈，包括 toast、自动跳转、错误提示和断线恢复。
UX-DR11 [P0]: 统一等待体验必须支持用户取消任务、断线重连恢复、超时提示、服务降级提示和“再试一次”操作。
UX-DR12 [P0]: 视频播放页 `/video/:id` 必须基于 Video.js 封装，支持播放/暂停、进度拖拽、倍速切换、全屏和截图笔记。
UX-DR13 [P0]: 视频结果页必须包含题目摘要、知识点摘要和“继续问 AI 老师”侧边交互区，支持用户在观看后继续追问。
UX-DR14 [P1]: 视频结果页需提供分享动作，包括复制链接、生成分享海报和微信分享二维码。
UX-DR15 [P0]: 设计系统必须基于 Shadcn/ui CLI v4 与 Tailwind CSS v4，优先建设 `Button`、`Input`、`Card`、`Progress`、`Avatar` 等核心组件。
UX-DR16 [P0]: 必须建立设计 token，包括品牌主色、4 种老师风格点缀色、成功/警告/错误语义色、间距、字体、玻璃材质和阴影规范。
UX-DR17 [P0]: Agent 风格差异必须通过 `AgentConfig` 数据和局部点缀色体现，只允许影响头像边框、标签、指示器等局部元素，禁止做页面级全局主题切换。
UX-DR18 [P0]: 交互动效必须遵循克制且流畅的原则，默认使用 `transition-all duration-300 ease-in-out`，并在需要时支持 `prefers-reduced-motion`。
UX-DR19 [P0]: MVP 必须以桌面端为主，最小支持宽度 1024px，并覆盖 Chrome/Edge/Firefox 主流浏览器；Safari 至少完成基础兼容性验证。
UX-DR20 [P0]: 关键交互必须满足基础无障碍要求，包括文本对比度达标、Tab 可导航、保留系统 outline、图标按钮具备 `aria-label`。
UX-DR21 [P0]: 课堂相关页面至少需要覆盖 `/classroom/input`、`/classroom/:id/generating` 和 `/classroom/:id` 三个核心路由，且课堂等待体验需复用统一任务进度模式。
UX-DR22 [P1]: 知识问答页 `/knowledge` 需支持课程选择器、流式对话、引用来源展示、相关知识点推荐与问答历史入口。
UX-DR23 [P1]: 课后小测页 `/quiz/:sessionId` 需支持单选答题、即时正确性反馈、解析展示、结果统计和“再来一次/返回课堂”操作。
UX-DR24 [P2]: 学习路径页 `/path` 需支持学习目标选择、周期选择、生成周计划、保存路径、调整计划和开始学习动作。
UX-DR25 [P1/P2]: 个人中心、历史记录、收藏管理与设置页需要与 RuoYi 数据模块对齐，并为后续补充完整页面规范预留壳层与导航。

### FR Coverage Map

FR1: Epic 1 - 用户注册、登录、登出基础接入闭环
FR2: Epic 1 - 前端、FastAPI、RuoYi 的鉴权一致性
FR3: Epic 6 - 个人资料查看与修改
FR4: Epic 1 - 首页双入口理解与进入
FR5: Epic 2 - 单题输入、OCR 补充路径与任务发起
FR6: Epic 2 - 题目理解与结构化解析
FR7: Epic 2 - 视频分镜生成
FR8: Epic 2 - Manim 代码生成
FR9: Epic 3 - 渲染失败自动修复与降级策略
FR10: Epic 2 - 受限环境中的基础渲染闭环
FR11（MVP 最小子集）: Epic 2 - 最小旁白生成以支撑可播放讲解视频闭环
FR11（可靠性增强部分）: Epic 3 - TTS 多 Provider、健康状态与 Failover
FR12: Epic 2 - 合成、上传与基础结果落地
FR13: Epic 3 - SSE 进度、断线恢复与过程透明化
FR14: Epic 2 - 基础视频播放
FR15: Epic 2 - 基础倍速播放
FR16: Epic 2 - 基础进度控制与全屏
FR17: Epic 4 - 主题输入到课堂生成闭环
FR18: Epic 1 - MVP 子集：默认风格、参数透传、基础选择能力
FR18: Epic 7 - 增强交互/可扩展形态：扩展式选择体验与后续风格扩展
FR19: Epic 4 - 幻灯片结构化展示与浏览
FR20: Epic 5 - 课堂测验闭环
FR21: Epic 7 - 多 Agent 互动增强
FR22: Epic 4 - 课堂生成过程中的实时进度反馈
FR23: Epic 4 - 白板基础布局可读性
FR24: Epic 5 - 视频/课堂结果的最小历史记录与回看闭环
FR25: Epic 6 - 收藏管理
FR26: Epic 6 - 删除记录
FR27: Epic 6 - 个人中心壳层与入口组织

## Epic List

### Epic 1: 用户接入、双入口与最小老师启动配置
用户可以登录进入平台，理解两条主入口，并在发起学习前完成老师风格的最小启动配置。
**Priority:** MVP / P0
**FRs covered:** FR1, FR2, FR4, FR18（MVP 子集）
**Key NFRs:** NFR-SE-002, NFR-AR-001, NFR-AR-003
**Key UX Drivers:** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR15, UX-DR16, UX-DR17, UX-DR18, UX-DR19, UX-DR20
**Completion Definition:** 本 Epic 只关闭老师风格的最小启动配置能力，包括默认风格、参数透传、基础选择能力；不关闭完整下拉展开、可扩展老师列表、增强预览体验。

### Epic 2: 单题视频生成与基础播放闭环
用户可以提交题目并获得一个可播放、可基本消费的讲解视频结果。
**Priority:** MVP / P0
**FRs covered:** FR5, FR6, FR7, FR8, FR10, FR11（MVP 子集）, FR12, FR14, FR15, FR16
**Key NFRs:** NFR-PF-002, NFR-AR-001, NFR-AR-002, NFR-SE-005
**Key UX Drivers:** UX-DR5, UX-DR6, UX-DR12, UX-DR13
**Completion Definition:** 本 Epic 包含单一 Provider 的最小旁白生成能力与最小播放器能力，以支撑可播放讲解视频闭环；不包含分享、截图笔记、继续追问后端能力等增强结果交互。

### Epic 3: 单题视频可靠性与过程透明化
用户可以更稳定、更可信地获得视频生成结果，并在执行过程中获得清晰反馈。
**Priority:** MVP / P0
**FRs covered:** FR9, FR11（可靠性增强部分）, FR13
**Key NFRs:** NFR-DEP-001, NFR-DEP-002, NFR-DEP-005, NFR-AR-005, NFR-AR-006
**Key UX Drivers:** UX-DR9, UX-DR10, UX-DR11
**Completion Definition:** 本 Epic 是 MVP 必要质量闭环，不是纯增强项；它关闭自动修复、TTS Failover、SSE 透明进度与恢复能力。

### Epic 4: 主题课堂生成与浏览闭环
用户可以输入主题，生成基础课堂内容，查看进度，并浏览课堂结果。
**Priority:** MVP / P0
**FRs covered:** FR17, FR19, FR22, FR23
**Key NFRs:** NFR-PF-003, NFR-AR-001, NFR-AR-004, NFR-UX-001
**Key UX Drivers:** UX-DR9, UX-DR19, UX-DR21
**Completion Definition:** 本 Epic 关闭“主题输入 → 课堂生成 → 幻灯片浏览 → 进度透明 → 基础可读布局”闭环，不包含测验与结果沉淀闭环。

### Epic 5: 学习沉淀与最小结果回看闭环
用户可以在课堂结束后完成最小测验，并对视频/课堂结果进行历史沉淀与重新打开。
**Priority:** MVP 最小子集 + P1 扩展
**FRs covered:** FR20, FR24
**Key NFRs:** NFR-AR-002, NFR-AR-006, NFR-UX-003
**Key UX Drivers:** UX-DR23, UX-DR25
**Internal Story Lanes:** 5A 课堂测验闭环；5B 视频/课堂最小历史记录闭环
**Completion Definition:** 最小历史记录闭环至少覆盖“任务完成后写入记录、列表展示、重新打开结果页”三项能力。

### Epic 6: 个人空间与结果整理
用户可以管理个人资料，并集中整理自己的学习成果。
**Priority:** P1
**FRs covered:** FR3, FR25, FR26, FR27
**Key NFRs:** NFR-AR-002, NFR-UX-003, NFR-CO-001
**Key UX Drivers:** UX-DR20, UX-DR25
**Completion Definition:** 个人资料与个人中心壳层可先落位；收藏、删除、集中结果管理依赖最小结果数据域成熟。

### Epic 7: 智能互动与扩展学习能力
用户可以获得更丰富的互动学习体验，系统也保留后续扩展能力域。
**Priority:** P2 / Post-MVP
**FRs covered:** FR21, FR18（增强交互/可扩展形态）
**Backlog Attached:** Knowledge QA、Video Sharing、Learning Path、更完整的 History / Favorites / Settings 扩展
**Key NFRs:** NFR-AR-005, NFR-UX-005
**Key UX Drivers:** UX-DR7, UX-DR8, UX-DR14, UX-DR22, UX-DR24
**Completion Definition:** 这是明确的“智能互动扩展域”，不再作为杂项池。

### Cross-Epic Platform Common Delivery Package
该交付包不是独立产品 Epic，但必须作为 Epic 1-4 的前置共性交付能力显式挂靠。
- 统一任务框架最小骨架
- Redis 在线态与运行态 Key 规范
- SSE Broker 最小能力
- Provider 基础接口与工厂骨架
- FastAPI 与 RuoYi 防腐层
- 统一 API 响应格式 `{code, msg, data}`
- `request_id` 与统一日志链路
- Nginx / 容器化接入骨架
**Execution Constraint:** 这些共性交付项必须以 Story / Enabler 形式挂靠到 Epic 1-4 中，不允许只停留在说明层而不进入排期。

### Natural Dependencies
- Epic 1 是用户入口基础。
- Epic 2 与 Epic 4 都依赖 Epic 1 和平台共性交付包。
- Epic 3 依赖 Epic 2，并关闭视频链路的 MVP 质量门槛。
- Epic 5 依赖 Epic 2 与 Epic 4 的结果产物域。
  视频结果沉淀依赖 Epic 2。
  课堂测验依赖 Epic 4。
- Epic 6 对 Epic 5 是部分依赖。
  个人资料与个人中心壳层可更早启动。
  收藏、删除、集中结果管理依赖 Epic 5 的最小结果数据域。
- Epic 7 是增强层，不阻塞 MVP。

## Epic 1: 用户接入、双入口与最小老师启动配置

用户可以登录进入平台，理解两条主入口，并在发起学习前完成老师风格的最小启动配置。

### Story 1.1: 统一认证入口中的注册与登录

As a 学生或教师，
I want 通过统一认证入口完成注册和登录，
So that 我可以快速进入小麦平台开始学习。

**Acceptance Criteria:**

**Given** 访客位于首页并打开认证入口
**When** 访客提交有效注册信息
**Then** 系统通过 RuoYi 承接的认证流程完成账户创建
**And** 在不强制跳转到无关页面的前提下返回清晰成功反馈

**Given** 已注册用户打开认证入口
**When** 用户提交有效登录凭证
**Then** 系统完成登录并返回已认证的首页上下文
**And** 为后续受保护访问建立可复用的认证会话

### Story 1.2: 登出与认证态清理

As a 已登录用户，
I want 在主动退出时立即清理当前认证态，
So that 我离开设备后不会留下可继续访问受保护资源的会话。

**Acceptance Criteria:**

**Given** 已登录用户正在使用平台
**When** 用户主动执行登出
**Then** 本地认证态立即被清除
**And** 后续受保护访问必须重新登录

**Given** 用户已经登出
**When** 其再次访问受保护页面或接口
**Then** 系统不再把旧 Token 视为有效
**And** 页面会回到未认证可恢复状态

### Story 1.3: 双后端鉴权一致性与受保护页面拦截

As a 已认证用户，
I want 前端、FastAPI 和 RuoYi 对我的登录态保持一致判断，
So that 受保护页面和接口的行为始终一致且可预期。

**Acceptance Criteria:**

**Given** 用户已通过统一认证流程获得有效 Token 且 Redis 在线态存在对应记录
**When** 用户访问受保护前端路由或受保护的 FastAPI / RuoYi 接口
**Then** 前端、FastAPI 和 RuoYi 对该登录态给出一致判断
**And** 用户不会遭遇前后端鉴权状态不一致的异常体验

**Given** Token 已失效、非法或被撤销
**When** 用户访问任一受保护路由或受保护接口
**Then** 系统返回一致的未授权结果
**And** 受保护接口统一返回 `401`，而不是混杂的状态码或行为

**Given** 前端收到受保护请求的未授权响应
**When** 响应被统一处理
**Then** 用户被一致地重定向或提示重新登录
**And** 不暴露敏感账户信息

**Given** 鉴权校验因服务异常或网络异常无法正常完成
**When** 系统无法完成受保护访问检查
**Then** 用户看到可恢复的错误提示或重新登录提示
**And** 应用不得进入无限跳转或死循环状态

### Story 1.4: 首页双入口与非阻塞智能推荐提示

As a 首次或回访用户，
I want 首页清楚解释两种学习模式并在可用时给出推荐，
So that 我可以几乎不犹豫地开始正确的学习流程。

**Acceptance Criteria:**

**Given** 用户打开首页
**When** 页面加载完成
**Then** 系统展示“系统学习”和“单题讲解”两个清晰区分的主入口
**And** 每个入口都包含简短说明和明确的行动按钮

**Given** 系统具备历史记录或当前意图等推荐上下文
**When** 推荐逻辑可用
**Then** 首页展示轻量的入口推荐提示
**And** 用户仍可手动选择任一入口而不被强制限制

**Given** 推荐上下文缺失或推荐逻辑失败
**When** 首页继续渲染
**Then** 首页在没有推荐提示的情况下仍然完全可用
**And** 双入口的基础可用性不受阻塞

**Given** 未登录用户希望从首页进入认证流程
**When** 用户点击登录或注册
**Then** 认证界面以对话框方式打开而不是强制整页跳转
**And** 认证成功后用户回到原首页上下文

### Story 1.5: 核心输入壳层中的老师风格最小启动配置

As a 准备发起学习会话的用户，
I want 在核心输入框附近通过会话配置入口选择老师风格，
So that 当前会话可以带着我期望的老师语气和人格启动。

**Implementation Note:** 老师风格选择器属于输入页内部状态，不要求在前端路由层面新增独立的 style 页面；现有线框中的 style / style-select 资产应按输入页展开态理解。该配置入口是视频输入页和课堂输入页共享的局部交互模式，不单独承载独立页面职责。

**Acceptance Criteria:**

**Given** 用户进入视频或课堂发起流程的 MVP input shell，且该 input shell 至少包含核心输入框、基础输入方式、主 CTA 以及会话配置入口位置约束
**When** 输入区域被渲染
**Then** 当前老师风格以头像或胶囊触发器形式显示在核心输入框右上角或近输入框位置
**And** 默认风格在用户未改动时已被预选且可见

**Given** 用户点击老师风格触发器
**When** 会话配置面板展开
**Then** 面板展示当前可选老师风格列表，并且每个风格项至少包含头像、名称和选中态
**And** 组件结构支持未来扩展超过 4 种老师风格，而不是固定为页面中心的 4 张卡片

**Given** 用户选择某个老师风格并发起会话
**When** 系统创建请求载荷
**Then** 被选中的风格作为当前会话配置被保存并向下游生成链路透传
**And** 该选择只影响老师相关内容行为与局部 teacher indicators，而不会切换全局页面主题

### Story 1.6: 首页与输入流程的设计系统基础与可访问性基线

As a 首次进入平台的用户，
I want 首页与输入流程使用一致、清晰、可键盘操作的基础组件，
So that 我能在桌面端快速理解并完成核心操作而不被界面阻碍。

**Type:** Enabler

**Acceptance Criteria:**

**Given** 首页与视频/课堂输入壳层开始实现
**When** 设计系统基础被建立
**Then** `Button`、`Input`、`Card`、`Progress`、`Avatar` 等首批组件基于 `Shadcn/ui CLI v4 + Tailwind CSS v4` 可复用
**And** 品牌主色、老师点缀色、语义色、间距、字体、玻璃材质和阴影等 design tokens 被定义并落到首页与输入流程

**Given** 用户通过键盘或辅助技术操作首页与输入页
**When** 焦点在关键交互之间切换
**Then** 可见焦点样式、`aria-label`、基础对比度与系统 outline 保持可用
**And** 动效遵循克制原则并支持 `prefers-reduced-motion`

**Given** MVP 以桌面端为主
**When** 页面在 `1024px+` 的 Chrome、Edge、Firefox 以及基础 Safari 环境中渲染
**Then** 首页与输入壳层布局保持稳定
**And** 老师风格只影响局部点缀而不会触发页面级全局主题切换

## Epic 2: 单题视频生成与基础播放闭环

用户可以提交题目并获得一个可播放、可基本消费的讲解视频结果。

### Story 2.1: 多模态题目输入与视频任务创建

As a 想快速搞懂一道题的用户，
I want 用文本、上传图片或粘贴图片创建视频任务，
So that 我能以最低操作成本发起讲解视频生成。

**Acceptance Criteria:**

**Given** 用户位于 `/video/input`
**When** 用户输入文本、上传 `JPG/PNG` 图片或直接粘贴图片
**Then** 三种输入方式共用同一个题目输入区域和一个明确的主 CTA
**And** 若为图片输入，OCR 结果会自动回填到可编辑输入框而不是进入独立不可编辑流程

**Given** OCR 失败或识别质量不足
**When** 系统无法可靠提取题目
**Then** 用户会收到明确的手动补充或改为文本输入提示
**And** 不会陷入无法继续的死路流程

**Given** 用户已提供有效题目并确认当前会话配置
**When** 用户提交视频生成请求
**Then** 系统通过统一的 `/api/v1/video/tasks` 资源创建任务并返回 `{code, msg, data}`
**And** 最小运行态会被写入可恢复的运行态记录，并遵循 Redis TTL 约束以支撑后续进度恢复

### Story 2.2: 题目理解与分镜规划生成

As a 提交了题目的用户，
I want 系统先正确理解题目并规划讲解分镜，
So that 最终视频真正围绕我的问题展开。

**Acceptance Criteria:**

**Given** 视频任务已被创建
**When** 系统执行题目理解阶段
**Then** 系统能够提取题型、知识点和解题结构等结构化结果
**And** 这些结果可直接供后续分镜与代码生成阶段复用

**Given** 题目理解成功
**When** 系统生成分镜计划
**Then** 至少生成 `3` 个有效分镜，且每个分镜包含场景描述、讲解重点与旁白内容
**And** 分镜节奏会与题目复杂度相匹配，而不是固定长度硬编码

**Given** 输入题目不完整或难以理解
**When** 理解阶段无法得到可用结果
**Then** 系统返回可恢复的补充提示而不是原始异常
**And** 用户可以据此修正输入后重新发起任务

### Story 2.3: Manim 动画代码生成与基础语法校验

As a 等待讲解结果的用户，
I want 系统先把分镜转成结构正确的 Manim 动画代码，
So that 后续渲染阶段有稳定可执行的输入。

**Acceptance Criteria:**

**Given** 分镜计划已生成
**When** 系统执行 Manim 代码生成阶段
**Then** 输出代码通过基础语法校验且包含完整可执行场景定义
**And** 阶段状态会被写入统一任务状态与日志链路

**Given** 分镜内容与题目理解结果存在不一致风险
**When** 代码生成完成
**Then** 生成结果仍需保持与题目目标和分镜语义一致
**And** 不允许用空场景或占位代码通过“形式校验”

**Given** 代码生成阶段失败
**When** 系统无法得到可进入渲染的输出
**Then** 任务状态会被明确标记为该阶段失败
**And** 不会错误进入后续渲染流程

### Story 2.4: 受限渲染执行与最小状态落位

As a 等待讲解结果的用户，
I want 系统在安全环境中执行渲染并正确落位当前任务状态，
So that 我能获得后续可合成的视频素材且知道任务没有卡死。

**Acceptance Criteria:**

**Given** 代码生成阶段已经成功
**When** 系统执行渲染阶段
**Then** Manim 会在受限沙箱环境中运行，并遵守资源和安全限制
**And** 成功时产出可继续进入后续处理的视频素材

**Given** 渲染处于进行中
**When** 任务状态被更新
**Then** 当前阶段、进度和异常信息会被写入统一任务状态模型
**And** 相关运行态只写入带 TTL 的 Redis，而不是直接承担长期存储

**Given** 渲染超时或执行异常
**When** 当前渲染阶段结束
**Then** 任务状态会被显式标记为失败或异常阶段
**And** 不允许任务以“运行中”状态无限悬挂

### Story 2.5: 最小旁白生成、音视频合成与 COS 上传

As a 等待最终成片的用户，
I want 系统生成最小旁白、完成音视频合成并返回可访问结果，
So that 我可以直接打开最终讲解视频。

**Acceptance Criteria:**

**Given** 渲染输出和讲解旁白文本都已准备完成
**When** 系统使用单一可用 Provider 执行最小旁白生成
**Then** 当前任务获得基础可用的讲解音频
**And** 此 Story 不要求实现多 Provider 健康探测与 Failover

**Given** 最小旁白音频已生成
**When** 系统执行 FFmpeg 合成
**Then** 产出可播放的 `MP4` 文件
**And** 只创建本次结果所需的最小任务元数据字段，而不是提前铺设无关长期实体

**Given** 合成成功
**When** 系统执行 COS 上传
**Then** 系统返回可访问的视频 URL 和必要结果元数据
**And** 最终响应仍遵循统一的 `{code, msg, data}` 结构

**Given** 上传失败
**When** COS 无法立即接收文件
**Then** 系统会执行重试或声明式降级路径
**And** 不会把实际失败误报为成功完成

### Story 2.6: 基础视频结果页、播放器与追问入口壳层

As a 获得视频结果的用户，
I want 在结果页直接播放、控制和继续消费讲解内容，
So that 我可以立刻完成复习而不用跳到其他工具。

**Acceptance Criteria:**

**Given** 用户从生成完成页或历史记录进入 `/video/:id`
**When** 页面加载成功
**Then** 页面展示题目摘要、知识点摘要以及基于 `Video.js` 封装的播放器
**And** 用户无需额外跳转即可开始观看

**Given** 用户正在播放视频
**When** 用户暂停、继续、倍速切换、拖动进度条或进入全屏
**Then** 这些控制会立即生效并且当前倍速/时间状态可见
**And** 视频播放结束后仍支持重新播放

**Given** 用户观看结果页
**When** 页面展示辅助交互区域
**Then** 页面可见“继续问 AI 老师”的侧边交互区或入口壳层，为后续知识问答能力预留位置
**And** 本 Story 只要求实现入口壳层和交互占位，不要求在此处完成完整追问后端能力

## Epic 3: 单题视频可靠性与过程透明化

用户可以更稳定、更可信地获得视频生成结果，并在执行过程中获得清晰反馈。

### Story 3.1: 统一长任务进度页与事件映射

As a 正在等待生成结果的用户，
I want 系统提供一套统一的长任务进度交互模型并准确反馈事件，
So that 当前视频任务透明可恢复，且后续课堂任务可以直接复用同一模型。

**Implementation Note:** 实施时应拆成 `3.1A 等待页组件`、`3.1B SSE 事件映射`、`3.1C 恢复与状态查询回退` 三个子任务，但仍作为同一 Story 交付。

**Acceptance Criteria:**

**Given** 视频任务被创建并进入生成中的等待页
**When** 用户查看当前任务进度
**Then** 页面使用统一进度组件展示阶段列表、百分比、当前文案和预计剩余时间
**And** 展示文案对用户可理解，而不是只有底层技术术语

**Given** 前端收到 `connected`、`progress`、`provider_switch`、`completed`、`failed`、`snapshot` 等 SSE 事件
**When** 事件被消费
**Then** UI 会把它们映射成明确的进度反馈、toast、跳转、失败提示和恢复行为
**And** `completed` 与 `failed` 事件都会导向确定性的下一步动作

**Given** 用户刷新页面、临时断网或后续课堂流程需要接入同一等待模型
**When** 客户端尝试恢复任务状态或新流程复用该组件契约
**Then** 系统优先通过快照与运行态恢复当前任务进度，必要时回退到状态查询
**And** 该统一模型可以在不重做交互结构的前提下被课堂等待页复用

### Story 3.2: Manim 自动修复与可用结果降级

As a 依赖视频结果的用户，
I want 在渲染失败后系统自动尝试修复并尽量返回可用结果，
So that 我不用因为一次渲染错误就完全失去学习结果。

**Acceptance Criteria:**

**Given** 首次渲染失败并产出结构化错误日志
**When** 自动修复策略被触发
**Then** 系统会在预设上限内执行针对性的 Manim 修复与重渲染
**And** 每次修复尝试都以明确的阶段事件对外可见

**Given** 所有修复尝试都失败
**When** 系统评估当前可返回产物
**Then** 若存在可接受的降级结果则优先返回可用结果
**And** 若不存在可用结果则返回清晰的最终失败状态而不是沉默超时

**Given** 修复或降级流程结束
**When** 任务元数据需要持久化
**Then** 最终状态、失败原因和是否为降级结果会被准确保存
**And** `request_id` 能关联渲染、修复和完成日志

### Story 3.3: 多 TTS Provider、健康状态与 Failover

As a 依赖讲解音频的用户，
I want 系统在主语音服务不可用时自动切换到备选 Provider，
So that 视频不会因为单个 TTS 服务故障而中断。

**Acceptance Criteria:**

**Given** 旁白文本已准备完成且主 Provider 健康
**When** 系统执行 TTS 合成
**Then** 当前主 Provider 正常完成音频输出
**And** 本次 Provider 选择会被写入任务上下文与日志

**Given** 主 Provider 超时、报错或触发限流
**When** Failover 策略运行
**Then** 系统会自动切换到备选 Provider 而不要求用户重新提交任务
**And** Provider 切换会同步反映到进度事件和统一日志链路中

**Given** 所有配置的 TTS Provider 都不可用
**When** 音频无法成功生成
**Then** 系统返回清晰的降级或失败状态并提供可理解原因
**And** 不会通过隐藏式兜底破坏安全、合规或质量边界

## Epic 4: 主题课堂生成与浏览闭环

用户可以输入主题，生成基础课堂内容，查看进度，并浏览课堂结果。

### Story 4.1: 主题输入与课堂任务启动

As a 想系统学习一个主题的用户，
I want 在课堂入口提交主题并启动课堂任务，
So that 我能快速获得围绕该主题的一套基础教学内容。

**Acceptance Criteria:**

**Given** 用户位于 `/classroom/input`
**When** 用户输入主题并确认当前会话配置
**Then** 系统通过统一任务资源模型创建课堂任务
**And** 返回的响应遵循 `{code, msg, data}` 结构且最小运行态会被写入可恢复的运行态记录，并遵循 Redis TTL 约束

**Given** 主题为空或过于模糊
**When** 用户尝试提交
**Then** 系统阻止无效任务创建并给出清晰的补充提示
**And** 不会创建没有实际学习价值的长任务

**Given** 课堂任务创建成功
**When** 前端进行路由跳转
**Then** 课堂流程覆盖 `/classroom/input`、`/classroom/:id/generating` 和 `/classroom/:id`
**And** 用户可以在后续从固定结果页继续回访课堂内容

### Story 4.2: 主题到结构化课堂内容与幻灯片生成

As a 正在学习主题的用户，
I want 系统把主题生成成结构化课堂与多张幻灯片，
So that 我能按教学顺序理解核心概念而不是只看到一段散文式文本。

**Acceptance Criteria:**

**Given** 课堂任务已进入生成阶段
**When** 系统执行课堂内容生成链路
**Then** 生成结果可被渲染为多张有序幻灯片
**And** 每张幻灯片至少包含标题和正文要点

**Given** 课堂内容生成成功
**When** 结果被返回到前端
**Then** 幻灯片数据结构足够稳定以支撑顺序浏览与后续课堂组件复用
**And** 失败时返回可理解错误与重试路径

**Given** 不同主题的复杂度不同
**When** 系统规划课堂深度
**Then** 输出内容会保持在 MVP 可消费范围内
**And** 只创建本次课堂结果所需的最小会话实体和业务数据

### Story 4.3: 课堂生成等待页与进度恢复

As a 正在等待课堂结果的用户，
I want 看到课堂生成的实时进度并在断线后恢复状态，
So that 我不会在等待中失去信心或上下文。

**Implementation Note:** 本 Story 复用 Epic 3 已定义的统一等待体验契约，不重复定义第二套事件交互模型。

**Acceptance Criteria:**

**Given** 课堂任务处于进行中
**When** 用户停留在 `/classroom/:id/generating`
**Then** 页面复用统一任务进度模式展示当前阶段、进度条、剩余时间和重试/取消动作
**And** 等待体验与视频任务保持同一套交互语言

**Given** SSE 连接短暂中断
**When** 客户端重连或回退到状态查询
**Then** 当前课堂任务状态能够恢复
**And** 用户不会因为一次刷新而丢失当前任务上下文

**Given** 课堂任务完成
**When** 最终完成事件到达
**Then** 系统把用户导航到 `/classroom/:id`
**And** 当前完成状态也可通过一致的状态接口再次查询

### Story 4.4: 课堂结果浏览与白板基础可读性

As a 查看课堂结果的用户，
I want 顺序浏览幻灯片并确保白板内容保持可读，
So that 我能稳定完成一次主题学习而不被布局问题打断。

**Acceptance Criteria:**

**Given** 用户打开 `/classroom/:id`
**When** 课堂结果加载成功
**Then** 幻灯片支持顺序浏览并显示当前所在位置
**And** 主学习内容始终保持视觉焦点

**Given** 白板区域需要同时展示多个元素
**When** 布局引擎安排内容位置
**Then** 主要内容不会出现严重重叠且关键元素保持清晰可读
**And** 复杂布局边缘情况可以优雅降级而不阻断核心课堂体验

**Given** 页面在桌面端主支持浏览器上渲染
**When** 用户通过鼠标或键盘进行切换浏览
**Then** 导航与阅读操作保持稳定
**And** 关键浏览动作满足基础键盘可达性要求

## Epic 5: 学习沉淀与最小结果回看闭环

用户可以在课堂结束后完成最小测验，并对视频/课堂结果进行历史沉淀与重新打开。

### Story 5.1: 课堂课后小测生成与即时反馈

As a 刚完成课堂学习的用户，
I want 立刻完成一组小测并看到解析，
So that 我能确认自己是否真正掌握了这节内容。

**Acceptance Criteria:**

**Given** 课堂结果已经生成完成
**When** 系统自动触发或用户手动进入课后小测
**Then** 系统生成 `3-5` 道与本次课堂主题相关的测验题
**And** 只创建当前课堂会话所需的最小测验结果实体

**Given** 用户提交某一道题的答案
**When** 系统完成判定
**Then** 当前题目立即显示正确/错误状态和解析内容
**And** 用户可以继续完成后续题目而不必离开测验流

**Given** 小测完成
**When** 结果页展示总结
**Then** 用户能看到正确率、完成摘要以及“再来一次/返回课堂”等动作
**And** 本次测验结果可以被关联到学习记录闭环

### Story 5.2: 视频与课堂结果自动沉淀为历史记录

As a 回访用户，
I want 已完成的视频和课堂自动进入历史记录，
So that 我之后可以重新找到之前学过的内容。

**Acceptance Criteria:**

**Given** 视频或课堂任务进入完成状态
**When** 完成处理器写入长期数据
**Then** 最小结果元数据会被持久化到 RuoYi/MySQL 或 COS 关联业务记录中
**And** 不会把仅存在 Redis 的运行态误当作可长期回看的历史记录

**Given** 用户进入历史记录列表
**When** 系统查询记录
**Then** 视频和课堂结果按时间倒序展示并清晰区分类型
**And** 列表展示不依赖原始任务仍然存在于 Redis

**Given** 持久化发生部分失败
**When** 完成处理链路结束
**Then** 系统返回清晰的告警或失败处理结果
**And** `request_id` 能用于追踪本次结果沉淀失败原因

### Story 5.3: 从历史记录重新打开结果页

As a 想继续复习旧内容的用户，
I want 从历史记录直接重新打开结果页，
So that 我不用重新生成也能继续学习。

**Acceptance Criteria:**

**Given** 用户看到一条有效历史记录
**When** 用户点击该记录
**Then** 系统会跳转到对应的视频结果页或课堂结果页
**And** 不会重复触发原始生成任务

**Given** 关联资源已不可用或被归档
**When** 用户尝试重新打开
**Then** 系统显示明确的不可用说明和下一步建议
**And** 不会把损坏链接误显示为成功打开

**Given** 历史列表包含视频和课堂混合内容
**When** 用户在不同记录间切换
**Then** 各类结果的重新打开行为保持一致
**And** 路由参数与个人中心入口保持兼容

## Epic 6: 个人空间与结果整理

用户可以管理个人资料，并集中整理自己的学习成果。

### Story 6.1: 个人中心壳层、导航与结果管理入口

As a 已登录用户，
I want 在个人中心集中看到资料、历史、收藏和设置入口，
So that 我能把学习成果和个人信息放在一个稳定位置管理。

**Acceptance Criteria:**

**Given** 用户进入个人中心
**When** 页面加载完成
**Then** 页面展示基础资料摘要和历史、收藏、设置等导航入口
**And** 整体壳层结构与后续 RuoYi 数据模块保持对齐

**Given** 某些数据子模块尚未完全上线
**When** 个人中心渲染
**Then** 壳层和导航仍保持可用，并通过空状态或禁用态说明当前能力
**And** 不暴露点击后无响应的死路入口

**Given** 用户在桌面端浏览器中使用个人中心
**When** 页面展示多类入口与摘要卡片
**Then** 键盘焦点、空状态和主要动作保持可访问
**And** 页面壳层可以承载后续设置扩展而不需要重做整体结构

### Story 6.2: 个人资料查看与修改

As a 已登录用户，
I want 查看并修改自己的基础资料，
So that 我的昵称、头像和学校信息能保持最新。

**Acceptance Criteria:**

**Given** 用户打开资料详情区域
**When** 当前资料被成功查询
**Then** 页面展示昵称、头像、学校等允许编辑的基础字段
**And** 加载态和空值场景都有清晰反馈

**Given** 用户修改昵称或上传新头像
**When** 输入合法且保存成功
**Then** 更新后的资料会被持久化并立刻反映到 UI
**And** 非法格式或超限上传会被阻止并给出明确原因

**Given** 资料保存或头像上传失败
**When** 后端返回错误
**Then** 页面尽量保留用户当前编辑上下文
**And** 不暴露内部敏感错误细节

### Story 6.3: 收藏与取消收藏课堂/视频结果

As a 想沉淀重点内容的用户，
I want 收藏或取消收藏结果，
So that 我可以快速回到最值得反复学习的内容。

**Acceptance Criteria:**

**Given** 用户位于视频或课堂结果页
**When** 用户切换收藏状态
**Then** 收藏或取消收藏动作在当前结果页内完成
**And** 成功后可见状态立即更新

**Given** 用户进入个人中心的收藏视图
**When** 系统加载收藏数据
**Then** 课堂和视频收藏可以在同一位置查看
**And** 没有收藏时会显示清晰空状态

**Given** 收藏持久化失败
**When** 操作无法完成
**Then** UI 会回滚乐观状态或提示失败
**And** 不会保留表面成功、实际失败的不一致收藏状态

### Story 6.4: 历史记录删除与即时列表更新

As a 想整理学习空间的用户，
I want 删除不再需要的历史记录，
So that 我的历史列表保持清晰。

**Implementation Note:** 删除规则明确为“只删除历史展示关系/历史记录条目，不物理删除底层视频或课堂结果资源，也不自动取消已有收藏；若同一结果仍被收藏，可通过收藏入口继续访问”。 

**Acceptance Criteria:**

**Given** 用户正在查看历史记录列表
**When** 用户点击删除某条记录
**Then** 系统会先展示明确的确认提示
**And** 用户取消时列表保持原样

**Given** 用户确认删除
**When** 后端删除成功
**Then** 目标记录会从列表中即时移除而不需要整页刷新
**And** 该删除仅移除历史展示关系，不物理删除底层结果资源且不自动取消已有收藏

**Given** 删除请求失败
**When** 后端返回错误
**Then** 用户看到明确失败反馈且原记录仍然保留
**And** 不会错误展示删除成功提示

## Epic 7: 智能互动与扩展学习能力

用户可以获得更丰富的互动学习体验，系统也保留后续扩展能力域。

### Story 7.1: 可扩展老师风格下拉与会话配置增强

As a 想找到更适合自己老师风格的用户，
I want 在输入框附近通过可扩展下拉面板选择和预览老师风格，
So that 当前会话能匹配我的学习偏好且后续可以扩展更多老师。

**Acceptance Criteria:**

**Given** 用户在视频或课堂输入页打开老师风格选择器
**When** 下拉面板展开
**Then** 当前风格、其他可选风格、头像、名称、描述和选中态都清晰可见
**And** 组件结构不是只为当前 4 位老师硬编码的固定中心卡片布局

**Given** 平台后续增加更多老师风格
**When** 风格配置注册表被扩展
**Then** 选择器可以无须页面级重构就渲染新增选项
**And** 默认风格与回退行为保持可预测

**Given** 用户预览或切换老师风格
**When** 用户确认当前选择
**Then** 当前会话配置会立即更新
**And** 变化只影响老师相关局部信息而不会切换页面级全局主题

### Story 7.2: 课堂中的多 Agent 讨论片段与用户追问

As a 希望从不同角度理解主题的学生，
I want 在课堂中看到多角色讨论并能插入自己的问题，
So that 我获得比单一讲解更丰富的理解路径。

**Acceptance Criteria:**

**Given** 当前课堂会话启用了多 Agent 模式
**When** 讨论片段被渲染
**Then** 至少两个有明确身份标识的角色按可控顺序发言
**And** 每一轮内容都能被归属到具体角色而不是匿名文本块

**Given** 用户在讨论过程中插入追问
**When** 系统接收该输入
**Then** 用户能获得被整合进当前讨论流的回应
**And** 主课堂叙事不会因此被彻底打断

**Given** 多 Agent 编排无法继续
**When** 系统执行降级
**Then** 课堂会回退到单老师继续讲解并给出清晰说明
**And** 主学习流程仍保持可用

### Story 7.3: 知识问答页与引用来源展示

As a 还想继续深挖知识点的用户，
I want 在独立知识问答页获得带来源的流式回答，
So that 我可以在课堂或视频之外继续提问并追踪依据。

**Acceptance Criteria:**

**Given** 用户进入 `/knowledge`
**When** 页面加载完成
**Then** 页面提供课程选择器、问题输入区、历史入口和回答面板
**And** 整体布局遵循现有桌面端设计系统

**Given** 用户提交知识问题
**When** 后端流式返回答案
**Then** UI 逐步展示回答内容、引用来源和相关知识点推荐
**And** 点击推荐项可以直接作为下一次问题的输入种子

**Given** 用户再次访问知识问答页
**When** 历史数据可用
**Then** 过往问答可从历史入口中再次查看
**And** 没有历史时会显示空状态而不是异常页面

### Story 7.4: 视频结果分享动作

As a 对生成结果感到满意的用户，
I want 快速分享视频结果，
So that 我可以把学习成果发给同学、老师或社交平台。

**Acceptance Criteria:**

**Given** 用户位于可分享的视频结果页
**When** 分享功能可用
**Then** 页面提供复制链接、生成分享海报和二维码等分享动作
**And** 这些动作不会干扰基础播放器使用

**Given** 当前结果不满足分享条件
**When** 用户尝试发起分享
**Then** 系统会明确说明不可分享原因并阻止无效分享
**And** 不会生成损坏海报或失效链接

**Given** 用户完成某个分享动作
**When** 分享生成成功
**Then** 用户收到明确成功反馈
**And** 生成出的分享内容与当前视频元数据保持一致

### Story 7.5: 学习路径规划

As a 想进行长期提升的用户，
I want 根据目标和周期生成学习路径，
So that 我可以把单次学习扩展成阶段性计划。

**Acceptance Criteria:**

**Given** 用户进入 `/path` 并填写目标主题与学习周期
**When** 发起学习路径规划请求
**Then** 系统生成按周组织的学习路径、阶段目标和开始学习动作
**And** 规划结果支持保存、再次打开和继续执行

**Given** 用户想要调整既有计划
**When** 进入调整模式
**Then** 用户可以修改目标或周期而不需要完全重走页面流程
**And** 上一个版本的计划不会被静默覆盖消失

**Given** 学习路径服务不可用
**When** 规划请求失败
**Then** 页面返回可理解的失败提示并提供重试动作
**And** 既有已保存路径仍然可以被查看
