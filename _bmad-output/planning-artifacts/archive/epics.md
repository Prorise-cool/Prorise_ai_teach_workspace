# 小麦 - Epic Breakdown（并行开发重构稿）
## Overview
本文档用于重构小麦项目的 Epic / Story 拆解。  
本版不再沿用“后端 Phase A 做完后，前端 Phase B 再接”的拆法，而是统一改为“用户价值域 Epic + 底座独立 + 契约先行 + mock 先行 + 双端并行”的实施模型。  
在本版结构中，所有“底座型能力”必须先从业务 Epic 中拆离，独立形成基础 Epic，包括统一任务框架、SSE、Provider 抽象、Redis 运行态、RuoYi 防腐层、长期数据承接与日志追踪。  
在本版结构中，后端 Story 的完成定义以稳定 API 契约、错误码、状态枚举、示例 payload、OpenAPI / schema、SSE 事件语义、恢复语义与接口测试为边界；前端 Story 的完成定义以 mock 数据、mock handler、页面状态闭环、adapter 隔离、空态/错态/权限态覆盖为边界。  
正式联调、合并与发布仍然受“高保真视觉稿、关键状态、交互说明、稳定接口契约”四项门禁约束，但这些门禁不再被写成前端等待后端落地的开发阻塞依赖。  
本稿的核心目标不是“把功能分组”，而是“把依赖拆开”，确保 1-2 人团队在 5 周周期下依然可以真实并行、稳定联调、低返工推进。  
本稿相较旧稿做出以下关键重构：
- 新增 `Epic 0`：工程底座与并行开发轨道。
- 新增 `Epic 2`：统一任务框架、SSE 与 Provider 基础设施。
- 新增 `Epic 10`：RuoYi 持久化承接、业务表与防腐层。
- 将原“单题视频学习闭环”拆为“输入创建”和“执行消费”两个相对独立的业务域。
- 将原“课堂学习闭环”保留为独立业务域，但显式依赖底座能力与持久化承接。
- 将 `Companion`、`Evidence / Retrieval`、`Learning Coach`、`Learning Center` 之间的依赖显式化，不再隐性耦合。
- 所有 Epic 增加 `Parallel Delivery Rule`、`Entry Criteria`、`Exit Criteria`、`Dependencies`、`Out of Scope`。
- 所有 Story 增加更严格的 AC，避免出现无法测试、无法联调、无法验收的描述性故事。

## Document Usage Rule
- 本文档是 **Epic / Story 规划文档**，不是实现代码文档。  
- 本文档中的 Story 默认采用“前端 Story / 后端 Story / 持久化 Story / 集成 Story”拆法。  
- 任一 Story 如果涉及跨后端、跨运行态与长期态、跨业务域 schema，必须优先拆出“契约 Story”。  
- 任一 Story 如果依赖另一个 Story 的接口或 schema，但其页面仍可基于 mock 推进，则必须明确写出 adapter 边界，而不能用“等待后端完成”作为前置阻塞。  
- 任一 Story 的 AC 必须能直接用于：手工验收、接口测试、页面状态检查或联调检查。  
- 任一 Story 不得同时承载“底座能力 + 单业务链 + 持久化 + 管理端 + 体验端”的五层内容。  
- 本文档默认按实施优先级阅读：`Epic 0 -> Epic 1 -> Epic 2 -> Epic 10 -> 业务 Epic`。  

## Design Goals of This Breakdown
### G-01: 真实并行，而不是口头并行
所有前端正式页面都必须能在真实接口未就绪前，通过稳定契约与 mock 数据推进到高保真状态。  
所有后端能力都必须能在前端未接入前，通过契约、schema、测试与示例 payload 完成独立交付。  

### G-02: 底座独立，避免大 Epic 吞噬基础设施
统一任务框架、SSE、Provider、持久化承接不再作为业务 Epic 的隐藏子任务。  
这些能力必须单独排期、单独验收、单独联调。  

### G-03: Story 粒度均匀
每个 Story 只交付一个可识别成果：
- 一个稳定契约，
- 一个可运行页面壳层，
- 一个可测试接口，
- 一个持久化回写机制，
- 或一个可复用的基础设施能力。  

### G-04: 依赖显式化
所有跨域依赖必须写明，不允许把“默认会有”当成规划前提。  
尤其要显式声明：
- `Companion` 依赖 `SessionArtifactGraph`；
- `Learning Coach` 依赖会话结束信号与长期数据；
- `Learning Center` 依赖长期数据聚合 schema；
- `Evidence` 依赖抽象 Provider 与文档解析任务模型。  

### G-05: 可验收
每个 AC 必须是可验证行为，而非抽象体验形容词。  
例如：
- 不写“用户几乎不犹豫地理解差异”，而写“首屏展示两个独立 CTA、差异说明与辅助文案，1024px 下无需滚动即可见”。  
- 不写“上下文足够时继续追问”，而写“至少保留当前锚点、上一轮问题、上一轮回答摘要与会话类型”。  

## Requirements Inventory
### Functional Requirements
FR-UM-001: 用户可通过独立统一认证页完成注册、登录、登出，并进入小麦受保护功能页面。  
FR-UM-002: 前端、FastAPI 与 RuoYi 必须对用户登录态保持一致判断。  
FR-UM-003: 用户可在个人中心查看并修改昵称、头像、学校等基础资料。  
FR-UM-004: 系统需基于 RuoYi 角色体系区分学生、教师与管理角色能力边界。  
FR-UI-R01: 页面与路由口径需冻结为首页、认证页、视频输入/等待/结果、课堂输入/等待/结果、Learning Coach、学习中心域与个人中心域，并明确各自职责边界。  
FR-UI-001: 首页需清晰展示“主题课堂”和“单题视频”两个核心入口，并帮助用户理解差异。  
FR-UI-002: 课堂页面承载课堂内容展示、幻灯片浏览、白板讲解与嵌入式 Companion 追问，且不在主叙事中强插正式答题流程。  
FR-UI-003: 视频生成页承载题目输入、图片上传、老师风格选择、任务创建与进度查看。  
FR-UI-004: 播放器页承载视频播放、倍速、全屏、信息查看、结果操作与嵌入式 Companion 追问。  
FR-UI-005: 个人中心只承接基础资料、账号安全入口与平台设置，不承接历史记录、收藏与学习结果聚合。  
FR-UI-006: 学生端证据能力只以结果页或学习中心中的来源抽屉 / 证据面板出现，不再提供独立资料证据路由。  
FR-UI-007: 学习中心用于聚合学习记录、收藏、问答记录、测验结果与推荐内容。  
FR-UI-008: 前端需为中英双语切换保留架构能力。  
FR-VS-001: 用户可通过文本输入或图片上传提交题目。  
FR-VS-002: 系统需将题目解析为结构化理解结果，用于后续分镜与视频生成。  
FR-VS-003: 系统需基于题目理解生成讲解视频分镜方案。  
FR-VS-004: 系统需基于分镜生成可渲染的 Manim 动画代码。  
FR-VS-005: 渲染失败后系统需自动尝试修复 Manim 代码，修复上限固定为 2 次。  
FR-VS-006: 系统需在受限环境中执行 Manim 渲染并生成视频素材。  
FR-VS-007: 系统需根据讲解内容合成语音音频，且至少支持主备两类 TTS Provider。  
FR-VS-008: 系统需将动画与音频合成为最终视频并上传对象存储。  
FR-VS-009: 视频任务执行过程中，用户需实时看到任务状态与进度。  
FR-VP-001: 用户可以播放已生成的视频。  
FR-VP-002: 用户可以切换视频播放速度。  
FR-VP-003: 用户可拖动进度条并切换全屏。  
FR-CS-001: 用户输入一个主题后，系统可生成一套基础课堂内容。  
FR-CS-002: 用户可在预设老师风格中选择一种用于课堂或视频生成。  
FR-CS-003: 课堂内容需包含可供前端展示的基础幻灯片结构。  
FR-CS-004: 课堂引擎在内容结束后需输出结构化学习信号，用于触发课后的 checkpoint / quiz，而不是把正式练习硬插进课堂主叙事。  
FR-CS-005: 课堂中支持多角色 Agent 参与讨论。  
FR-CS-006: 课堂生成过程中需向用户反馈当前阶段和进度。  
FR-CS-007: 课堂中的白板展示需避免内容重叠，并具备基础可读性。  
FR-CP-001: 系统需为视频与课堂会话建立统一上下文锚点，如视频时间点、课堂 slide 或白板步骤。  
FR-CP-002: 用户可在会话中针对当前锚点发起提问，系统优先基于会话产物进行解释。  
FR-CP-003: 系统可将关键解释输出为白板动作或步骤化可视解释，并在侧栏同步展示。  
FR-CP-004: 系统支持会话内连续追问，并继承上一轮上下文。  
FR-CP-005: 会话伴学记录应作为长期业务数据回写，供学习中心回看与学习分析使用。  
FR-CP-006: 当外部能力或白板能力异常时，系统应提供可解释降级路径。  
FR-KQ-001: 系统需支持从 Companion、Learning Coach、学习中心或结果页来源抽屉触发证据检索，用于补充课程知识点、教材内容或术语依据。  
FR-KQ-002: 系统支持将教材、讲义等文档解析后接入证据检索能力。  
FR-KQ-003: 系统需基于证据索引与外部能力返回知识点解释与课程相关问答结果。  
FR-KQ-004: 问答结果应尽可能展示引用来源，帮助用户理解答案依据。  
FR-KQ-005: 系统支持对证据检索或会话补证据中的专业术语进行简明解释。  
FR-KQ-006: 证据检索结果应回写为长期业务数据，供学习中心或后台查询。  
FR-LA-001: 系统可基于课堂、视频、Companion 或知识点生成会话后的轻量 checkpoint。  
FR-LA-002: 系统可基于课堂、视频、Companion 或证据检索上下文生成正式课后 quiz，并返回判分与解析。  
FR-LA-003: 系统可根据用户当前学习主题、测验结果或问答记录生成基础学习路径建议。  
FR-LA-004: 系统可根据用户当前学习内容推荐后续知识点。  
FR-LA-005: 系统可将错题结果归档为错题本，供用户后续复习。  
FR-LA-006: 学习中心可聚合展示 checkpoint、quiz、错题解析、学习路径与知识推荐等结果。  
FR-TF-001: 视频任务与课堂任务应采用统一任务模型，保证状态、事件与结果格式一致。  
FR-TF-002: 长任务需遵循统一状态流转规则。  
FR-TF-003: 任务框架应支持统一错误码，以支持排障与前端可解释提示。  
FR-SE-001: 长任务执行过程中，系统需通过 SSE 向前端推送阶段进度与状态变化。  
FR-SE-002: 当连接短暂中断时，系统需支持基于 Redis 状态与事件缓存恢复任务状态。  
FR-SE-003: 当 SSE 恢复失败或连接受限时，系统可退化为状态查询能力。  
FR-PV-001: 系统需通过统一抽象层接入 LLM、TTS 等外部能力，避免业务逻辑与具体厂商实现强耦合。  
FR-PV-002: 当主 Provider 不可用时，系统应自动切换备用 Provider。  
FR-PV-003: 系统应缓存 Provider 健康状态，用于快速决策和降级。  
FR-PV-004: 系统可通过抽象层调用外部平台的证据检索、流程编排、路径规划与评测能力，Tencent ADP 仅作为默认实现之一。  
FR-LR-001: 用户可以查看已完成的课堂、视频、Companion、证据检索或 Learning Coach 结果记录。  
FR-LR-002: 用户可收藏课堂、视频、问答结果或 Learning Coach 内容。  
FR-LR-003: 用户可删除历史记录。  
FR-LR-004: 学习中心应作为学习数据与结果回看的统一聚合入口。  
FR-LR-005: 后台侧只承接小麦长期业务数据的管理、查询与审计边界，不在当前版本扩展为独立 ToB 产品。  

### Non-Functional Requirements
NFR-PF-001: 非生成类 API 响应时间 P95 必须小于 200ms。  
NFR-PF-002: 视频生成端到端延迟 P95 必须小于 5 分钟。  
NFR-PF-003: 基础课堂生成端到端延迟 P95 必须小于 5 分钟。  
NFR-PF-004: 证据检索需在主观上快速返回可接受结果。  
NFR-PF-005: 视频生成成功率需大于 80%。  
NFR-PF-006: 基础课堂生成成功率需大于 90%。  
NFR-PF-007: MVP 系统可用性需达到 99% 以上。  
NFR-PF-008: 首屏加载时间 FCP 需小于 1.5 秒。  
NFR-SE-001: 所有外部访问必须通过 HTTPS。  
NFR-SE-002: 鉴权体系必须与 RuoYi 保持一致。  
NFR-SE-003: 前后端都必须执行输入校验。  
NFR-SE-004: HTML / 富文本相关场景必须具备明确的 XSS 消毒策略。  
NFR-SE-005: Manim 沙箱安全边界不得为了提高成功率而让步。  
NFR-CO-001: 系统需符合学生数据隐私保护要求。  
NFR-CO-002: AI 生成内容需提供必要标识。  
NFR-AR-001: 系统必须保持双后端分层，FastAPI 负责功能服务，RuoYi 负责长期业务宿主。  
NFR-AR-002: 长期业务数据必须进入 RuoYi/MySQL 或 COS。  
NFR-AR-003: Redis 仅用于运行态与事件缓存，且必须设置 TTL。  
NFR-AR-004: 视频、课堂、Companion、Evidence / Retrieval、Learning Coach 允许共享基础设施但业务独立。  
NFR-AR-005: Provider 接入需具备可替换性与 Failover 能力。  
NFR-AR-006: 关键链路必须具备 `request_id` / `task_id` 与统一日志追踪能力。  
NFR-AR-007: 生产环境必须支持 Linux 容器化部署。  
NFR-UX-001: MVP 以前端桌面端为主，最小支持宽度为 1024px。  
NFR-UX-002: 浏览器主支持 Chrome / Edge / Firefox。  
NFR-UX-003: 关键交互必须支持键盘操作，颜色对比不得明显违规。  
NFR-UX-004: 完整 WCAG AA 合规后置到 Post-MVP。  
NFR-UX-005: MVP 默认中文，但需预留 i18n 架构能力。  

### Additional Requirements
- AR-001: 前端 Starter 选型固定为 `shadcn/ui CLI v4 + Vite 6.x + React 19 + TypeScript 5.7+ + Tailwind CSS v4 + Radix UI`。  
- AR-002: 前端仍需手动集成 `Zustand`、`Framer Motion`、`KaTeX / Temml`、`Shiki`、HTTP 客户端、`react-router-dom`、`react-i18next`、`Video.js` 与 SSE 客户端工具。  
- AR-003: 后端 Starter 选型固定为手动搭建 `FastAPI 0.135.1 + Feature-Module + Protocol-DI` 架构，而不是基于 CRUD 模板扩展。  
- AR-004: FastAPI 的定位是功能服务层 / AI 编排层 / 异步任务协调层，不得膨胀为第二个业务后台。  
- AR-005: 所有 FastAPI 路由统一前缀为 `/api/v1`，长耗时功能统一建模为 `tasks` 资源，SSE 使用 `events` 子资源，状态查询使用 `status` 子资源。  
- AR-006: FastAPI 响应格式需与 RuoYi 保持一致，统一为 `{code, msg, data}` 或 `{code, msg, rows, total}`。  
- AR-007: 标准业务 CRUD 优先由 RuoYi 管理端 / 业务表承接，FastAPI 不重复建设完整 CRUD 面。  
- AR-008: 统一认证采用独立登录页 `/login`；首页与受保护页面只负责跳转，不弹出认证模态框。  
- AR-009: 页面域职责固定为 `/learning` 聚合结果、`/history` 与 `/favorites` 属学习中心域、`/profile` 只承接资料、`/settings` 只承接偏好。  
- AR-010: 统一异步任务状态枚举固定为 `pending`、`processing`、`completed`、`failed`、`cancelled`，且前后端必须一致。  
- AR-011: SSE 事件类型至少包括 `connected`、`progress`、`provider_switch`、`completed`、`failed`、`heartbeat`、`snapshot`，并统一 payload 语义字段。  
- AR-012: SSE 的恢复依据是 Redis 中的运行时状态与事件缓存，而不是数据库回放全部历史过程。  
- AR-013: Redis 只承担运行态、认证态与事件缓存职责，所有 Redis Key 必须设置 TTL。  
- AR-014: 长期业务数据统一进入 RuoYi 业务表 / MySQL，文件产物统一进入 COS，FastAPI 不承担长期业务数据主存储职责。  
- AR-015: FastAPI 与 RuoYi 之间必须通过防腐层交互，避免 FastAPI 直接依赖 RuoYi 领域模型。  
- AR-016: Provider 接口需支持优先级、健康检查、Failover、超时、重试与缓存策略，健康状态缓存 Key 采用 `xm_provider_health:{provider}`。  
- AR-017: 功能服务日志格式需与 RuoYi 的时间格式与字段风格保持一致，支持跨服务排障。  
- AR-018: 正式页面进入实施前仍需满足“高保真视觉稿、关键状态、交互说明、稳定接口契约”四项门禁，但该门禁只能作为合并 / 发布约束，不能被写成前端必须等待后端完成的开发阻塞依赖。  
- AR-019: 本次 Epic 重构新增强制拆分规则，前端与后端 Story 必须按“契约先行、mock 先行、适配层隔离”设计，确保两端可以并行推进。  
- AR-020: 后端 Story 的完成定义应以 API 契约、错误码、状态枚举、示例 payload、OpenAPI / 接口文档、契约测试与状态恢复语义为边界，而不是要求前端联调完成后才算完成。  
- AR-021: 前端 Story 的完成定义应允许基于 mock 数据、mock handler、假任务状态流与页面适配层完成，不得把“等待真实后端返回”作为前置依赖。  
- AR-022: 为支撑并行开发，所有需要联动的能力域必须产出机器可用的 mock 样例，包括列表、详情、任务状态、SSE 事件流、空态、错态与权限失败场景。  

### UX Design Requirements
UX-DR-001: 首页必须让用户在 3 秒内理解“主题课堂”和“单题视频”两个入口差异。  
UX-DR-002: 首页只做入口分发与推荐提示，不提前暴露复杂系统结构。  
UX-DR-003: 统一认证必须使用独立 `/login` 页面承接登录 / 注册切换，并在成功后回跳原上下文。  
UX-DR-004: 视频输入页必须用单一核心输入区承接打字、拍照与粘贴。  
UX-DR-005: 课堂输入页与视频输入页保持一致的配置心智，但文案偏向主题学习。  
UX-DR-006: 老师风格选择必须以输入框附近的轻量下拉实现，不得做成大卡片角色选择或页面级主题切换。  
UX-DR-007: 视频与课堂等待页必须复用统一等待壳层与统一进度组件。  
UX-DR-008: 等待态至少展示阶段化进度，视频侧包含题目理解、分镜、Manim、渲染、TTS、合成等关键阶段。  
UX-DR-009: 等待页必须在同页内闭环处理失败、超时、断线恢复与状态查询降级。  
UX-DR-010: 视频结果页必须以播放器为主区域，Companion、白板解释与问答流作为侧区域。  
UX-DR-011: 视频结果页中 `Evidence / Retrieval` 与 `Learning Coach` 只能作为后续动作入口，不占据主叙事。  
UX-DR-012: 课堂结果页必须由幻灯片 / 讲解 / 讨论主内容区、白板区与 Companion 侧栏组成。  
UX-DR-013: 课堂结果页中正式 quiz 不得硬插在课堂主叙事中，只能在会话后由 Learning Coach 承接。  
UX-DR-014: 所有 Companion 提问都必须绑定上下文锚点，如视频时间点、课堂步骤、slide 或白板段落。  
UX-DR-015: Companion 的最小结构必须包含当前锚点、提问框、问答流与白板解释区。  
UX-DR-016: Companion 交互不能劫持主叙事，用户追问后仍能继续播放视频或浏览课堂。  
UX-DR-017: Companion 降级规则必须明确，包括暂时不可用、白板失败、锚点缺失与资料不足四类场景。  
UX-DR-018: Evidence / Retrieval 只能以前台非路由来源抽屉 / 证据面板形式出现，不得新增学生端独立页面。  
UX-DR-019: 证据面板必须提供来源范围、资料上传、解析状态、历史切换、引用片段与证据深挖输入。  
UX-DR-020: 证据面板必须支持范围切换、文档上传、流式深挖、引用点击与相关知识点种子动作。  
UX-DR-021: Learning Coach 的所有能力都必须发生在会话后，而不是会话中强插。  
UX-DR-022: `checkpoint` 必须是低打扰、少题量、可快速结束或跳转 quiz 的轻量闭环。  
UX-DR-023: `quiz` 必须覆盖作答前、已选择未提交、判题中、单题解析与总结页等关键状态。  
UX-DR-024: `path` 必须覆盖目标选择、周期选择、周计划 / 阶段任务、保存、调整与开始学习模块。  
UX-DR-025: `/learning` 必须作为历史、收藏、问答、错题、推荐与学习路径的统一聚合入口。  
UX-DR-026: `/profile` 与 `/settings` 不能承担学习结果聚合，学习结果不得回流个人中心主页。  
UX-DR-027: 页面级边界必须冻结，`Companion` 解释当前这一步，`Evidence / Retrieval` 解释资料依据，`Learning Coach` 负责接下来怎么学。  
UX-DR-028: 共享等待态、toast、error、confirm 必须归入共享状态资产，不得拆成伪路由。  
UX-DR-029: 设计系统基础必须采用 Shadcn/ui + Tailwind CSS v4 + Radix UI，并保留品牌色、局部老师点缀色与 CSS 变量主题系统。  
UX-DR-030: 组件库需至少覆盖双入口页面组件、风格选择器、进度反馈组件、视频播放器组件、Companion 组件、Evidence / Retrieval 组件与 Learning Coach 组件。  
UX-DR-031: MVP 以前端桌面端为主，最小支持宽度 1024px；平板响应式适配作为后续增长阶段要求。  
UX-DR-032: 关键交互必须支持键盘导航与保留系统 focus outline，并以 WCAG AA 为基线建设无障碍能力。  
UX-DR-033: 动效需支持页面加载、输入聚焦与交互反馈，但不能破坏“低负担、高可控”的主体验。  
UX-DR-034: 前端与双后端交互边界必须被 UI 层明确体现，服务路由、401 跳转、SSE 重连与轮询降级都要有对应交互状态。  
UX-DR-035: 为支持并行开发，所有正式页面在真实接口未就绪前都必须具备 mock 状态流，包括空态、加载态、处理中、完成态、失败态与权限失败态。  

## Epic Restructure Principles
### P-01: 底座能力优先拆出
原拆法中，视频 Epic 吞掉了统一任务模型、SSE、Provider 抽象等基础设施。  
本版明确将这些能力独立成 `Epic 2`，避免视频域成为全系统的“隐藏底座 Epic”。  

### P-02: 长期数据承接单独成域
原拆法中，RuoYi 承接逻辑散落在多个 Epic 的 AC 中。  
本版明确将业务表、持久化回写、防腐层、后台审计边界独立为 `Epic 10`。  

### P-03: 输入创建与执行消费拆分
视频域不再是一个巨型 Epic。  
本版将其拆为：
- `Epic 3: 单题视频输入与任务创建`
- `Epic 4: 单题视频生成、结果消费与失败恢复`

### P-04: Companion 以 SessionArtifactGraph 为边界
Companion 不再被当成“随手插进去的侧栏功能”。  
它是一个依赖视频与课堂产物索引的共享消费层，故独立成 `Epic 6`。  

### P-05: Evidence 与 Learning 分层明确
Evidence / Retrieval 负责“资料依据”。  
Learning Coach 负责“接下来怎么学”。  
Learning Center 负责“长期结果回看”。  
三者必须拆开，而不是围绕“学习”一词混在一起。  

### P-06: 每个 Epic 必须有并行规则
每个 Epic 都必须明确：
- 哪个 Story 是先行契约 Story；
- 哪些前端 Story 可以在 mock 下先做；
- 哪些后端 Story 可独立完成；
- 哪些故事必须等依赖 Epic 退出后再开始。  

## Dependency Model
### Global Dependency Rules
- `Epic 0` 是所有 Epic 的入口依赖。  
- `Epic 2` 是所有长任务类 Epic 的运行时底座依赖。  
- `Epic 10` 是所有长期业务数据回写类 Epic 的持久化依赖。  
- `Epic 6` 依赖 `Epic 4` 与 `Epic 5` 产出的 `SessionArtifactGraph`。  
- `Epic 8` 依赖 `Epic 5` 的结束信号，以及 `Epic 6` / `Epic 7` 的学习行为沉淀。  
- `Epic 9` 可以在 mock 下先做，但真实数据接入依赖 `Epic 10` 和相关业务 Epic 的长期数据 schema 稳定。  

### Simplified Dependency Graph
```text
Epic 0  ->  Epic 1
Epic 0  ->  Epic 2
Epic 0  ->  Epic 10

Epic 1  ->  Epic 3
Epic 1  ->  Epic 5

Epic 2  ->  Epic 3
Epic 2  ->  Epic 4
Epic 2  ->  Epic 5
Epic 2  ->  Epic 6
Epic 2  ->  Epic 7
Epic 2  ->  Epic 8

Epic 10 ->  Epic 4
Epic 10 ->  Epic 5
Epic 10 ->  Epic 6
Epic 10 ->  Epic 7
Epic 10 ->  Epic 8
Epic 10 ->  Epic 9

Epic 3  ->  Epic 4
Epic 4  ->  Epic 6
Epic 5  ->  Epic 6
Epic 5  ->  Epic 8
Epic 6  ->  Epic 7
Epic 6  ->  Epic 8
Epic 7  ->  Epic 8
```

## Story Definition Standard
### Story Type Classification
每个 Story 必须显式标记为以下类型之一：
- `Contract Story`
- `Frontend Story`
- `Backend Story`
- `Persistence Story`
- `Integration Story`
- `Infrastructure Story`

### Entry Criteria
任一 Story 开始开发前，至少满足：
- 所属 Epic 已定义清晰边界；
- Story 类型已明确；
- 所需依赖 Story 或 Epic 状态已说明；
- 输入输出字段已经有最小契约；
- 页面 Story 已有设计状态说明或状态图；
- 后端 Story 已有错误码与响应格式预期。

### Exit Criteria
任一 Story 结束时，必须满足：
- 契约 Story：schema、示例、mock、说明文档齐全；
- 前端 Story：mock 流程闭环、空态错态权限态可见；
- 后端 Story：接口可跑、测试通过、错误语义稳定；
- 持久化 Story：表结构或接口已落地、字段对齐、回写验证完成；
- 集成 Story：上下游边界验证完成；
- 基础设施 Story：可被至少一个业务 Story 复用。  

### Acceptance Criteria Writing Rule
AC 必须符合：
- 可观察；
- 可测试；
- 可对齐；
- 可独立验收；
- 不依赖“主观感觉”或“默认理解”。  

## FR Coverage Map
FR-UM-001: Epic 1 - 统一认证入口中的注册、登录与登出  
FR-UM-002: Epic 1 - 双后端鉴权一致性与受保护访问  
FR-UM-003: Epic 9 - 个人资料查看与修改  
FR-UM-004: Epic 1 - 基于 RuoYi 角色体系的能力边界  
FR-UI-R01: Epic 1 - 路由冻结口径、认证入口与启动壳层  
FR-UI-001: Epic 1 - 首页双入口展示与推荐提示  
FR-UI-002: Epic 5 - 课堂页面、幻灯片、白板与嵌入式 Companion 承载  
FR-UI-003: Epic 3 - 视频输入页、任务创建与进度起点  
FR-UI-004: Epic 4 - 播放器页、视频结果消费与结果操作  
FR-UI-005: Epic 9 - 个人中心只承接资料与设置  
FR-UI-006: Epic 7 - 来源抽屉 / 证据面板非路由承载  
FR-UI-007: Epic 9 - 学习中心聚合展示  
FR-UI-008: Epic 9 - 国际化架构预留  
FR-VS-001: Epic 3 - 多模态题目输入与视频任务创建  
FR-VS-002: Epic 4 - 题目结构化理解  
FR-VS-003: Epic 4 - 视频分镜生成  
FR-VS-004: Epic 4 - Manim 代码生成  
FR-VS-005: Epic 4 - Manim 自动修复  
FR-VS-006: Epic 4 - 受限动画渲染  
FR-VS-007: Epic 4 - TTS 合成与主备 Provider  
FR-VS-008: Epic 4 - 音视频合成与 COS 上传  
FR-VS-009: Epic 4 - 视频任务进度反馈  
FR-VP-001: Epic 4 - 视频播放  
FR-VP-002: Epic 4 - 倍速播放  
FR-VP-003: Epic 4 - 进度控制与全屏  
FR-CS-001: Epic 5 - 主题输入与基础课堂生成  
FR-CS-002: Epic 1 - 老师风格选择作为启动配置的一部分  
FR-CS-003: Epic 5 - 幻灯片展示  
FR-CS-004: Epic 5 - 会话结束信号与课后练习触发  
FR-CS-005: Epic 5 - 多 Agent 讨论结果展示  
FR-CS-006: Epic 5 - 课堂进度反馈  
FR-CS-007: Epic 5 - 白板布局与基础可读性  
FR-CP-001: Epic 6 - 会话上下文锚点  
FR-CP-002: Epic 6 - 当前上下文提问  
FR-CP-003: Epic 6 - 解释白板联动  
FR-CP-004: Epic 6 - 连续追问与上下文继承  
FR-CP-005: Epic 6 - 会话问答回写  
FR-CP-006: Epic 6 - Companion 降级与容错  
FR-KQ-001: Epic 7 - 证据检索入口  
FR-KQ-002: Epic 7 - 文档上传与解析  
FR-KQ-003: Epic 7 - 证据问答与依据补充  
FR-KQ-004: Epic 7 - 引用来源展示  
FR-KQ-005: Epic 7 - 术语解释  
FR-KQ-006: Epic 7 - 证据问答记录回写  
FR-LA-001: Epic 8 - 会话后 checkpoint 生成  
FR-LA-002: Epic 8 - 课后 quiz 生成与判分  
FR-LA-003: Epic 8 - 学习路径规划  
FR-LA-004: Epic 8 - 知识点推荐  
FR-LA-005: Epic 8 - 错题本  
FR-LA-006: Epic 9 - 学习中心聚合展示 Learning Coach 结果  
FR-TF-001: Epic 2 - 统一任务模型  
FR-TF-002: Epic 2 - 统一任务状态机  
FR-TF-003: Epic 2 - 统一任务错误码  
FR-SE-001: Epic 2 - SSE 实时进度推送  
FR-SE-002: Epic 2 - SSE 断线恢复  
FR-SE-003: Epic 2 - 状态查询降级  
FR-PV-001: Epic 2 - Provider 抽象与可替换性  
FR-PV-002: Epic 2 - Provider Failover  
FR-PV-003: Epic 2 - Provider 健康状态缓存  
FR-PV-004: Epic 7 - 可插拔外部 AI 能力编排  
FR-LR-001: Epic 9 - 历史记录回看  
FR-LR-002: Epic 9 - 收藏管理  
FR-LR-003: Epic 9 - 删除历史记录  
FR-LR-004: Epic 9 - 学习中心聚合回看  
FR-LR-005: Epic 10 - ToB 数据承接边界  

## NFR Coverage Map
NFR-PF-001: Epic 0 / Epic 2 / Epic 10 - 契约、底座、持久化接口开销控制  
NFR-PF-002: Epic 4 - 视频主链路性能目标  
NFR-PF-003: Epic 5 - 课堂主链路性能目标  
NFR-PF-004: Epic 7 - Evidence 检索响应体验  
NFR-PF-005: Epic 4 - 视频生成成功率与降级  
NFR-PF-006: Epic 5 - 基础课堂生成成功率  
NFR-PF-007: Epic 0 / Epic 2 / Epic 10 - 可用性底座  
NFR-PF-008: Epic 1 / Epic 3 / Epic 9 - 前端首屏与入口页性能  
NFR-SE-001: Epic 0 / Epic 2 / Epic 10 - HTTPS 与统一访问边界  
NFR-SE-002: Epic 1 / Epic 10 - 鉴权一致性  
NFR-SE-003: Epic 1 / Epic 3 / Epic 5 / Epic 7 / Epic 8 / Epic 9 - 输入校验  
NFR-SE-004: Epic 0 / Epic 7 / Epic 9 - 富文本与渲染安全  
NFR-SE-005: Epic 4 - Manim 沙箱安全  
NFR-CO-001: Epic 10 - 长期数据与隐私边界  
NFR-CO-002: Epic 4 / Epic 5 / Epic 8 / Epic 9 - AI 内容标识呈现  
NFR-AR-001: Epic 0 / Epic 10 - 双后端分层  
NFR-AR-002: Epic 10 - 长期数据入 RuoYi/MySQL/COS  
NFR-AR-003: Epic 2 - Redis 只承担运行态且 TTL 强制  
NFR-AR-004: 全部业务 Epic - 共享基础设施但业务独立  
NFR-AR-005: Epic 2 / Epic 7 / Epic 8 - Provider 抽象与 Failover  
NFR-AR-006: Epic 0 / Epic 2 - request_id / task_id 追踪  
NFR-AR-007: Epic 0 / Epic 10 - 容器化部署底座  
NFR-UX-001: Epic 1 / Epic 3 / Epic 4 / Epic 5 / Epic 9 - 桌面端优先  
NFR-UX-002: Epic 0 / Epic 9 - 浏览器支持约束  
NFR-UX-003: Epic 1 / Epic 4 / Epic 5 / Epic 6 / Epic 7 / Epic 8 / Epic 9 - 键盘操作与对比度基线  
NFR-UX-004: 全局 Post-MVP 约束  
NFR-UX-005: Epic 9 - i18n 架构预留  

## Epic List
### Epic 0: 工程底座与并行开发轨道
为全项目建立 Monorepo 基础目录、契约资产规范、mock 运行机制、adapter 隔离、日志追踪与基础交付门禁。  
**FRs covered:** 间接支撑全域  
**NFRs covered:** `NFR-AR-001`、`NFR-AR-006`、`NFR-AR-007`、`NFR-SE-001`、`NFR-SE-004`  
**Story types expected:** `Infrastructure Story`、`Contract Story`

### Epic 1: 用户接入、统一入口与启动配置
用户可以完成登录、理解双入口差异、进入正确的学习起点，并把老师风格作为会话启动配置带入后续流程。  
**FRs covered:** `FR-UM-001`、`FR-UM-002`、`FR-UM-004`、`FR-UI-R01`、`FR-UI-001`、`FR-CS-002`  
**NFRs covered:** `NFR-SE-002`、`NFR-UX-001`、`NFR-UX-003`

### Epic 2: 统一任务框架、SSE 与 Provider 基础设施
为视频、课堂、文档解析与 Learning Coach 建立统一任务模型、统一错误码、统一 SSE 事件流、恢复语义与 Provider 抽象层。  
**FRs covered:** `FR-TF-001~003`、`FR-SE-001~003`、`FR-PV-001~003`  
**NFRs covered:** `NFR-AR-003`、`NFR-AR-005`、`NFR-AR-006`、`NFR-SE-001`

### Epic 3: 单题视频输入与任务创建
用户可以通过统一输入区提交文本或图片题目，完成任务创建并进入可恢复的等待态起点。  
**FRs covered:** `FR-UI-003`、`FR-VS-001`  
**NFRs covered:** `NFR-SE-003`、`NFR-UX-001`、`NFR-UX-003`

### Epic 4: 单题视频生成、结果消费与失败恢复
用户可以完成视频生成主链路、透明等待、结果播放、失败解释、TTS Failover 与视频侧 SessionArtifactGraph 回写。  
**FRs covered:** `FR-UI-004`、`FR-VS-002~009`、`FR-VP-001~003`  
**NFRs covered:** `NFR-PF-002`、`NFR-PF-005`、`NFR-SE-005`

### Epic 5: 主题课堂学习闭环
用户可以输入主题生成课堂，在等待完成后稳定浏览课堂结果中的幻灯片、讨论、白板内容，并获得会话结束信号。  
**FRs covered:** `FR-UI-002`、`FR-CS-001`、`FR-CS-003~007`  
**NFRs covered:** `NFR-PF-003`、`NFR-PF-006`

### Epic 6: 会话内伴学与当前时刻解释
用户可以围绕视频当前秒点或课堂当前步骤持续追问，并获得白板解释、连续上下文和清晰降级反馈。  
**FRs covered:** `FR-CP-001~006`  
**NFRs covered:** `NFR-UX-003`

### Epic 7: 资料依据、来源回看与证据深挖
用户可以上传资料、查看引用来源、追溯证据依据，并在来源抽屉 / 证据面板中继续深挖。  
**FRs covered:** `FR-UI-006`、`FR-KQ-001~006`、`FR-PV-004`  
**NFRs covered:** `NFR-PF-004`

### Epic 8: 学后巩固、测验与学习路径
用户可以在会话后完成 checkpoint、quiz、错题沉淀、推荐获取与学习路径规划。  
**FRs covered:** `FR-LA-001~005`  
**NFRs covered:** `NFR-UX-003`

### Epic 9: 学习中心聚合、个人管理与长期回看
用户可以在学习中心聚合查看历史、收藏、测验结果与推荐内容，并管理个人资料与平台设置。  
**FRs covered:** `FR-UM-003`、`FR-UI-005`、`FR-UI-007`、`FR-UI-008`、`FR-LA-006`、`FR-LR-001~004`  
**NFRs covered:** `NFR-UX-005`

### Epic 10: RuoYi 持久化承接、业务表与防腐层
系统将视频、课堂、Companion、Evidence、Learning Coach 与学习中心所需的长期业务数据统一承接到 RuoYi 业务表 / MySQL / COS，并提供可查询、可回写、可审计边界。  
**FRs covered:** `FR-LR-005`，并间接支撑 `FR-CP-005`、`FR-KQ-006`、`FR-LA-005`、`FR-LA-006`  
**NFRs covered:** `NFR-AR-001`、`NFR-AR-002`、`NFR-CO-001`

## Delivery Waves
### Wave A: 先行底座
- Epic 0
- Epic 1
- Epic 2
- Epic 10

### Wave B: 第一主链路
- Epic 3
- Epic 4
- Epic 5

### Wave C: 共享消费与增强
- Epic 6
- Epic 7
- Epic 8

### Wave D: 长期聚合与回看
- Epic 9

## Detailed Planning Format
以下每个 Epic 均采用统一格式：
1. Objective  
2. Scope  
3. Out of Scope  
4. Dependencies  
5. Entry Criteria  
6. Exit Criteria  
7. Parallel Delivery Rule  
8. Story List  
9. Story Details  

---

## Epic 0: 工程底座与并行开发轨道
为全项目建立 Monorepo 基础目录、契约资产规范、mock 运行机制、adapter 隔离、日志追踪与基础交付门禁。  
**FRs covered:** 间接支撑全域  
**NFRs covered:** `NFR-AR-001`、`NFR-AR-006`、`NFR-AR-007`、`NFR-SE-001`、`NFR-SE-004`  
**Primary Story Types:** `Infrastructure Story`、`Contract Story`

### Objective
Epic 0 的目标不是提供用户可见功能，而是提供所有业务 Epic 的“开发轨道”。  
没有 Epic 0，后续所有“并行”都只是人脑中的并行，而不是工程上的并行。  

### Scope
- Monorepo 基础目录冻结  
- 契约资产目录与命名规范  
- mock 资产目录与状态样例规范  
- 前端 adapter 基线  
- 后端 schema / OpenAPI 输出基线  
- request_id / task_id 追踪骨架  
- 交付门禁与 Story 完成定义  

### Out of Scope
- 具体业务接口  
- 具体页面实现  
- 具体业务表与数据回写  
- 具体视频 / 课堂 / Companion 逻辑  

### Dependencies
- 无前置依赖。  
- 所有其他 Epic 依赖 Epic 0。  

### Entry Criteria
- 架构文档已冻结到当前版本。  
- Monorepo 路径已确认。  
- 技术选型已无重大争议。  

### Exit Criteria
- 前端能够运行 mock 模式；  
- 后端能够产出最小 schema；  
- 契约资产存放规范已形成并被后续 Epic 复用；  
- 日志追踪骨架存在；  
- Story 完成定义已明确。  

### Parallel Delivery Rule
Story `0.2` 与 `0.3` 是其他业务 Epic 的并行前置。  
任一页面 Story 若没有 adapter 基线，不得进入正式开发。  
任一接口 Story 若没有契约资产规范，不得宣称“契约已冻结”。  

### Story List
- Story 0.1: Monorepo 基础目录与工程骨架冻结  
- Story 0.2: 契约资产目录、命名规则与版本规则冻结  
- Story 0.3: 前端 adapter、mock handler 与环境切换基线  
- Story 0.4: 后端 schema、OpenAPI、示例 payload 输出基线  
- Story 0.5: request_id / task_id / 日志追踪骨架  
- Story 0.6: Story 交付门禁与并行开发 DoR / DoD 冻结  

### Story 0.1: Monorepo 基础目录与工程骨架冻结
**Story Type:** `Infrastructure Story`  
As a 前后端协作团队，  
I want 冻结 Monorepo 的基础目录和最小工程骨架，  
So that 后续每个 Epic 都能在统一结构中落位而不会边做边改根目录组织。  

**Acceptance Criteria:**
**Given** Epic 0 启动  
**When** 团队创建代码仓目录结构  
**Then** `packages/student-web`、`packages/fastapi-backend`、`packages/RuoYi-Vue-Plus-5.X/ruoyi-xiaomai`、`docs` 等基础路径与架构文档保持一致  
**And** 后续 Epic 不需要再为了根目录结构返工移动大批文件  

**Given** 开发者首次拉取项目  
**When** 按 README 执行最小启动流程  
**Then** 前端、FastAPI 与 RuoYi 至少能以空壳模式启动  
**And** 开发者不会因为根目录或启动脚本缺失而无法进入业务开发  

**Deliverables:**
- 根目录结构说明  
- 各 package 最小启动说明  
- `.env.example` 基线  
- README 中的启动步骤  

**Notes:**
- 该 Story 不要求业务功能可用。  
- 该 Story 要求“结构稳定”，而不是“功能完整”。  

### Story 0.2: 契约资产目录、命名规则与版本规则冻结
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 为契约、mock、示例 payload、错误码与状态枚举建立统一存放和命名规范，  
So that 后续所有 Epic 的“契约冻结”都有可执行、可查找、可复用的落地点。  

**Acceptance Criteria:**
**Given** 一个新的业务域需要冻结契约  
**When** 团队查看契约资产目录  
**Then** 能明确知道接口 schema、示例 payload、错误码字典、状态枚举和 mock 样例应该存放在哪里  
**And** 不会出现契约信息散落在 issue、聊天记录、页面注释和个人笔记中的情况  

**Given** 某个契约升级  
**When** 团队发布新版本 schema  
**Then** 契约变更具备版本标识、变更说明和影响范围说明  
**And** 前端不会因为后端字段暗改而在联调阶段被动发现破坏性变更  

**Deliverables:**
- `contracts/` 目录规则  
- `mocks/` 目录规则  
- 错误码定义规范  
- 状态枚举定义规范  
- schema 版本命名规范  

**Suggested Structure:**
```text
contracts/
  auth/
  task/
  video/
  classroom/
  companion/
  evidence/
  learning/
  center/
mocks/
  auth/
  video/
  classroom/
  companion/
  evidence/
  learning/
  center/
```

### Story 0.3: 前端 adapter、mock handler 与环境切换基线
**Story Type:** `Infrastructure Story`  
As a 前端团队，  
I want 建立统一的 adapter 与 mock handler 机制，  
So that 正式页面可以在真实后端缺席时仍然按契约推进到可验收状态。  

**Acceptance Criteria:**
**Given** 任一页面需要调用后端能力  
**When** 页面接入数据层  
**Then** 页面只依赖统一 adapter 接口而不直接依赖具体 HTTP 实现  
**And** 页面在 mock 与 real 两种模式下不需要重写组件状态逻辑  

**Given** 前端运行在 mock 模式  
**When** 页面访问列表、详情、任务状态或 SSE 事件流  
**Then** mock handler 能返回与真实契约一致的字段结构  
**And** 至少覆盖空态、加载态、处理中、完成态、失败态与权限失败态  

**Deliverables:**
- `services/api/client.ts`
- `services/api/adapters/*`
- mock 开关配置
- 假任务状态流样例
- 权限失败样例

**Notes:**
- mock 不是“写死的假 JSON”，而是“可驱动页面状态机的可编排样例”。  

### Story 0.4: 后端 schema、OpenAPI、示例 payload 输出基线
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 建立统一的 schema、OpenAPI 和示例 payload 输出机制，  
So that 前端可以从机器可读资产而非自然语言猜测接口结构。  

**Acceptance Criteria:**
**Given** 一个新的后端接口被声明为“契约冻结”  
**When** 前端或测试查看该接口  
**Then** 可以拿到机器可读 schema、示例 request、示例 response 与错误示例  
**And** 不需要通过口头说明推断字段含义  

**Given** 某个任务接口包含状态枚举或错误码  
**When** 接口文档生成  
**Then** 状态枚举、错误码与示例 payload 在文档中可见  
**And** 不允许只给一个成功示例而缺失失败示例  

**Deliverables:**
- OpenAPI 输出规范
- JSON schema 组织规则
- 示例 payload 模板
- 错误 payload 模板

### Story 0.5: request_id / task_id / 日志追踪骨架
**Story Type:** `Infrastructure Story`  
As a 运维与开发协作团队，  
I want 让 request_id、task_id 与统一日志字段从一开始就进入链路，  
So that 后续出现跨服务错误时可以进行最小可行排障。  

**Acceptance Criteria:**
**Given** 任一进入 FastAPI 的请求  
**When** 请求经过中间件  
**Then** 请求具备 request_id  
**And** 该 request_id 会进入日志上下文与响应头或等效调试信息中  

**Given** 任一长任务被创建  
**When** 任务进入异步执行流程  
**Then** task_id 会贯穿创建日志、执行日志、SSE 事件与异常日志  
**And** 排障时可以通过 task_id 串联一整条任务链路  

**Deliverables:**
- request_id middleware
- log context 规范
- task_id 日志贯穿方式
- 基础错误日志格式

### Story 0.6: Story 交付门禁与并行开发 DoR / DoD 冻结
**Story Type:** `Contract Story`  
As a 项目协作团队，  
I want 明确 Story 的进入条件和退出条件，  
So that 团队不会把“半成品页面”、“口头契约”或“不可联调接口”误判为已完成。  

**Acceptance Criteria:**
**Given** 一个 Story 被标记为 Ready  
**When** 团队检查其输入条件  
**Then** 能确认 Story 类型、依赖、最小契约、状态说明和验收口径已明确  
**And** 不会把需求模糊、字段未定、状态未列举的工作直接推给开发实现  

**Given** 一个 Story 被标记为 Done  
**When** 团队复核完成定义  
**Then** 能确认其交付物、AC、测试或状态闭环已经满足  
**And** 不会把“只写了页面壳”或“只写了接口路由”误判为完成  

**Deliverables:**
- Story DoR
- Story DoD
- 联调前门禁
- 合并前门禁
- 发布前门禁

---

## Epic 1: 用户接入、统一入口与启动配置
用户可以完成登录、理解双入口差异、进入正确的学习起点，并把老师风格作为会话启动配置带入后续流程。  
**FRs covered:** `FR-UM-001`、`FR-UM-002`、`FR-UM-004`、`FR-UI-R01`、`FR-UI-001`、`FR-CS-002`  
**NFRs covered:** `NFR-SE-002`、`NFR-UX-001`、`NFR-UX-003`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`

### Objective
本 Epic 负责“进入系统”的统一起点。  
它只解决：
- 怎么认证；
- 怎么进入正确入口；
- 怎么在进入任务前设置最小启动参数。  

它不负责：
- 真实视频执行；
- 真实课堂执行；
- 个人资料 CRUD；
- 学习中心聚合。  

### Scope
- `/login` 页面  
- 登录 / 注册 / 登出  
- 当前用户信息获取  
- 受保护路由  
- 首页双入口  
- 老师风格作为最小启动配置  
- 角色边界在入口层的可见性  

### Out of Scope
- `/profile` 与 `/settings`
- `/learning`
- 视频或课堂真实任务结果
- Companion、Evidence、Learning Coach 的任何执行逻辑  

### Dependencies
- 依赖 `Epic 0`。  
- 受保护访问的一致性依赖 RuoYi 在线态与 FastAPI 认证适配最小打通。  
- 不依赖视频或课堂业务引擎完成。  

### Entry Criteria
- Epic 0 已完成契约与 adapter 基线。  
- `/login` 与首页的 UI 状态说明已稳定。  

### Exit Criteria
- 用户可通过统一认证页进入受保护页面；  
- 首页双入口清晰可见；  
- 风格选择可作为启动字段稳定透传；  
- 401 / 403 行为在前端、FastAPI、RuoYi 层面一致。  

### Parallel Delivery Rule
Story `1.1` 先冻结认证契约、`401/403` 语义与 mock 会话样例。  
之后认证页、首页与启动壳层可以不等待真实后端并行推进。  
Story `1.3` 完成后，所有受保护页面都可复用同一套认证判断逻辑。  

### Story List
- Story 1.1: 统一认证契约、会话 payload 与 mock 基线  
- Story 1.2: 独立认证页中的注册、登录与回跳  
- Story 1.3: 登出、401 处理与受保护访问一致性  
- Story 1.4: 首页双入口理解与非阻塞推荐提示  
- Story 1.5: 输入壳层中的老师风格最小选择配置  
- Story 1.6: 角色边界与入口级权限可见性

### Story 1.1: 统一认证契约、会话 payload 与 mock 基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 冻结统一认证契约、会话 payload 和 mock handler，  
So that 登录链路、受保护路由和首页入口可以并行开发而不互相等待。  

**Acceptance Criteria:**
**Given** Epic 1 开始实施  
**When** 认证契约被首次冻结  
**Then** 登录、注册、登出、当前用户信息、`401` / `403` 语义和回跳参数格式被文档化并对外公布  
**And** 前端可直接消费同一份类型定义与 mock handler，而不是自行猜测字段结构  

**Given** 前端在本地使用 mock 模式开发  
**When** 认证 adapter 从 mock 切换到真实接口  
**Then** 页面状态模型、表单提交流程和受保护路由判断逻辑不需要重写  
**And** mock payload 与真实 payload 的字段语义保持一致  

**Given** 用户信息包含角色与基础展示字段  
**When** 前端读取当前用户 payload  
**Then** 至少能稳定获取用户 ID、昵称、头像、角色列表与权限判断所需基础字段  
**And** 后续页面不需要再通过“额外猜测字段”判断用户身份  

**Deliverables:**
- 认证接口 schema
- mock session 样例
- `401/403` 行为说明
- 回跳参数格式说明

### Story 1.2: 独立认证页中的注册、登录与回跳
**Story Type:** `Frontend Story`  
As a 访客，  
I want 在独立认证页中完成注册或登录并回到原上下文，  
So that 我可以顺畅进入小麦而不会在入口流程里丢失当前位置。  

**Acceptance Criteria:**
**Given** 访客进入 `/login`  
**When** 访客在同一页面切换登录态或注册态并提交有效信息  
**Then** 系统返回明确成功反馈并建立已认证会话  
**And** 成功后跳回原页面或原意图上下文，而不是跳去无关页面  

**Given** 表单输入无效、凭证错误或认证失败  
**When** 用户提交请求  
**Then** 页面展示明确的字段级或表单级错误提示  
**And** 用户可以在当前页直接修正并继续，不会陷入死路流程  

**Given** 用户使用键盘导航  
**When** 用户在登录页操作  
**Then** 表单、提交按钮、登录/注册切换与返回入口具备可见焦点与可用键盘操作  
**And** 不因动画或样式隐藏焦点状态  

**Deliverables:**
- `/login` 页面
- 登录 / 注册切换
- 提交态与错误态
- 成功回跳逻辑

### Story 1.3: 登出、401 处理与受保护访问一致性
**Story Type:** `Backend Story`  
As a 已登录用户，  
I want 前端、FastAPI 与 RuoYi 对认证态给出一致判断，  
So that 我访问受保护资源时不会遇到前后端状态不一致的异常体验。  

**Acceptance Criteria:**
**Given** 用户持有有效 Token 且 Redis 在线态存在对应记录  
**When** 用户访问受保护页面或受保护接口  
**Then** 前端、FastAPI 与 RuoYi 对该会话的判断结果一致  
**And** 用户不会在一个系统被放行、另一个系统被拒绝  

**Given** Token 失效、被撤销或用户主动登出  
**When** 用户再次访问受保护页面或接口  
**Then** 系统统一返回未授权结果并清理本地认证态  
**And** 前端会回到可恢复的未认证状态，而不是无限跳转或停留在坏态  

**Given** 用户访问一个权限不足但已登录的资源  
**When** 系统判定其角色不具备能力  
**Then** 返回 `403` 而不是伪装成 `401`  
**And** 前端能够区分“未登录”和“已登录但无权限”两种状态  

**Deliverables:**
- FastAPI 认证验证逻辑
- Redis 在线态校验
- 前端统一 401 / 403 处理
- 登出流程

### Story 1.4: 首页双入口理解与非阻塞推荐提示
**Story Type:** `Frontend Story`  
As a 首次或回访用户，  
I want 首页清楚呈现“主题课堂”和“单题视频”两个入口并在可用时给出推荐，  
So that 我可以几乎不犹豫地开始正确的学习流程。  

**Acceptance Criteria:**
**Given** 用户打开首页  
**When** 页面加载完成  
**Then** 页面清晰展示两个主入口、差异说明和明确 CTA  
**And** 在 1024px 宽度下无需滚动即可看到两个入口的主标题、说明与按钮  

**Given** 推荐上下文可用或不可用  
**When** 首页渲染推荐提示区  
**Then** 推荐提示只起到辅助选择作用而不阻塞入口使用  
**And** 即使推荐逻辑失败，双入口主路径仍然完全可用  

**Given** 用户未登录但访问首页  
**When** 用户点击任一入口 CTA  
**Then** 系统引导其进入 `/login` 并保留原始目标意图  
**And** 登录成功后能恢复到相应输入页，而不是回到首页重新选择  

**Deliverables:**
- 首页双入口模块
- 差异说明区
- 非阻塞推荐提示区
- CTA 跳转逻辑

### Story 1.5: 输入壳层中的老师风格最小选择配置
**Story Type:** `Frontend Story`  
As a 准备发起学习会话的用户，  
I want 在视频或课堂输入壳层中通过轻量下拉选择老师风格，  
So that 当前会话可以带着我期望的讲解风格启动。  

**Acceptance Criteria:**
**Given** 用户进入 `/video/input` 或 `/classroom/input`  
**When** 输入壳层渲染完成  
**Then** 老师风格以下拉方式出现在核心输入区域附近  
**And** 存在默认风格且不需要额外跳到独立配置页面  

**Given** 用户选择某个老师风格并发起任务  
**When** 系统创建请求或 mock 任务  
**Then** 所选风格作为 `AgentConfig` 或等效字段被稳定透传  
**And** 风格选择只影响会话内容行为与局部 teacher indicator，不触发页面级主题切换  

**Given** 页面在 mock 模式下运行  
**When** 用户切换不同风格  
**Then** 页面能够通过局部头像、标签或点缀色体现选择结果  
**And** 不会错误地把风格实现成全站 CSS 主题切换  

**Deliverables:**
- 风格选择器组件
- 默认风格逻辑
- 请求透传字段
- 局部展示效果

### Story 1.6: 角色边界与入口级权限可见性
**Story Type:** `Integration Story`  
As a 学生、教师或管理员，  
I want 在进入系统时看到符合自己角色边界的入口与导航，  
So that 我不会进入与自己无关或无权限的功能路径。  

**Acceptance Criteria:**
**Given** 当前用户拥有学生、教师或管理员角色  
**When** 首页与入口壳层渲染  
**Then** 页面可基于角色显示或隐藏与当前版本相关的入口提示  


```markdown
### Story 1.6: 角色边界与入口级权限可见性
**Story Type:** `Integration Story`  
As a 学生、教师或管理员，  
I want 在进入系统时看到符合自己角色边界的入口与导航，  
So that 我不会进入与自己无关或无权限的功能路径。  

**Acceptance Criteria:**
**Given** 当前用户拥有学生、教师或管理员角色  
**When** 首页与入口壳层渲染  
**Then** 页面可基于角色显示或隐藏与当前版本相关的入口提示  
**And** 不会向无权限角色暴露误导性的管理动作或不可进入的主路径  

**Given** 用户尝试访问超出自己角色边界的受保护页面  
**When** 路由守卫或后端权限判定生效  
**Then** 系统返回明确的拒绝结果或安全回退路径  
**And** 不会出现页面先渲染完整数据再因后端拒绝而闪退的坏体验  

**Given** 当前版本不扩展独立 ToB 产品域  
**When** 学生端首页与学习路径渲染  
**Then** 管理侧能力不会以学生端主导航形式暴露  
**And** 角色边界保持与 RuoYi 的权限体系一致，而非由前端自建第二套角色规则  

**Deliverables:**
- 角色基础能力映射表
- 入口级显隐策略
- 受保护页面角色限制规则
- 权限不足时的 UI 回退说明

---

## Epic 2: 统一任务框架、SSE 与 Provider 基础设施
为视频、课堂、文档解析与 Learning Coach 建立统一任务模型、统一错误码、统一 SSE 事件流、恢复语义与 Provider 抽象层。  
**FRs covered:** `FR-TF-001~003`、`FR-SE-001~003`、`FR-PV-001~003`  
**NFRs covered:** `NFR-AR-003`、`NFR-AR-005`、`NFR-AR-006`、`NFR-SE-001`  
**Primary Story Types:** `Contract Story`、`Infrastructure Story`、`Backend Story`

### Objective
Epic 2 是所有长耗时能力的运行时底座。  
它负责：
- 统一任务模型；
- 统一状态机；
- 统一错误码；
- 统一 SSE 事件流；
- 统一恢复语义；
- 统一 Provider 工厂、健康检查与 Failover。  

它不负责：
- 具体视频分镜逻辑；
- 具体课堂内容生成；
- 具体证据检索问答；
- 具体 quiz 内容生成。  

### Scope
- `TaskStatus`
- `TaskContext`
- `TaskResult`
- `TaskProgressEvent`
- `BaseTask`
- `TaskScheduler`
- SSE broker
- SSE 恢复与降级
- Provider Protocol
- ProviderFactory
- 健康检查与 Redis 缓存
- Dramatiq + Redis broker
- Redis 运行态 key 与 TTL 规范落地

### Out of Scope
- 视频业务 stage 实现
- 课堂业务 stage 实现
- 文档解析能力本身
- 具体 LLM prompt
- 具体 TTS vendor 集成细节的业务语义层封装

### Dependencies
- 依赖 `Epic 0`。  
- 后续 `Epic 3 / 4 / 5 / 6 / 7 / 8` 均依赖本 Epic。  

### Entry Criteria
- Epic 0 已完成契约资产目录与 schema 输出基线。  
- 统一任务状态与错误码命名空间已可讨论并冻结。  

### Exit Criteria
- 所有长任务可共享统一状态枚举；  
- SSE 事件结构稳定；  
- 断线恢复与 `/status` 降级语义稳定；  
- ProviderFactory、健康缓存、Failover 规则存在；  
- Redis 运行态 key 已有 TTL 与规范命名。  

### Parallel Delivery Rule
Story `2.1` 与 `2.5` 是所有任务型业务 Epic 的前置契约。  
Story `2.7` 与 `2.8` 是所有需要外部能力切换的业务 Epic 的前置能力。  
前端可在 `2.1 + 2.5 + 2.6` 完成后开始构建统一等待壳层与状态机。  
后端可在 `2.2 + 2.3 + 2.4 + 2.7 + 2.8` 完成后接入任意新 Task。  

### Story List
- Story 2.1: 统一任务状态枚举、错误码与结果 schema 冻结  
- Story 2.2: Task 基类、TaskContext 与调度骨架  
- Story 2.3: Dramatiq + Redis broker 基础接入  
- Story 2.4: Redis 运行态 Key、TTL 与事件缓存落地  
- Story 2.5: SSE 事件类型、payload 与 broker 契约冻结  
- Story 2.6: SSE 断线恢复与 `/status` 查询降级  
- Story 2.7: Provider Protocol、工厂与优先级注册骨架  
- Story 2.8: Provider 健康检查、Failover 与缓存策略  

### Story 2.1: 统一任务状态枚举、错误码与结果 schema 冻结
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 冻结统一任务状态、错误码与结果结构，  
So that 视频、课堂、文档解析与 Learning Coach 都能围绕同一运行时语义并行开发。  

**Acceptance Criteria:**
**Given** 系统存在多个长任务能力域  
**When** 团队查看统一任务契约  
**Then** 能看到固定状态枚举 `pending`、`processing`、`completed`、`failed`、`cancelled`  
**And** 前后端不得在业务域中重新发明不兼容的状态名  

**Given** 某个任务执行失败  
**When** 后端返回错误信息  
**Then** 任务结果中使用统一错误码而不是自由文本  
**And** 前端可以基于错误码稳定映射文案、重试动作与排障提示  

**Given** 某个任务被创建、处理中、完成或失败  
**When** 前端读取任务详情、状态或 SSE 事件  
**Then** 至少可以稳定获得 `taskId`、`taskType`、`status`、`progress`、`message`、`timestamp` 与必要的 `errorCode`  
**And** 页面不需要因为不同业务域字段不一致而维护多套状态机  

**Suggested Core Contracts:**
- `TaskStatus`
- `TaskErrorCode`
- `TaskResult`
- `TaskProgressEvent`
- `TaskSnapshot`

**Deliverables:**
- 状态枚举表
- 错误码字典
- 统一任务结果 schema
- 示例成功 / 失败 payload

### Story 2.2: Task 基类、TaskContext 与调度骨架
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 提供统一的 Task 基类、上下文与调度骨架，  
So that 新的长任务不需要从零重写生命周期与状态推进逻辑。  

**Acceptance Criteria:**
**Given** 一个新的任务类型需要接入系统  
**When** 开发者基于统一任务骨架创建任务  
**Then** 任务可以复用初始化、状态推进、异常处理、完成收尾等生命周期钩子  
**And** 不需要为每个业务域单独发明任务生命周期管理方式  

**Given** 任务执行过程中需要访问用户、重试次数、request_id、task_id 等上下文  
**When** 任务运行  
**Then** 这些信息可通过统一 `TaskContext` 获得  
**And** 任务逻辑不需要跨模块拼装上下文字段  

**Given** 一个任务抛出未处理异常  
**When** 调度器接管异常  
**Then** 任务会被推进到 `failed` 而不是无状态挂起  
**And** 错误码、日志与运行态快照会同步写入统一通道  

**Deliverables:**
- `BaseTask`
- `TaskContext`
- `TaskScheduler`
- 生命周期钩子定义
- demo task

### Story 2.3: Dramatiq + Redis broker 基础接入
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 将 Dramatiq 与 Redis broker 作为统一队列底座接入，  
So that 视频、课堂与文档解析任务都能在一致的异步执行环境中运行。  

**Acceptance Criteria:**
**Given** 系统提交一个 demo task  
**When** FastAPI 将任务分发到 Worker  
**Then** Worker 能通过 Dramatiq + Redis broker 收到任务并开始执行  
**And** 开发者能够观察到任务被投递、消费与完成的最小执行链路  

**Given** Worker 进程短暂重启或任务执行失败  
**When** 系统查看任务运行状态  
**Then** 能区分“尚未执行”、“执行中”、“失败”或“已完成”  
**And** 不会因为缺乏队列层状态管理而把任务永久留在不确定状态  

**Given** 后续业务域新增新的任务类型  
**When** 新任务被注册  
**Then** 不需要重构底层 broker 或重新设计任务分发方式  
**And** 新旧任务可以在同一套异步执行基础设施上共存  

**Deliverables:**
- Dramatiq 接入配置
- Redis broker 配置
- Worker 启动脚本
- demo task dispatch / consume 示例

### Story 2.4: Redis 运行态 Key、TTL 与事件缓存落地
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 将 Redis 运行态 key 命名、TTL 与事件缓存规则真正落地，  
So that 任务恢复、SSE 补发与 Provider 健康缓存有统一的运行时存储边界。  

**Acceptance Criteria:**
**Given** 系统写入任一运行态 key  
**When** 开发者检查 Redis  
**Then** 运行态 key 命名符合统一规范，例如 `xm_task:{task_id}`、`xm_task_events:{task_id}`、`xm_provider_health:{provider}`  
**And** 所有运行态 key 均设置 TTL，不允许无过期时间长期滞留  

**Given** 某个任务在执行中不断输出事件  
**When** 事件被缓存到 Redis  
**Then** 系统可以按任务 ID 读取最近事件、快照或恢复所需的最小状态  
**And** 不会把 SSE 事件当作长期审计数据写入 Redis 永久保存  

**Given** 某条长期业务数据需要回看、查询或审计  
**When** 开发者设计存储位置  
**Then** 该数据不得仅存储在 Redis 中  
**And** Redis 只承担运行态、事件缓存与短期恢复，不承担长期业务数据宿主职责  

**Deliverables:**
- Redis key builder
- TTL policy
- 事件缓存写入 / 读取封装
- 运行态清理策略说明

### Story 2.5: SSE 事件类型、payload 与 broker 契约冻结
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 冻结统一 SSE 事件类型与 payload 结构，  
So that 所有等待页、结果页和任务型接口都能消费一致的实时语义。  

**Acceptance Criteria:**
**Given** 任一长任务需要通过 SSE 对前端推送状态  
**When** 团队查看 SSE 契约  
**Then** 至少能看到 `connected`、`progress`、`provider_switch`、`completed`、`failed`、`heartbeat`、`snapshot` 七类事件  
**And** 各事件 payload 所需字段语义被清晰定义  

**Given** 前端在 mock 模式下模拟 SSE  
**When** 页面消费事件流  
**Then** 页面只需围绕统一 payload 字段进行状态判断  
**And** 不需要为视频、课堂、文档解析分别实现完全不同的 SSE 解析器  

**Given** 某个后端任务需要发出阶段切换  
**When** 事件写入 broker  
**Then** 事件字段至少包含事件类型、任务 ID、任务类型、状态、进度、消息与时间戳  
**And** 失败事件可附带统一错误码，Provider 切换事件可附带 `from`、`to` 与 `reason`  

**Deliverables:**
- SSE 事件 schema
- 事件 payload 示例
- 统一字段说明
- mock SSE 序列示例

### Story 2.6: SSE 断线恢复与 `/status` 查询降级
**Story Type:** `Backend Story`  
As a 等待长任务结果的用户，  
I want 在事件流中断时恢复状态或自动降级查询，  
So that 我不会因为刷新、网络波动或浏览器重连而丢失任务上下文。  

**Acceptance Criteria:**
**Given** 用户正在等待一个执行中的任务  
**When** SSE 连接被短暂中断  
**Then** 客户端可基于 `Last-Event-ID`、任务快照或 Redis 事件缓存恢复当前状态  
**And** 系统不会要求用户重新提交任务才能看到最新进度  

**Given** 事件流恢复失败或运行环境不适合持续连接  
**When** 前端尝试获取任务状态  
**Then** 系统自动降级到 `/status` 查询接口  
**And** 页面仍然可以展示当前阶段、状态和下一步动作，而不是完全失去进度感知  

**Given** 恢复逻辑工作正常  
**When** 用户刷新等待页  
**Then** 页面可以恢复到正确阶段而不是从 0% 开始伪装重跑  
**And** 系统不会依赖数据库回放全部历史过程来恢复实时状态  

**Deliverables:**
- SSE reconnect 逻辑
- snapshot 读取逻辑
- `/status` 接口
- 前端降级消费说明

### Story 2.7: Provider Protocol、工厂与优先级注册骨架
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 建立统一 Provider Protocol、工厂与优先级注册机制，  
So that LLM、TTS 与未来外部能力都能在不侵入业务逻辑的前提下切换与扩展。  

**Acceptance Criteria:**
**Given** 业务代码需要调用 LLM 或 TTS  
**When** 开发者接入 Provider  
**Then** 业务层通过统一 Protocol 与工厂获取能力实例  
**And** 不直接依赖某个厂商 SDK 或硬编码 vendor 判断  

**Given** 系统存在主 Provider 与备 Provider  
**When** 工厂装配能力列表  
**Then** 各 Provider 可配置优先级、超时、重试与健康状态来源  
**And** 后续业务域无需自行维护另一套主备逻辑  

**Given** 未来需要接入新模型或新语音服务  
**When** 新 Provider 实现 Protocol  
**Then** 可在不改动业务层调用代码的情况下注册到工厂  
**And** 原有业务流程保持不变，仅通过配置或装配变更完成接入  

**Deliverables:**
- `providers/protocols.py`
- `ProviderFactory`
- 优先级注册规则
- demo provider

### Story 2.8: Provider 健康检查、Failover 与缓存策略
**Story Type:** `Backend Story`  
As a 等待外部能力返回的用户，  
I want 当主 Provider 不可用时系统能够自动切换，  
So that 我不会因为单点外部故障就完全失去结果。  

**Acceptance Criteria:**
**Given** 主 Provider 健康、可用且响应正常  
**When** 业务层发起调用  
**Then** 请求优先走主 Provider  
**And** 业务层不需要感知具体切换细节  

**Given** 主 Provider 发生超时、限流、不可达或连续失败  
**When** 工厂判定主 Provider 不健康  
**Then** 系统自动切换到备 Provider  
**And** 前端可在 SSE 或结果数据中观察到 `provider_switch` 或等效切换语义  

**Given** 系统需要避免每次调用都重复探测健康状态  
**When** 健康信息写入 Redis  
**Then** 使用 `xm_provider_health:{provider}` 或等效 key 进行短 TTL 缓存  
**And** 健康信息不会被长期保留导致系统长期误判  

**Deliverables:**
- 健康检查逻辑
- Failover 逻辑
- Redis 健康缓存
- 切换事件示例

---

## Epic 3: 单题视频输入与任务创建
用户可以通过统一输入区提交文本或图片题目，完成任务创建并进入可恢复的等待态起点。  
**FRs covered:** `FR-UI-003`、`FR-VS-001`  
**NFRs covered:** `NFR-SE-003`、`NFR-UX-001`、`NFR-UX-003`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`

### Objective
Epic 3 只解决“视频主链路的前半段”：
- 如何输入；
- 如何校验；
- 如何创建任务；
- 如何进入等待页。  

它不包含：
- 理解、分镜、Manim、TTS、合成；
- 视频结果页；
- Companion；
- Learning Coach。  

### Scope
- `/video/input`
- 文本输入
- 图片上传
- 粘贴图片
- 前置 OCR / 输入预处理接口
- 视频任务创建
- 任务 ID 返回
- 创建后跳转等待页

### Out of Scope
- 视频 stage 执行
- 播放器
- 历史回看
- 伴学侧栏
- 证据检索
- 学后测验

### Dependencies
- 依赖 `Epic 1` 的认证与风格配置壳层。  
- 依赖 `Epic 2` 的任务契约与状态机。  
- 不强依赖视频流水线执行实现。  

### Entry Criteria
- 视频任务最小字段已稳定。  
- `/video/input` 页面高保真稿与关键状态说明已稳定。  

### Exit Criteria
- 用户可从输入页创建视频任务；  
- 三种输入方式可在同一输入区完成；  
- 创建成功后可进入等待页；  
- 页面在 mock 与 real 下状态闭环一致。  

### Parallel Delivery Rule
Story `3.1` 先冻结视频任务创建契约与 mock task。  
之后前端输入页和后端任务创建接口可并行推进。  
后端不需要等待真实 OCR 最优解，前端也不需要等待真实流水线跑通。  

### Story List
- Story 3.1: 视频任务创建契约与 mock task 基线  
- Story 3.2: 视频输入页壳层与多模态输入交互  
- Story 3.3: 图片 / OCR 前置预处理接口  
- Story 3.4: 视频任务创建接口与初始化运行态  
- Story 3.5: 创建后跳转等待页与任务上下文承接  

### Story 3.1: 视频任务创建契约与 mock task 基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结视频任务创建所需的接口、字段与 mock 样例，  
So that 输入页、创建接口和等待页可以围绕同一任务起点并行开发。  

**Acceptance Criteria:**
**Given** 视频域进入实施阶段  
**When** 视频任务创建契约首次发布  
**Then** 至少明确创建请求字段、成功响应字段、校验失败响应、权限失败响应与任务初始化状态  
**And** 前端不需要猜测 `taskId`、`inputType`、`agentStyle`、`sourcePayload` 等字段含义  

**Given** 前端在 mock 模式下开发  
**When** 用户从输入页创建视频任务  
**Then** mock handler 能返回与真实契约一致的 task 初始信息  
**And** 页面能够顺利跳转到等待页而不依赖真实后端  

**Given** 同一接口既支持文本输入也支持图片输入  
**When** 前端读取契约  
**Then** 能明确区分不同输入类型的最小字段要求  
**And** 不会因为混用字段导致后端校验与前端提交逻辑冲突  

**Deliverables:**
- `POST /api/v1/video/tasks` schema
- 成功 / 失败 payload
- mock create task 样例
- 输入类型说明

### Story 3.2: 视频输入页壳层与多模态输入交互
**Story Type:** `Frontend Story`  
As a 想快速搞懂一道题的用户，  
I want 在一个核心输入区里完成打字、上传图片或粘贴图片，  
So that 我能以最低操作成本发起讲解视频生成。  

**Acceptance Criteria:**
**Given** 用户位于 `/video/input`  
**When** 页面加载完成  
**Then** 页面以单一核心输入区承接文本输入、上传图片与粘贴图片  
**And** 用户不需要在多个互斥页面或多层弹窗之间切换输入方式  

**Given** 用户输入文本、上传 `JPG/PNG` 图片或直接粘贴图片  
**When** 用户准备提交  
**Then** 三种输入方式共享同一个主 CTA  
**And** 页面会明确展示当前输入来源与可编辑状态  

**Given** 当前输入为空、图片格式不支持或内容明显不足  
**When** 用户尝试创建任务  
**Then** 页面返回明确、可恢复的错误提示  
**And** 用户可以在当前页修正后再次提交，而不是被带离流程  

**Given** 用户使用键盘操作  
**When** 焦点在输入区域、上传触发器或主 CTA 上  
**Then** 焦点可见、操作可达、不会因视觉样式消失焦点轮廓  
**And** 页面满足桌面端主流程键盘可达要求  

**Deliverables:**
- `/video/input` 页面
- 文本输入
- 上传图片
- 粘贴图片
- 主 CTA
- 输入态 / 错态 / 禁用态 / 处理中态

### Story 3.3: 图片 / OCR 前置预处理接口
**Story Type:** `Backend Story`  
As a 提交图片题目的用户，  
I want 系统在创建视频任务前完成最小可行的图片校验与 OCR 预处理，  
So that 我可以在任务真正进入主流水线前知道输入是否可用。  

**Acceptance Criteria:**
**Given** 用户上传图片或粘贴图片  
**When** 系统进行前置校验  
**Then** 系统至少校验文件类型、大小、基础可读性或缺失问题  
**And** 明显无效输入会在创建任务前被拦截，而不是进入后续长任务后才失败  

**Given** OCR 可用但识别质量有限  
**When** 系统尝试提取题目文本  
**Then** 可返回结构化预处理结果或建议用户补充手动文本  
**And** 不会把低质量 OCR 结果直接伪装成高可信输入继续执行  

**Given** OCR 失败、识别为空或图像质量不足  
**When** 创建前置校验结束  
**Then** 前端能获得明确错误码或补充建议  
**And** 用户可在当前页继续修改输入，而不是直接丢失已上传内容  

**Deliverables:**
- 图片预处理接口
- OCR 占位或适配接口
- 失败错误码
- 预处理结果 schema

### Story 3.4: 视频任务创建接口与初始化运行态
**Story Type:** `Backend Story`  
As a 想发起视频任务的用户，  
I want 系统在接收输入后创建一个规范的异步任务，  
So that 我可以立即进入等待态并跟踪后续执行。  

**Acceptance Criteria:**
**Given** 用户提交了通过校验的输入  
**When** 系统创建视频任务  
**Then** 返回 `202 Accepted` 或等效异步接受语义  
**And** 返回合法的 `taskId`、任务类型、初始状态与最小查询信息  

**Given** 视频任务已成功创建  
**When** 后端初始化任务运行态  
**Then** Redis 中存在对应任务状态 key 与初始快照  
**And** 任务状态与后续 SSE / status 查询语义保持一致  

**Given** 创建接口遇到输入错误、权限问题或内部错误  
**When** 接口返回失败  
**Then** 失败响应遵循统一 `{code, msg, data}` 结构  
**And** 前端能据此显示可解释错误，而不是只收到模糊失败  

**Deliverables:**
- 创建任务接口
- task_id 生成规则落地
- 初始运行态写入
- 初始化失败处理

### Story 3.5: 创建后跳转等待页与任务上下文承接
**Story Type:** `Integration Story`  
As a 刚提交题目的用户，  
I want 创建成功后立即进入正确的等待页并承接当前任务上下文，  
So that 我不会在任务已经开始执行时还停留在输入页失去进度感。  

**Acceptance Criteria:**
**Given** 用户成功创建视频任务  
**When** 前端收到创建成功响应  
**Then** 页面自动跳转到 `/video/:id/generating` 或等效等待页  
**And** 当前任务 ID、输入摘要与风格选择可在等待页被正确识别  

**Given** 用户在 mock 模式下开发或演示  
**When** 创建动作成功  
**Then** 页面同样进入等待页并加载 mock 任务状态流  
**And** 等待页逻辑不依赖真实视频流水线完成  

**Given** 用户刷新等待页或从浏览器历史返回  
**When** 页面重新初始化  
**Then** 能根据 `taskId` 恢复当前任务上下文  
**And** 不会错误回到空白输入页或要求用户重新提交任务  

**Deliverables:**
- 创建成功跳转逻辑
- 等待页上下文承接
- taskId 恢复逻辑
- mock / real 一致跳转行为

---

## Epic 4: 单题视频生成、结果消费与失败恢复
用户可以完成视频生成主链路、透明等待、结果播放、失败解释、TTS Failover 与视频侧 SessionArtifactGraph 回写。  
**FRs covered:** `FR-UI-004`、`FR-VS-002~009`、`FR-VP-001~003`  
**NFRs covered:** `NFR-PF-002`、`NFR-PF-005`、`NFR-SE-005`  
**Primary Story Types:** `Contract Story`、`Backend Story`、`Frontend Story`、`Persistence Story`

### Objective
Epic 4 负责视频主链路的“执行与消费”部分。  
它包括：
- 理解；
- 分镜；
- Manim 代码生成；
- 修复；
- 沙箱渲染；
- TTS；
- 合成；
- COS 上传；
- 等待页状态机；
- 结果页与播放器；
- 视频侧 SessionArtifactGraph 回写。  

它不包括：
- 输入页；
- Companion 侧栏实现；
- Evidence 面板；
- Learning Coach。  

### Scope
- 视频 stage 契约
- understanding
- storyboard
- manim_gen
- manim_fix
- render sandbox
- TTS synthesis
- compose
- COS upload
- 等待页
- 结果页
- 视频播放器
- 视频侧 artifact 回写

### Out of Scope
- 视频输入创建
- 课堂生成
- Companion 逻辑
- Evidence 检索
- Quiz 逻辑

### Dependencies
- 依赖 `Epic 2` 的任务框架、SSE 与 Provider 抽象。  
- 依赖 `Epic 3` 的视频任务创建起点。  
- 依赖 `Epic 10` 的任务元数据与 artifact 长期回写。  

### Entry Criteria
- 视频 stage 命名与阶段进度分布已稳定。  
- 等待页与结果页关键状态说明稳定。  
- 沙箱安全边界已明确。  

### Exit Criteria
- 视频任务可以完整执行或失败退出；  
- 等待页可以透明展示状态并支持恢复；  
- 结果页可以稳定消费视频；  
- 失败原因和 Provider 切换可解释；  
- 视频侧 artifact 已可供 Companion 消费。  

### Parallel Delivery Rule
Story `4.1` 是前后端的共同前置。  
Story `4.7` 和 `4.8` 可在 `4.1 + Epic 2` 完成后基于 mock 先做。  
Story `4.2 ~ 4.6` 可由后端并行实现，但以统一 stage 契约为边界。  
Story `4.9` 必须在视频结果 schema 稳定后接入。  

### Story List
- Story 4.1: 视频流水线阶段、进度区间与结果契约冻结  
- Story 4.2: 题目理解与分镜生成服务  
- Story 4.3: Manim 代码生成与自动修复链  
- Story 4.4: Manim 沙箱执行与资源限制  
- Story 4.5: TTS 合成与 Provider Failover 落地  
- Story 4.6: FFmpeg 合成、COS 上传与完成结果回写  
- Story 4.7: 视频等待页前端状态机、恢复与降级  
- Story 4.8: 视频结果页、播放器与结果操作  
- Story 4.9: 视频侧 SessionArtifactGraph 回写  

### Story 4.1: 视频流水线阶段、进度区间与结果契约冻结
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结视频流水线的阶段枚举、进度区间和结果 payload，  
So that 等待页、后端 stage 实现和结果页可以围绕一致语义并行开发。  

**Acceptance Criteria:**
**Given** 视频任务存在多个内部阶段  
**When** 团队查看视频流水线契约  
**Then** 至少明确题目理解、分镜生成、Manim 生成、渲染、TTS、合成、上传等阶段名称与显示语义  
**And** 前端无需通过猜测 message 文本判断任务当前所处阶段  

**Given** 某阶段推进进度  
**When** SSE 或 `/status` 返回进度  
**Then** 前端能根据统一 stage 字段与 progress 区间渲染等待态  
**And** 不会因为后端 stage 文案波动导致页面状态机失效  

**Given** 视频任务执行完成  
**When** 前端获取完成结果  
**Then** 至少能稳定获取视频 URL、摘要信息、结果 ID、完成时间与后续动作入口字段  
**And** 结果页不需要等待后续隐式字段补齐后才能展示主体内容  

**Deliverables:**
- 视频 stage 枚举
- progress 区间说明
- 完成结果 schema
- 失败结果 schema
- mock SSE stage 流

### Story 4.2: 题目理解与分镜生成服务
**Story Type:** `Backend Story`  
As a 等待生成讲解视频的用户，  
I want 系统先正确理解题目并生成可执行分镜，  
So that 后续动画与讲解能够围绕清晰结构展开。  

**Acceptance Criteria:**
**Given** 视频任务进入题目理解阶段  
**When** 后端调用理解服务  
**Then** 产出结构化理解结果，至少包含题目摘要、核心知识点或等效中间结果  
**And** 后续分镜服务能够消费该结果而不是重新解析原始输入  

**Given** 分镜生成阶段开始  
**When** 后端基于理解结果构建视频叙事  
**Then** 产出可供 Manim 与 TTS 消费的分镜结构  
**And** 分镜结果符合目标时长与基础阶段数约束，而不是任意长度自由输出  

**Given** 理解或分镜阶段失败  
**When** 任务继续推进判断  
**Then** 系统返回明确错误码或失败事件  
**And** 不会跳过关键中间结果直接把失败暴露为不可解释的最终错误  

**Deliverables:**
- understanding service
- storyboard service
- 中间结果 schema
- 失败错误码映射

### Story 4.3: Manim 代码生成与自动修复链
**Story Type:** `Backend Story`  
As a 等待动画生成的用户，  
I want 系统在生成 Manim 代码后自动尝试修复渲染错误，  
So that 视频主链路在首次失败时仍然有较高概率恢复为可用结果。  

**Acceptance Criteria:**
**Given** 分镜结果已生成  
**When** 系统进入 Manim 代码生成阶段  
**Then** 产出可供沙箱执行的 Manim 代码或等效渲染脚本  
**And** 代码生成结果会与当前任务 ID、分镜上下文建立关联  

**Given** 初次渲染失败  
**When** 系统触发自动修复  
**Then** 按既定修复链执行，例如规则修复优先、必要时再触发 LLM 修复  
**And** 自动修复尝试次数不超过 2 次  

**Given** 修复仍然失败  
**When** 达到修复上限  
**Then** 系统进入明确失败或降级路径  
**And** 不会无限重试、无期限卡在处理中状态，或悄悄吞掉修复失败信息  

**Given** 前端订阅了任务事件  
**When** 修复链执行  
**Then** 前端能通过事件流观察到“尝试修复”“修复成功”“修复失败并降级/失败”等语义  
**And** 用户不会误以为任务卡死不动  

**Deliverables:**
- `manim_gen`
- `manim_fix`
- 修复次数上限控制
- 修复事件输出

### Story 4.4: Manim 沙箱执行与资源限制
**Story Type:** `Backend Story`  
As a 平台与用户，  
I want Manim 渲染始终在受限沙箱中执行，  
So that 系统不会为了提高成功率而突破安全边界。  

**Acceptance Criteria:**
**Given** 系统执行渲染任务  
**When** 任务进入沙箱  
**Then** 沙箱符合既定资源约束，例如 `1 vCPU`、`2 GiB RAM`、`120s/attempt`、`1 GiB tmp`、禁止外网与进程隔离  
**And** 这些限制不允许被业务层绕过  

**Given** 渲染脚本尝试访问不允许的外部资源或越界能力  
**When** 安全策略生效  
**Then** 执行被阻止并记录明确错误类型  
**And** 错误结果可进入统一失败语义，而不是在系统层无声崩溃  

**Given** 渲染超时、资源耗尽或沙箱内部异常  
**When** 系统判定本次尝试失败  
**Then** 任务状态推进为可解释的失败或进入修复链  
**And** 前端能看到与沙箱执行有关的明确错误，而不是笼统的“服务器错误”  

**Deliverables:**
- sandbox executor
- resource limits policy
- security policy
- sandbox error mapping

### Story 4.5: TTS 合成与 Provider Failover 落地
**Story Type:** `Backend Story`  
As a 等待旁白生成的用户，  
I want 系统在主 TTS 服务异常时自动切换备用服务，  
So that 视频合成不因单一语音服务失败而整体报废。  

**Acceptance Criteria:**
**Given** 讲解文本已生成  
**When** 系统进入 TTS 阶段  
**Then** 调用主 TTS Provider 完成语音合成  
**And** 旁白结果可被后续合成阶段消费  

**Given** 主 TTS Provider 超时、报错或不可用  
**When** 系统执行 Failover  
**Then** 自动切换到备 TTS Provider  
**And** 切换信息通过事件流或结果元数据可见  

**Given** 所有 TTS Provider 都失败  
**When** 系统结束 TTS 阶段  
**Then** 返回统一错误码，例如 `TTS_ALL_PROVIDERS_FAILED` 或等效错误  
**And** 任务进入明确失败状态，而不是静默卡住或返回无音频的伪成功结果  

**Deliverables:**
- TTS 调用封装
- 主备切换逻辑
- TTS 失败错误码
- 切换事件示例

### Story 4.6: FFmpeg 合成、COS 上传与完成结果回写
**Story Type:** `Persistence Story`  
As a 等待成片的用户，  
I want 系统在完成动画与音频后合成最终视频并上传对象存储，  
So that 我可以通过稳定 URL 播放和回看结果。  

**Acceptance Criteria:**
**Given** 动画素材与音频都已准备完成  
**When** 系统进入合成阶段  
**Then** 使用统一合成逻辑生成最终视频文件  
**And** 合成失败会返回明确错误，而不是生成损坏或不可播放结果  

**Given** 视频文件已生成  
**When** 系统上传到 COS  
**Then** 返回可用于结果页播放的稳定访问地址或等效资源标识  
**And** 上传失败时任务不会错误地被标记为完成  

**Given** 上传与结果元数据写回成功  
**When** 任务进入完成态  
**Then** 系统回写视频结果摘要、资源 URL、完成时间与必要元数据  
**And** 前端结果页与学习中心都可以基于同一份结果标识再次消费视频结果  

**Deliverables:**
- FFmpeg compose
- COS upload
- 完成结果回写
- 上传失败处理

### Story 4.7: 视频等待页前端状态机、恢复与降级
**Story Type:** `Frontend Story`  
As a 等待结果的用户，  
I want 在等待页实时看到视频生成进度并在断线后恢复状态，  
So that 我知道任务正在推进且不会因为刷新或网络抖动失去上下文。  

**Acceptance Criteria:**
**Given** 视频任务进入执行中状态  
**When** 用户进入 `/video/:id/generating`  
**Then** 页面展示统一等待壳层、当前阶段、阶段说明、总体进度与失败/重试提示  
**And** 至少覆盖理解、分镜、Manim、渲染、TTS、合成、上传等关键阶段  

**Given** 页面运行在 mock 模式  
**When** 用户进入等待页  
**Then** 页面可以稳定消费 mock SSE 或 mock status 状态流  
**And** 所有关键状态包括处理中、失败、恢复中、降级查询中都可被演示与验收  

**Given** SSE 中断、页面刷新或浏览器恢复会话  
**When** 客户端尝试恢复任务状态  
**Then** 系统优先通过 `snapshot` 或 Redis 运行态恢复  
**And** 若事件流不可用则自动降级到 `status` 查询，而不是让页面失去状态  

**Given** 任务失败  
**When** 页面收到失败事件或状态  
**Then** 页面展示可解释失败信息、可用的下一步动作和返回入口  
**And** 不会继续伪装成处理中或自动跳到结果页  

**Deliverables:**
- 等待页页面状态机
- SSE 消费逻辑
- snapshot 恢复逻辑
- status 降级逻辑
- 失败态 UI

### Story 4.8: 视频结果页、播放器与结果操作
**Story Type:** `Frontend Story`  
As a 获得结果的用户，  
I want 在结果页直接播放讲解视频并执行基础控制与结果操作，  
So that 我可以立刻完成一次完整的单题复习体验。  

**Acceptance Criteria:**
**Given** 视频任务已经完成  
**When** 用户进入 `/video/:id`  
**Then** 页面能查询并展示视频 URL、题目摘要、知识点摘要、AI 内容标识与播放器主区域  
**And** 用户不需要跳到其他工具或临时链接页面才能观看结果  

**Given** 用户正在播放视频  
**When** 用户执行播放、暂停、倍速切换、拖动进度条或全屏  
**Then** 这些控制立即生效并反馈到 UI  
**And** 即使用户从历史记录再次打开结果页，也能稳定消费同一套播放器行为  

**Given** 页面运行在 mock 模式  
**When** 页面渲染结果区  
**Then** 可以展示完成态、视频缺失态、权限失败态与加载失败态  
**And** 不需要真实视频流水线跑通后才开始实现页面结构和状态机  

**Given** 结果页包含后续动作入口  
**When** 页面完成渲染  
**Then** `Companion`、`Evidence / Retrieval` 与 `Learning Coach` 仅作为后续动作入口或侧区域能力  
**And** 不会抢占播放器作为主叙事中心的位置  

**Deliverables:**
- 视频结果页
- Video.js 封装
- 结果摘要区
- 后续动作入口区
- AI 内容标识呈现

### Story 4.9: 视频侧 SessionArtifactGraph 回写
**Story Type:** `Persistence Story`  
As a 后续需要 Companion 解释的系统，  
I want 在视频任务完成时回写可被消费的会话产物索引，  
So that Companion 不需要反向依赖视频流水线内部实现。  

**Acceptance Criteria:**
**Given** 视频任务执行成功  
**When** 系统进入结果回写阶段  
**Then** 至少回写视频时间轴、分镜、旁白文本、关键知识点与公式步骤等可索引结构  
**And** 这些数据进入长期存储而不是只停留在 Redis 运行态中  

**Given** Companion 需要围绕当前时间点提问  
**When** Companion 读取视频产物图  
**Then** 能通过统一 artifact schema 获取当前时刻所需的上下文片段  
**And** Companion 不需要调用视频流水线内部临时对象或未持久化中间态  

**Given** 视频产物图回写失败  
**When** 视频主任务本身已完成  
**Then** 系统记录明确错误并阻止把“缺少关键 artifact 的结果”伪装成完全成功  
**And** 后续系统能够区分“视频播放可用”与“Companion 支撑索引缺失”这两种不同状态  

**Deliverables:**
- 视频 artifact schema
- artifact 回写逻辑
- 失败处理逻辑
- Companion 消费说明

---

## Epic 5: 主题课堂学习闭环
用户可以输入主题生成课堂，在等待完成后稳定浏览课堂结果中的幻灯片、讨论、白板内容，并获得会话结束信号。  
**FRs covered:** `FR-UI-002`、`FR-CS-001`、`FR-CS-003~007`  
**NFRs covered:** `NFR-PF-003`、`NFR-PF-006`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Persistence Story`

### Objective
Epic 5 是课堂主链路。  
它包括：
- 主题输入；
- 课堂任务创建；
- 课堂等待页；
- 幻灯片、讨论、白板结果；
- 会话结束信号；
- 课堂侧 artifact 回写。  

它不包括：
- 会话内即时追问；
- 证据深挖；
- 课后 quiz 执行。  

### Scope
- `/classroom/input`
- 课堂任务契约
- 课堂等待页
- classroom generation
- slides
- discussion
- whiteboard layout
- classroom result
- completion signal
- artifact 回写

### Out of Scope
- Companion 提问与白板解释协议
- Evidence 面板
- Learning Coach 页面与逻辑
- 学习中心聚合

### Dependencies
- 依赖 `Epic 1` 的统一入口与风格配置。  
- 依赖 `Epic 2` 的统一任务框架与 SSE。  
- 依赖 `Epic 10` 的课堂任务与 artifact 长期回写。  

### Entry Criteria
- 课堂结果页结构已稳定。  
- 幻灯片 / 讨论 / 白板的最小结果 schema 可冻结。  

### Exit Criteria
- 用户可创建课堂任务并进入等待页；  
- 用户可查看结构化课堂结果；  
- 白板具备基础可读性；  
- 会话结束信号可供 Learning Coach 消费；  
- 课堂侧 artifact 可供 Companion 消费。  

### Parallel Delivery Rule
Story `5.1` 是课堂域所有前后端工作的前置契约。  
Story `5.3` 与 `5.6` 可在 mock session 下先推进。  
Story `5.4`、`5.5`、`5.7`、`5.8` 可由后端与持久化层并行推进，但不得突破已冻结 schema。  

### Story List
- Story 5.1: 课堂任务契约、结果 schema 与 mock session 基线  
- Story 5.2: 主题输入与课堂任务创建  
- Story 5.3: 课堂等待页与统一进度复用  
- Story 5.4: 课堂生成服务与多 Agent 讨论结果  
- Story 5.5: 白板布局与基础可读性规则  
- Story 5.6: 课堂结果页中的幻灯片、讨论与白板浏览  
- Story 5.7: 会话结束信号与课后触发出口  
- Story 5.8: 课堂侧 SessionArtifactGraph 回写  

### Story 5.1: 课堂任务契约、结果 schema 与 mock session 基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 在课堂域先冻结任务契约、结果 schema 和 mock session 数据，  
So that 课堂输入、等待与结果浏览可以并行实现而不依赖真实生成链先完成。  

**Acceptance Criteria:**
**Given** 课堂域进入实施阶段  
**When** 课堂契约首次冻结  
**Then** 任务创建、详情、状态、事件流、结果页所需的 slides、discussion、whiteboard、completion signal 等 schema 被明确约定  
**And** 前后端共享同一套字段语义和样例数据  

**Given** 前端使用 mock 模式开发课堂页面  
**When** 页面消费 classroom adapter  
**Then** 可以稳定模拟输入成功、等待中、完成、失败与恢复态  
**And** 结果页不需要等待真实课堂生成引擎跑通后才开始实现  

**Given** 后续 Companion 与 Learning Coach 需要消费课堂结果  
**When** 团队查看课堂 result schema  
**Then** 能明确哪些字段属于课堂主展示、哪些字段属于 artifact 索引、哪些字段属于会话结束信号  
**And** 不会在后期因为“字段职责不清”重构整套结果结构  

**Deliverables:**
- classroom task schema
- classroom result schema
- completion signal schema
- mock classroom session

### Story 5.2: 主题输入与课堂任务创建
**Story Type:** `Frontend Story`  
As a 想系统学习某个主题的用户，  
I want 通过输入主题发起课堂生成任务，  
So that 我可以快速获得结构化讲解内容。  

**Acceptance Criteria:**
**Given** 用户位于 `/classroom/input`  
**When** 用户输入主题并提交创建请求  
**Then** 系统创建课堂任务并返回可查询的任务 ID 和基础任务信息  
**And** 老师风格与当前会话配置一起稳定透传  

**Given** 主题输入为空、过短或不满足最小约束  
**When** 用户尝试发起课堂任务  
**Then** 页面返回明确、可恢复的输入校验提示  
**And** 用户可在当前页面完成修正并再次提交  

**Given** 视频输入页与课堂输入页需要保持一致心智  
**When** 用户在两个页面之间切换  
**Then** 能感知相似的输入结构与配置位置  
**And** 课堂页文案与说明明确偏向“主题学习”而不是“单题讲解”  

**Deliverables:**
- `/classroom/input` 页面
- 主题输入
- 风格透传
- 输入校验
- 创建跳转逻辑

### Story 5.3: 课堂等待页与统一进度复用
**Story Type:** `Frontend Story`  
As a 等待课堂生成的用户，  
I want 课堂等待页复用统一任务体验并支持恢复，  
So that 我能在熟悉的交互模式里理解课堂任务进度。  

**Acceptance Criteria:**
**Given** 课堂任务已创建且进入执行中  
**When** 用户打开 `/classroom/:id/generating`  
**Then** 页面复用统一进度组件展示阶段状态、阶段描述与恢复动作  
**And** 阶段文案聚焦课堂生成、幻灯片、讨论与白板，而不是视频术语  

**Given** 页面刷新、断线或事件流暂时不可用  
**When** 系统尝试恢复当前课堂任务  
**Then** 客户端通过快照或状态查询恢复当前阶段与文案  
**And** 用户不会因为一次刷新就丢失当前等待上下文  

**Given** 页面运行在 mock 模式  
**When** 前端演示课堂等待态  
**Then** 能覆盖处理中、失败、恢复、降级查询与完成跳转  
**And** 页面不依赖真实课堂生成引擎可用性才具备验收条件  

**Deliverables:**
- 课堂等待页
- 进度组件复用
- 恢复逻辑
- 状态查询降级 UI

### Story 5.4: 课堂生成服务与多 Agent 讨论结果
**Story Type:** `Backend Story`  
As a 想学习某个主题的用户，  
I want 系统基于主题生成结构化课堂与多角色讨论结果，  
So that 我能够获得比纯文本回答更完整的课堂体验。  

**Acceptance Criteria:**
**Given** 课堂任务已创建  
**When** 系统执行课堂生成流程  
**Then** 至少产出课堂摘要、幻灯片结构、多角色讨论片段与白板所需基础内容  
**And** 输出结果符合已冻结 schema，而不是随运行时自由漂移字段结构  

**Given** 课堂包含多 Agent 讨论  
**When** 系统组织讨论结果  
**Then** 每个讨论片段具备角色身份、内容顺序与最小可展示信息  
**And** 前端可以稳定渲染多角色讨论，不需要额外拼装语义  

**Given** 课堂生成失败  
**When** 系统结束本次执行  
**Then** 返回统一失败状态与错误码  
**And** 不会出现“任务已完成但结果结构严重缺失”的伪成功场景  

**Deliverables:**
- classroom service
- discussion generation
- slide generation
- 失败错误映射

### Story 5.5: 白板布局与基础可读性规则
**Story Type:** `Backend Story`  
As a 正在观看课堂的用户，  
I want 白板内容即使复杂也保持基本可读，  
So that 我不会因为公式、步骤和注释重叠而完全看不懂课堂结果。  

**Acceptance Criteria:**
**Given** 课堂结果中包含白板内容  
**When** 系统生成白板布局数据  
**Then** 白板结果至少包含分步结构、主内容区与基础布局信息  
**And** 前端不需要通过猜测坐标或自由布局才能勉强渲染结果  

**Given** 白板内容较长、对象较多或结构复杂  
**When** 布局规则生效  
**Then** 系统优先保证主要步骤可读与不严重重叠  
**And** 即使无法达到理想视觉效果，也要走降级布局而不是输出不可阅读的重叠内容  

**Given** 某些白板片段不适合复杂空间布局  
**When** 系统选择降级表达  
**Then** 可以输出更简化的步骤式结构  
**And** 课堂主链路仍然可用，不因局部白板美观性不足而整体失败  

**Deliverables:**
- whiteboard layout schema
- 基础布局规则
- 降级布局策略
- 可读性检查规则

### Story 5.6: 课堂结果页中的幻灯片、讨论与白板浏览
**Story Type:** `Frontend Story`  
As a 正在学习主题内容的用户，  
I want 在课堂结果页稳定浏览幻灯片、讨论与白板内容，  
So that 我可以获得连续、可读的课堂体验。  

**Acceptance Criteria:**
**Given** 课堂生成已完成  
**When** 用户进入 `/classroom/:id`  
**Then** 页面展示结构化幻灯片、讨论片段和白板内容  
**And** 主内容区与侧边 Companion 区域的职责边界保持清晰  

**Given** 课堂包含多角色讨论或复杂白板内容  
**When** 页面渲染结果  
**Then** 至少可以稳定展示多角色讨论片段和主要白板步骤  
**And** 同一时刻白板主要内容不会发生严重重叠而破坏可读性  

**Given** 页面运行在 mock 模式  
**When** 设计验收课堂结果页  
**Then** 可以分别查看内容完整态、白板降级态、讨论为空态、加载失败态与权限失败态  
**And** 页面无需等待真实课堂生成引擎才开始验证布局与交互  

**Given** 页面存在后续动作入口  
**When** 用户完成课堂浏览  
**Then** `Companion` 与 `Learning Coach` 只作为侧栏或后续入口出现  
**And** 正式 quiz 不会插入课堂主内容流打断主叙事  

**Deliverables:**
- 课堂结果页
- slides viewer
- discussion viewer
- whiteboard viewer
- 后续动作入口

### Story 5.7: 会话结束信号与课后触发出口
**Story Type:** `Integration Story`  
As a 刚完成课堂学习的用户，  
I want 课堂结束时收到清晰的课后入口而不是被强制插入正式答题，  
So that 我可以保持主叙事完整并在合适时机进入后续巩固。  

**Acceptance Criteria:**
**Given** 课堂主叙事进入完成阶段  
**When** 系统输出结束信号  
**Then** 返回可被 Learning Coach 消费的结构化触发信息  
**And** 不会在课堂主内容中强制弹出正式 quiz 流程  

**Given** 用户希望继续巩固  
**When** 用户点击课后入口  
**Then** 页面跳转到后续 checkpoint / quiz / path 流程  
**And** 当前课堂结果页仍然可以被重新打开与回看  

**Given** Learning Coach 尚未真实接通  
**When** 页面仍处于 mock 或半联调阶段  
**Then** 课后入口依然可以基于冻结的跳转参数与 mock 数据工作  
**And** 课堂页不需要等待 Learning Coach 全部完成后才可验收  

**Deliverables:**
- completion signal
- 学后入口参数
- 结果页 CTA
- 与 Learning Coach 的边界说明

### Story 5.8: 课堂侧 SessionArtifactGraph 回写
**Story Type:** `Persistence Story`  
As a 后续需要 Companion 与 Learning Coach 消费课堂内容的系统，  
I want 在课堂完成时回写结构化 artifact 索引，  
So that 会话后能力不需要反向依赖课堂引擎内部实现。  

**Acceptance Criteria:**
**Given** 课堂生成成功  
**When** 系统进入回写阶段  
**Then** 至少回写 slide 结构、讨论步骤、白板步骤、章节摘要与学习信号  
**And** 这些数据进入长期业务存储，而不是只停留在运行时对象中  

**Given** Companion 需要围绕 slide、白板步骤或讨论片段发起解释  
**When** Companion 读取课堂 artifact  
**Then** 能获取统一、可索引、可定位的课堂上下文  
**And** 不需要直接依赖课堂生成服务内部对象或临时缓存  

**Given** Learning Coach 需要基于会话结束信号与知识点摘要生成后续内容  
**When** 其读取课堂长期数据  
**Then** 能通过 artifact 与结束信号获得最小可用上下文  
**And** 不需要重新解析整份课堂原始输出文本  

**Deliverables:**
- 课堂 artifact schema
- artifact 回写逻辑
- Learning signal 回写
- 消费说明

---

## Midpoint Quality Check
为防止本稿再次滑回“表面并行、实际串行”，在进入下半部分 Epic 前，必须通过以下检查：

### Q-01: 是否还有“巨型业务 Epic”吞并底座？
- 已拆分 `Epic 2`
- 已拆分 `Epic 10`
- 视频与课堂不再隐含承担全系统底座

### Q-02: 是否每个业务域都有契约 Story？
- Epic 1: Story 1.1
- Epic 2: Story 2.1 / 2.5
- Epic 3: Story 3.1
- Epic 4: Story 4.1
- Epic 5: Story 5.1

### Q-03: 是否每个页面 Story 都能 mock 先行？
- `/login`
- `/video/input`
- `/video/:id/generating`
- `/video/:id`
- `/classroom/input`
- `/classroom/:id/generating`
- `/classroom/:id`

### Q-04: 是否关键跨域依赖已显式化？
- 视频 artifact -> Companion
- 课堂 artifact -> Companion
- completion signal -> Learning Coach
- 持久化承接 -> 学习中心回看

### Q-05: 是否 AC 可测试？
本稿中所有 AC 均已改写为：
- 页面可见什么；
- 接口返回什么；
- 状态如何变化；
- 失败如何降级；
- 何时允许 mock 与 real 一致切换。  

---

## Implementation Sequencing Advice for Upper Half
### Recommended Start Order
1. Epic 0  
2. Epic 1  
3. Epic 2  
4. Epic 10（至少先完成表结构与防腐层契约）  
5. Epic 3  
6. Epic 4  
7. Epic 5  

### Recommended Real Parallelism
- 前端 A 线：
  - Story 1.2
  - Story 1.4
  - Story 1.5
  - Story 3.2
  - Story 4.7
  - Story 4.8
  - Story 5.2
  - Story 5.3
  - Story 5.6

- 后端 B 线：
  - Story 1.3
  - Story 2.2
  - Story 2.3
  - Story 2.4
  - Story 2.6
  - Story 2.7
  - Story 2.8
  - Story 3.3
  - Story 3.4
  - Story 4.2
  - Story 4.3
  - Story 4.4
  - Story 4.5
  - Story 4.6
  - Story 5.4
  - Story 5.5
  - Story 5.7
  - Story 5.8

### Recommended Joint Freeze Sessions
- Freeze Session A: Story 1.1 + Story 3.1
- Freeze Session B: Story 2.1 + Story 2.5
- Freeze Session C: Story 4.1
- Freeze Session D: Story 5.1

---

## Definition of Done for Upper Half Epics
### Epic 0 Done
- 工程骨架稳定
- adapter + mock 能跑
- schema / OpenAPI 能出
- request_id / task_id 能追踪
- Story 门禁已成文

### Epic 1 Done
- 用户可通过 `/login` 进入受保护页面
- 首页双入口与回跳可用
- 风格配置可透传
- 401 / 403 处理一致

### Epic 2 Done
- 新任务可复用统一任务框架
- SSE 事件结构稳定
- 断线恢复和 `/status` 降级可用
- ProviderFactory 与 Failover 可用
- Redis 运行态 key 具备 TTL

### Epic 3 Done
- 用户可用文本 / 图片创建视频任务
- 任务创建后进入等待页
- mock / real 行为一致
- 输入错误可解释

### Epic 4 Done
- 视频主链路可跑通或明确失败
- 等待页能恢复与降级
- 结果页能稳定播放
- TTS Failover 可观测
- 视频 artifact 回写成功

### Epic 5 Done
- 用户可创建课堂任务并进入等待页
- 课堂结果页可展示 slides / discussion / whiteboard
- 结束信号可输出
- 课堂 artifact 可回写

---

## Risks Addressed by This Upper-Half Design
### R-01: 视频 Epic 吞掉底座导致全局卡死
通过 `Epic 2` 拆出底座，避免视频域成为所有业务域的隐藏依赖中心。  

### R-02: 课堂与视频看似并行，实则等待同一底座
通过显式依赖 `Epic 2`，让真正并行建立在统一底座完成之后，而不是建立在“先做页面壳再赌联调”之上。  

### R-03: 前端所谓 mock 只是静态假图
通过 `Epic 0` 与各契约 Story，要求 mock 必须具备状态流、错误态、权限态与恢复态。  

### R-04: Companion 后续无法接上下文
通过 `Story 4.9` 与 `Story 5.8`，提前把 `SessionArtifactGraph` 作为正式交付物，而不是后期补洞。  

### R-05: Learning Coach 与学习中心后期被迫重构
通过课堂结束信号和 artifact 回写，先把后续消费接口边界钉住。  

---

```markdown
## Epic 6: 会话内伴学与当前时刻解释
用户可以围绕视频当前秒点或课堂当前步骤持续追问，并获得白板解释、连续上下文和清晰降级反馈。  
**FRs covered:** `FR-CP-001~006`  
**NFRs covered:** `NFR-UX-003`、`NFR-AR-004`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Persistence Story`、`Integration Story`

### Objective
Epic 6 负责“会话内即时伴学”这一共享消费层。  
它不是视频引擎，也不是课堂引擎，更不是证据检索主入口。  
它的唯一职责是围绕**当前时刻**解释“现在这一步发生了什么、为什么这样、能不能换种说法”。  

它包括：
- `TimeAnchor` 统一建模；
- 视频 / 课堂上下文适配；
- 当前时刻提问与回答；
- 连续追问与上下文窗口；
- 白板动作协议与结构化降级；
- 问答长期回写；
- 视频页 / 课堂页共用同一套伴学协议。  

它不包括：
- 重新执行视频或课堂生成主链路；
- 充当完整资料库检索主入口；
- 把正式 quiz 插入会话中；
- 在会话内承担长期学习路径规划。  

### Scope
- `TimeAnchor` schema
- companion ask / answer schema
- video context adapter
- classroom context adapter
- whiteboard action schema
- 连续追问上下文窗口
- 降级策略
- 问答与白板动作回写
- 视频页 / 课堂页共用 Companion 组件

### Out of Scope
- Evidence / Retrieval 主检索
- Learning Coach 正式生成
- 视频 / 课堂引擎内部算法
- 学习中心聚合页

### Dependencies
- 强依赖 `Epic 4` 的视频侧 `SessionArtifactGraph`。
- 强依赖 `Epic 5` 的课堂侧 `SessionArtifactGraph`。
- 依赖 `Epic 2` 的统一任务 / 错误码 / Provider 语义。
- 依赖 `Epic 10` 的长期数据回写能力。
- 与 `Epic 7` 存在边界关系，但不依赖 `Epic 7` 完成后才可先做 mock 伴学。  

### Entry Criteria
- 视频与课堂侧 artifact schema 已稳定到可消费。  
- `TimeAnchor` 类型边界已讨论清晰。  
- Companion 侧栏最小 UI 结构已冻结。  

### Exit Criteria
- 视频页与课堂页都能挂载同一套 Companion 交互；
- 所有提问都绑定 `TimeAnchor`；
- 连续追问具备上下文继承；
- 白板解释成功或结构化降级；
- 问答记录已长期回写并可被学习中心消费。  

### Parallel Delivery Rule
Story `6.1` 是本 Epic 所有前后端工作的前置契约。  
Story `6.2` 可在 mock turns 下先做页面侧栏。  
Story `6.3 ~ 6.6` 可由后端并行推进，但都不得绕过 `SessionArtifactGraph` 直接依赖视频 / 课堂引擎内部对象。  
Story `6.7` 的持久化结构应尽早与 `Epic 10` 对齐，避免学习中心后期返工。  

### Story List
- Story 6.1: `TimeAnchor`、turn schema 与 mock Companion turns 基线  
- Story 6.2: 视频 / 课堂共享 Companion 侧栏壳层  
- Story 6.3: 视频与课堂的 Context Adapter  
- Story 6.4: 当前时刻提问与回答服务  
- Story 6.5: 连续追问与上下文窗口管理  
- Story 6.6: 白板动作协议与结构化降级  
- Story 6.7: 问答回写与视频 / 课堂双页复用闭环  

### Story 6.1: `TimeAnchor`、turn schema 与 mock Companion turns 基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结 `TimeAnchor`、提问请求与回答结构，  
So that 视频页和课堂页可以围绕同一 Companion 契约并行建设。  

**Acceptance Criteria:**
**Given** Companion 域开始实施  
**When** 契约首次冻结  
**Then** 视频秒点、课堂步骤、slide、白板段落、讨论片段等锚点类型被统一建模为 `TimeAnchor`  
**And** 每种锚点至少包含 `anchorType`、`anchorId`、`displayLabel` 与所属会话标识  

**Given** 前端在本地以 mock 方式开发 Companion  
**When** 页面请求 companion adapter  
**Then** 可以获得稳定的 mock turns、mock anchor、mock whiteboard actions 和失败降级数据  
**And** 页面逻辑不需要等待真实 Companion 服务跑通  

**Given** 一次提问请求被发起  
**When** 团队查看 request / response schema  
**Then** 能明确知道问题文本、当前锚点、会话类型、上下文摘要、回答文本、追问建议、白板动作与来源字段的位置  
**And** 前端不需要通过解析自然语言猜测后端是否返回了锚点相关解释  

**Deliverables:**
- `TimeAnchor` schema
- turn request / response schema
- whiteboard action schema（最小版本）
- mock Companion turns 数据集

### Story 6.2: 视频 / 课堂共享 Companion 侧栏壳层
**Story Type:** `Frontend Story`  
As a 正在学习的用户，  
I want 在视频页和课堂页都看到结构一致的 Companion 侧栏，  
So that 我在不同会话页里都能以同样方式提问、看回答和看白板解释。  

**Acceptance Criteria:**
**Given** 用户进入视频结果页或课堂结果页  
**When** Companion 侧栏渲染  
**Then** 侧栏至少包含当前锚点、提问框、问答流、白板解释区与失败 / 不可用提示区  
**And** 视频页与课堂页共享同一套核心 UI 结构，而不是两套完全不同组件  

**Given** 页面运行在 mock 模式  
**When** 设计与前端验收侧栏交互  
**Then** 至少能演示空态、首轮提问成功态、连续追问态、白板成功态、白板降级态、权限失败态与服务暂不可用态  
**And** 不依赖真实 Companion 服务完成后才开始实现页面与状态管理  

**Given** 用户当前正在播放视频或浏览课堂  
**When** 用户发起 Companion 提问  
**Then** Companion 不会强制打断主内容区或替换主叙事  
**And** 用户在提问后仍能继续播放视频或浏览课堂主内容  

**Deliverables:**
- CompanionPanel 组件
- 锚点显示组件
- 问答流组件
- 白板解释区组件
- 错误 / 降级态组件

### Story 6.3: 视频与课堂的 Context Adapter
**Story Type:** `Backend Story`  
As a 后端团队，  
I want 通过上下文适配器统一获取视频与课堂当前锚点的上下文，  
So that Companion 不直接耦合到两个内容引擎的内部结构。  

**Acceptance Criteria:**
**Given** 当前会话来自视频页或课堂页  
**When** Companion 服务请求当前上下文  
**Then** 通过 `video_adapter` 或 `classroom_adapter` 从 `SessionArtifactGraph` 与必要运行态窗口中获取上下文  
**And** Companion 服务本身不直接调用视频或课堂引擎内部私有对象  

**Given** 视频与课堂的 artifact 结构不同  
**When** Context Adapter 产出统一上下文  
**Then** 至少返回当前锚点摘要、相邻片段摘要、主内容文本或步骤信息  
**And** 上游 Companion 服务可用统一字段处理，而不是分支判断两个完全不同结构  

**Given** 某个会话 artifact 缺失或锚点无效  
**When** Context Adapter 无法构建完整上下文  
**Then** 返回可解释的缺失状态或降级上下文  
**And** 不直接抛出未处理异常导致整轮伴学失败  

**Deliverables:**
- `video_adapter.py`
- `classroom_adapter.py`
- 统一上下文 DTO
- 缺失 / 无效锚点错误映射

### Story 6.4: 当前时刻提问与回答服务
**Story Type:** `Backend Story`  
As a 正在学习的用户，  
I want 围绕视频当前秒点或课堂当前步骤直接发问，  
So that 我得到的是“现在这一段”的解释，而不是脱离上下文的泛化回答。  

**Acceptance Criteria:**
**Given** 用户在视频结果页或课堂结果页停留在某个具体锚点  
**When** 用户发起提问  
**Then** 系统优先基于当前 `TimeAnchor` 与会话产物图生成回答  
**And** 用户不需要手动重复描述自己处在视频哪一秒或课堂哪一页  

**Given** 当前上下文信息不足  
**When** Companion 处理用户问题  
**Then** 系统仍返回与当前锚点相关的反馈、澄清提示或引导  
**And** 不直接用一个与当前会话无关的泛化答案敷衍用户  

**Given** 当前问题明显超出会话内上下文解释范围  
**When** Companion 生成结果  
**Then** 可以提示用户打开 Evidence 面板继续查资料依据  
**And** 不把资料型问题伪装成当前时刻解释能力的一部分  

**Deliverables:**
- Companion ask API
- 基于锚点的回答逻辑
- 提问范围校验
- 引导到 Evidence 的边界提示

### Story 6.5: 连续追问与上下文窗口管理
**Story Type:** `Backend Story`  
As a 想继续追问的用户，  
I want 进行连续追问并继承上一轮上下文，  
So that 我不需要每次都重复描述前文。  

**Acceptance Criteria:**
**Given** 用户已经完成至少一轮 Companion 对话  
**When** 用户发起“继续解释 / 举例 / 更通俗”等追问  
**Then** 系统继承上一轮上下文窗口和当前锚点  
**And** 用户无需重新输入完整背景  

**Given** 多轮追问持续进行  
**When** 上下文窗口接近约定边界  
**Then** 系统至少保留当前锚点、上一轮问题、上一轮回答摘要与必要会话元信息  
**And** 不会因为窗口截断导致回答与当前轮次脱节  

**Given** Companion 运行态窗口写入 Redis  
**When** 开发者检查存储边界  
**Then** 该窗口具有明确 TTL  
**And** 不会把短期运行态错误地当成长期业务存储保留在 Redis 中  

**Deliverables:**
- Companion 运行态窗口设计
- Redis 窗口存储
- 多轮追问继承逻辑
- 上下文裁剪规则

### Story 6.6: 白板动作协议与结构化降级
**Story Type:** `Backend Story`  
As a 正在理解难点的用户，  
I want 在回答旁看到白板解释，并在失败时得到结构化降级内容，  
So that 我即使遇到异常也能继续理解当前知识点。  

**Acceptance Criteria:**
**Given** 当前问题适合白板辅助解释  
**When** Companion 生成回答  
**Then** 响应中包含可渲染的白板动作或步骤化解释数据  
**And** 前端可以在同一侧栏内按统一协议展示白板结果  

**Given** 白板能力失败、信息不足或当前问题不适合图形化  
**When** 系统执行降级  
**Then** 返回结构化文本解释、分步骤说明或等效降级内容  
**And** Companion 主回答仍然可用，不因白板失败而整体中断  

**Given** 某次白板动作 schema 不合法或前端无法渲染  
**When** 前端消费白板响应  
**Then** 前端可安全退回到文本型降级展示  
**And** 不会让整条问答流因为白板局部失败而崩溃  

**Deliverables:**
- 白板动作协议
- renderer 最小协议说明
- 结构化降级格式
- 白板失败错误码或状态语义

### Story 6.7: 问答回写与视频 / 课堂双页复用闭环
**Story Type:** `Persistence Story`  
As a 回访用户，  
I want 我的 Companion 问答被长期保存且能在视频页和课堂页复用同一套体验，  
So that 我既能重看追问结果，又能在不同会话页获得一致交互。  

**Acceptance Criteria:**
**Given** 一轮 Companion 对话完成  
**When** 系统执行持久化  
**Then** 问答记录至少包含会话类型、锚点、提问、回答、来源、时间戳与必要状态  
**And** 这些数据进入长期业务表供学习中心回看  

**Given** 视频页与课堂页都接入 Companion  
**When** 前端消费同一套 Companion adapter  
**Then** 两个页面共享相同的请求 / 响应语义  
**And** 页面差异只体现在 anchor 类型与上下文来源，而不是两套不兼容接口  

**Given** 某轮问答仅白板部分失败  
**When** 记录被写回  
**Then** 历史记录中可以区分“主回答成功、白板降级”与“整轮问答失败”  
**And** 学习中心在回看时不需要二次推断本轮到底发生了什么  

**Deliverables:**
- `xm_companion_turn` 对应持久化字段
- `xm_whiteboard_action_log` 对应持久化字段
- 回写接口或防腐层调用
- 双页复用说明

---

## Epic 7: 资料依据、来源回看与证据深挖
用户可以上传资料、查看引用来源、追溯证据依据，并在来源抽屉 / 证据面板中继续深挖。  
**FRs covered:** `FR-UI-006`、`FR-KQ-001~006`、`FR-PV-004`  
**NFRs covered:** `NFR-PF-004`、`NFR-SE-004`、`NFR-AR-005`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Persistence Story`、`Integration Story`

### Objective
Epic 7 负责“资料依据层”，回答的是：
- 资料里怎么说？
- 这句话的来源在哪里？
- 术语是什么意思？
- 能不能围绕我的材料继续深挖？  

它不是：
- 当前时刻解释层；
- 正式学习路径规划层；
- 学习中心聚合层。  

### Scope
- 来源抽屉 / 证据面板
- Evidence ask schema
- 文档上传
- 解析状态
- 范围切换
- 引用来源展示
- 术语解释
- EvidenceProvider 抽象
- 问答记录回写

### Out of Scope
- Companion 当前时刻问答主流程
- 正式 quiz
- 学习路径保存
- 学习中心总聚合页

### Dependencies
- 依赖 `Epic 2` 的任务框架与 Provider 抽象。
- 依赖 `Epic 6` 的边界约束，以避免 Companion 与 Evidence 语义混淆。
- 依赖 `Epic 10` 的问答记录长期承接。
- 可在 mock 模式下先推进，不必等待真实外部平台完全接通。  

### Entry Criteria
- 来源抽屉 / 面板的 UI 结构已冻结。  
- 文档上传与解析状态语义已初步确定。  
- Evidence 与 Companion 的边界已成文。  

### Exit Criteria
- 用户可在结果页 / 学习中心打开证据面板；
- 可上传资料并查看解析状态；
- 问答尽可能展示来源；
- 术语可在同一面板解释；
- 历史证据记录可被长期回看。  

### Parallel Delivery Rule
Story `7.1` 是 Evidence 域所有工作的共同前置。  
Story `7.2` 可在 mock citation 数据下先做。  
Story `7.3` 与 `7.4` 可并行推进，一个负责外部能力适配，一个负责任务化解析状态。  
Story `7.6` 要尽早与 `Epic 9` 的学习中心聚合字段对齐。  

### Story List
- Story 7.1: Evidence 契约、来源抽屉 schema 与 mock 数据基线  
- Story 7.2: 来源抽屉 / 证据面板前端  
- Story 7.3: EvidenceProvider 适配层与外部能力编排  
- Story 7.4: 文档上传、解析状态与范围切换  
- Story 7.5: 引用来源展示与术语解释  
- Story 7.6: 证据问答回写与学习中心回看  

### Story 7.1: Evidence 契约、来源抽屉 schema 与 mock 数据基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结证据问答契约、来源抽屉 payload 和 mock 数据，  
So that 结果页与学习中心中的证据面板可以不等待真实检索链先完成。  

**Acceptance Criteria:**
**Given** Evidence / Retrieval 域开始实施  
**When** 契约首次冻结  
**Then** 证据提问、来源引用、术语解释、文档上传状态、历史记录与错误 payload 被统一定义  
**And** 当前版本明确只支持来源抽屉 / 证据面板承载，而不新增学生端独立 `/knowledge` 页面  

**Given** 前端以 mock 模式开发证据面板  
**When** 页面请求 evidence adapter  
**Then** 可以稳定获得引用片段、来源摘要、解析状态和失败样例  
**And** 结果页与学习中心对 evidence 数据的渲染逻辑不依赖真实服务上线  

**Given** Evidence 与 Companion 同时存在于结果页  
**When** 团队查看两个域的 schema  
**Then** 能明确区分“当前时刻解释”与“资料依据问答”的字段语义  
**And** 不会在页面或接口层把二者混成一套问答协议  

**Deliverables:**
- evidence ask schema
- citation schema
- upload status schema
- mock evidence dataset

### Story 7.2: 来源抽屉 / 证据面板前端
**Story Type:** `Frontend Story`  
As a 想知道“资料里怎么说”的用户，  
I want 从结果页或学习中心打开来源抽屉 / 证据面板，  
So that 我可以在当前上下文内补充资料依据而不用跳转新页面。  

**Acceptance Criteria:**
**Given** 用户位于视频结果页、课堂结果页或学习中心  
**When** 用户点击“查看依据”或发起资料类提问  
**Then** 当前页面内打开来源抽屉 / 证据面板并发起检索  
**And** 不会跳转到新的学生端独立资料页面  

**Given** 面板打开  
**When** 页面渲染内容  
**Then** 至少包含来源范围、资料上传入口、问答区、引用片段区、术语动作区与历史切换区  
**And** 面板结构满足 UX 对非路由资料能力的要求  

**Given** 页面运行在 mock 模式  
**When** 验收证据面板  
**Then** 至少能演示首次提问态、已有历史态、无引用态、上传解析中态、术语解释态、权限失败态与服务失败态  
**And** 页面不依赖真实检索链上线后才开始实现  

**Deliverables:**
- EvidenceDrawer / EvidencePanel
- 历史切换区
- 引用片段区
- 上传区
- 提问与深挖区

### Story 7.3: EvidenceProvider 适配层与外部能力编排
**Story Type:** `Backend Story`  
As a 后端团队，  
I want 通过 `EvidenceProvider` 抽象接入外部检索与资料能力，  
So that 业务层不被腾讯云 ADP 或其他具体平台绑定死。  

**Acceptance Criteria:**
**Given** 业务层需要进行证据问答或术语解释  
**When** 系统调用 Evidence 能力  
**Then** 通过统一 `EvidenceProvider` 接口完成调用  
**And** 业务代码不直接依赖具体平台返回结构  

**Given** 当前默认实现是 Tencent ADP  
**When** 团队替换或增加其他实现  
**Then** 只需新增 Provider 实现与装配  
**And** 上层 evidence service 与前端 schema 不需要大规模重写  

**Given** 外部平台返回结构与内部 schema 存在差异  
**When** 适配层进行映射  
**Then** 会转换为内部冻结的 evidence response 结构  
**And** 前端不需要感知外部平台 response 的杂质与不稳定字段  

**Deliverables:**
- `EvidenceProvider` protocol
- Tencent 默认实现
- 映射层
- 错误映射与限流处理

### Story 7.4: 文档上传、解析状态与范围切换
**Story Type:** `Integration Story`  
As a 有自带资料的用户，  
I want 上传教材或讲义并切换检索范围，  
So that 证据检索可以真正围绕我的课程资料展开。  

**Acceptance Criteria:**
**Given** 用户位于来源抽屉 / 证据面板  
**When** 用户上传教材、讲义或其他支持格式文档  
**Then** 面板展示上传中、解析中、成功或失败状态  
**And** 用户可以在同一面板完成重试，而不是跳到其他管理页面  

**Given** 文档解析是长耗时过程  
**When** 系统接收解析任务  
**Then** 文档解析遵循统一任务模型、状态流与错误码  
**And** 前端可通过状态流而不是盲等方式感知解析进度  

**Given** 用户拥有多个来源范围或解析后的资料  
**When** 用户切换当前检索范围  
**Then** 当前证据上下文刷新并反馈选中态  
**And** 新一轮问答明确绑定到所选范围，而不是隐式混用多个资料池  

**Deliverables:**
- 文档上传接口
- 解析任务创建
- 解析状态消费
- 范围切换逻辑

### Story 7.5: 引用来源展示与术语解释
**Story Type:** `Frontend Story`  
As a 需要理解依据的用户，  
I want 在答案里看到引用来源并进一步解释术语，  
So that 我可以确认答案依据并读懂专业表达。  

**Acceptance Criteria:**
**Given** 证据问答返回可引用的文档片段  
**When** 用户查看回答详情  
**Then** 页面展示来源片段、章节标记或原文跳转线索  
**And** 不用无来源的纯结论替代有依据的回答  

**Given** 回答中包含专业术语或难词  
**When** 用户点击术语解释动作  
**Then** 系统返回简明解释并保持在当前证据面板上下文内  
**And** 术语解释不会把用户带离当前问答链路  

**Given** 某次问答没有可靠引用来源  
**When** 页面渲染结果  
**Then** 页面会明确展示“暂无可展示引用”或等效状态  
**And** 不会伪造来源或把推测性内容包装成已引用结论  

**Deliverables:**
- citation UI
- 术语解释动作
- 无引用状态呈现
- 引用点击线索交互

### Story 7.6: 证据问答回写与学习中心回看
**Story Type:** `Persistence Story`  
As a 回访用户，  
I want 之前的证据问答被保存并可在学习中心再次打开，  
So that 我可以围绕同一资料持续学习而不用重复提问。  

**Acceptance Criteria:**
**Given** 一次有效证据问答完成  
**When** 系统执行持久化  
**Then** 至少保存问题、回答摘要、来源、范围、时间戳与必要状态  
**And** 记录进入长期业务数据而不是只停留在 Redis 运行态中  

**Given** 用户从学习中心或结果页回看历史证据记录  
**When** 页面加载该条记录  
**Then** 用户可以看到原问题、回答和来源摘要  
**And** 页面不需要再次发起新的检索才能展示已保存结果  

**Given** 某次问答关联了上传资料或范围设置  
**When** 记录被写回  
**Then** 历史记录中保留来源范围信息或等效标识  
**And** 用户在回看时不会失去“当时是基于哪份资料问的”这一关键信息  

**Deliverables:**
- `xm_knowledge_chat_log` 对应字段
- 回写逻辑
- 学习中心回看最小详情结构
- 历史范围字段映射

---

## Epic 8: 学后巩固、测验与学习路径
用户可以在会话后完成 checkpoint、quiz、错题沉淀、推荐获取与学习路径规划。  
**FRs covered:** `FR-LA-001~005`  
**NFRs covered:** `NFR-UX-003`、`NFR-AR-005`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Persistence Story`、`Integration Story`

### Objective
Epic 8 负责“会话后层”。  
它不进入视频 / 课堂主叙事，而是在会话结束后接手：
- checkpoint；
- quiz；
- wrongbook；
- recommendation；
- path。  

它回答的问题是：
- 我学会了吗？
- 哪些地方错了？
- 接下来该怎么学？  

### Scope
- Learning Coach 入口
- checkpoint
- quiz
- recommendation
- wrongbook
- path planning
- path save / adjust
- 会话后入口承接

### Out of Scope
- 会话内即时追问
- 资料依据面板
- 学习中心总聚合页
- 个人资料与设置

### Dependencies
- 依赖 `Epic 5` 的课堂结束信号；视频侧如需接入，也依赖视频结果后的后续动作入口。
- 依赖 `Epic 6` 的问答沉淀作为学习行为参考。
- 依赖 `Epic 7` 的资料能力作为部分增强来源。
- 依赖 `Epic 10` 的 quiz、path、wrongbook 等长期承接。  

### Entry Criteria
- 会话后路由与页面边界已冻结。  
- `checkpoint / quiz / path` 的最小交互状态说明已稳定。  

### Exit Criteria
- 用户可从会话结束后进入 Learning Coach；
- checkpoint 可快速完成并给出反馈；
- quiz 可生成、提交、判分、解析；
- wrongbook 与 recommendation 可沉淀；
- path 可生成、保存与再次打开。  

### Parallel Delivery Rule
Story `8.1` 是全部 Learning Coach 页面与后端能力的前置契约。  
Story `8.2` 可在会话后入口冻结后与页面并行。  
Story `8.3`、`8.4`、`8.5`、`8.6` 可分别推进，但需遵守同一结果结构与长期数据边界。  
Story `8.7` 必须在学习中心聚合前完成字段对齐。  

### Story List
- Story 8.1: 学后入口契约与 `checkpoint / quiz / path` schema 冻结  
- Story 8.2: 会话后入口与 Learning Coach 路由承接  
- Story 8.3: 轻量 checkpoint 生成与反馈  
- Story 8.4: 正式 quiz 生成、判题与解析  
- Story 8.5: 错题本与知识推荐  
- Story 8.6: 学习路径规划、保存与调整  
- Story 8.7: Learning Coach 长期数据回写  

### Story 8.1: 学后入口契约与 `checkpoint / quiz / path` schema 冻结
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结学后入口和 `checkpoint / quiz / path` 的契约，  
So that 视频 / 课堂结束后的后续页面可以并行开发。  

**Acceptance Criteria:**
**Given** Learning Coach 域进入实施  
**When** 学后入口契约被首次冻结  
**Then** 会话结束信号、checkpoint、quiz、推荐、path 的基础 payload 与状态语义被统一定义  
**And** 前端可以基于同一份 mock 数据直接推进页面和状态流开发  

**Given** 不同来源会话都可触发 Learning Coach  
**When** 团队查看入口参数  
**Then** 能明确区分来源会话类型、来源记录 ID、起始知识点或等效上下文  
**And** 后续页面不需要再去猜测本次学后流程是从视频还是课堂进入的  

**Given** 前端需要 mock 完整状态流  
**When** 页面构造本地演示数据  
**Then** 至少覆盖 checkpoint 快速完成、quiz 多状态、推荐返回、path 保存成功与失败等关键场景  
**And** 不把“等待真实 AI 能力上线”当作页面实现阻塞前提  

**Deliverables:**
- 学后入口 schema
- checkpoint schema
- quiz schema
- recommendation schema
- path schema
- mock datasets

### Story 8.2: 会话后入口与 Learning Coach 路由承接
**Story Type:** `Integration Story`  
As a 刚完成一段学习的用户，  
I want 从视频或课堂结束后顺畅进入 Learning Coach，  
So that 我可以在合适的时机继续做巩固而不是被强行打断主叙事。  

**Acceptance Criteria:**
**Given** 用户完成视频或课堂主内容  
**When** 页面展示后续动作  
**Then** 用户可通过明确 CTA 进入 checkpoint、quiz 或 path  
**And** 当前结果页仍然可以被保留与回看，而不是被 Learning Coach 强制覆盖  

**Given** 页面运行在 mock 模式  
**When** 用户点击继续学习  
**Then** 可以基于冻结的路由参数和 mock 数据进入相应流程  
**And** 不需要等待真实 quiz 或路径规划服务完全可用  

**Given** 用户中途退出 Learning Coach  
**When** 用户返回原结果页或学习中心  
**Then** 当前会话来源关系仍然可追踪  
**And** 不会出现“进入学后流程后找不到原课堂 / 视频结果”的断链体验  

**Deliverables:**
- 路由承接逻辑
- 来源会话参数透传
- 返回原结果的链路
- 后续动作 CTA 规则

### Story 8.3: 轻量 checkpoint 生成与反馈
**Story Type:** `Backend Story`  
As a 刚完成一次会话的用户，  
I want 先做一个低打扰的 checkpoint，  
So that 我可以快速判断自己是否理解关键点。  

**Acceptance Criteria:**
**Given** 用户刚完成视频或课堂会话  
**When** 用户选择进入 checkpoint  
**Then** 系统返回 `1-3` 题轻量检查内容和快速反馈结构  
**And** 用户可以在短时间内完成，不被迫进入冗长作答流程  

**Given** 用户完成 checkpoint  
**When** 结果返回  
**Then** 页面展示明确的通过 / 需要补充提示与下一步动作  
**And** 用户可以选择结束本次流程或继续进入正式 quiz  

**Given** 系统无法生成理想 checkpoint  
**When** 服务降级  
**Then** 仍返回最小可行的轻量检查或明确失败提示  
**And** 不把 checkpoint 直接扩大成完整 quiz 流程来掩盖问题  

**Deliverables:**
- checkpoint generation
- checkpoint result schema
- 降级策略
- 继续进入 quiz 的衔接规则

### Story 8.4: 正式 quiz 生成、判题与解析
**Story Type:** `Backend Story`  
As a 想正式检验掌握程度的用户，  
I want 完成课后 quiz 并获得逐题解析，  
So that 我能明确知道自己哪里真正理解、哪里还没掌握。  

**Acceptance Criteria:**
**Given** 用户进入 quiz 流程  
**When** 系统生成题目  
**Then** 返回稳定题目结构、选项、正确答案承载字段与解析字段  
**And** MVP 题型以单选题为主，不混入尚未支持的复杂题型  

**Given** 用户提交答案  
**When** 判题完成  
**Then** 页面展示得分、单题对错、解析和总结信息  
**And** 本次结果被保存为长期业务数据供后续回看  

**Given** quiz 判题或解析阶段异常  
**When** 系统降级处理  
**Then** 返回明确失败或部分结果状态  
**And** 不会出现“得分已出但单题解析全部缺失且无说明”的伪成功结果  

**Deliverables:**
- quiz generation
- submit & judge
- explanation schema
- result summary

### Story 8.5: 错题本与知识推荐
**Story Type:** `Backend Story`  
As a 想继续提升的用户，  
I want 系统把错题和下一步推荐沉淀下来，  
So that 我可以立刻知道后续应该补哪里。  

**Acceptance Criteria:**
**Given** checkpoint 或 quiz 暴露薄弱点  
**When** 系统完成结果总结  
**Then** 生成错题条目和推荐摘要  
**And** 错题与推荐不会被混入无关的历史记录类型中  

**Given** 推荐结果与证据检索结果都存在  
**When** 用户在后续页面查看  
**Then** 推荐结果在语义上明确表示“接下来学什么”  
**And** 不会与“资料依据怎么说”的 Evidence 结果混淆  

**Given** 错题需要后续回看  
**When** 用户再次进入学习中心  
**Then** 可以找到错题入口和推荐入口  
**And** 两者具备稳定的结果标识和来源关系  

**Deliverables:**
- wrongbook entry schema
- recommendation schema
- 与 quiz / checkpoint 的关联逻辑
- 后续回看标识

### Story 8.6: 学习路径规划、保存与调整
**Story Type:** `Frontend Story`  
As a 想进行阶段性学习的用户，  
I want 根据目标和周期生成学习路径并保存，  
So that 我可以把单次学习扩展成连续计划。  

**Acceptance Criteria:**
**Given** 用户设置学习目标和周期  
**When** 发起路径规划请求  
**Then** 系统返回按阶段组织的学习计划  
**And** 计划至少包含阶段目标、行动项和下一步建议  

**Given** 用户保存、再次打开或调整已生成路径  
**When** 页面加载路径结果  
**Then** 用户可以继续查看、编辑或重新执行该路径  
**And** 已保存路径不会因为服务失败或页面刷新被静默覆盖  

**Given** 页面运行在 mock 模式  
**When** 验收 path 页面  
**Then** 至少覆盖目标选择、周期选择、计划生成成功、生成失败、保存成功、保存失败与再次打开态  
**And** 页面不依赖真实路径规划服务先跑通才可进入开发  

**Deliverables:**
- path 页面
- 目标 / 周期配置
- 保存 / 调整交互
- mock 路径状态流

### Story 8.7: Learning Coach 长期数据回写
**Story Type:** `Persistence Story`  
As a 回访用户与平台，  
I want Learning Coach 的关键结果被长期保存，  
So that 这些结果可以进入学习中心回看与运营审计边界。  

**Acceptance Criteria:**
**Given** checkpoint、quiz、wrongbook、recommendation 或 path 已生成  
**When** 系统执行持久化  
**Then** 关键结果进入 RuoYi 业务表 / MySQL 或等效长期存储  
**And** 不会只停留在运行态缓存中  

**Given** 学习中心需要聚合这些结果  
**When** 学习中心拉取长期数据  
**Then** 至少能读取结果类型、摘要、来源会话、时间、状态与打开详情所需标识  
**And** 不需要重新执行一次 Learning Coach 流程才能展示历史数据  

**Given** 某类结果仅部分成功  
**When** 进行回写  
**Then** 能区分“已生成但待完善”“已完成”“失败”等状态  
**And** 不会在学习中心中把半成品错误标记为完整结果  

**Deliverables:**
- `xm_quiz_result`
- `xm_learning_path`
- wrongbook / recommendation 对应长期字段
- 持久化映射说明

---

## Epic 9: 学习中心聚合、个人管理与长期回看
用户可以在学习中心聚合查看历史、收藏、测验结果与推荐内容，并管理个人资料与平台设置。  
**FRs covered:** `FR-UM-003`、`FR-UI-005`、`FR-UI-007`、`FR-UI-008`、`FR-LA-006`、`FR-LR-001~004`  
**NFRs covered:** `NFR-UX-005`、`NFR-UX-003`、`NFR-PF-001`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Integration Story`

### Objective
Epic 9 负责长期沉淀的“前台消费层”。  
它聚合：
- 历史记录；
- 收藏；
- Companion 回看；
- Evidence 回看；
- checkpoint / quiz / wrongbook / recommendation / path 回看；
- 个人资料；
- 设置与 i18n 预留。  

它不负责：
- 长期数据如何落库；
- 后台审计如何实现；
- 具体 Learning Coach 生成逻辑。  

### Scope
- `/learning`
- `/history`
- `/favorites`
- `/profile`
- `/settings`
- 聚合卡片 schema
- 分页列表
- 详情打开入口
- 收藏 / 取消收藏 / 删除
- i18n 资源接入规则

### Out of Scope
- RuoYi 业务表本身的建表
- 后台 CRUD 页面
- Learning Coach 生成服务
- Evidence 外部能力适配

### Dependencies
- 依赖 `Epic 10` 的长期数据承接。
- 依赖 `Epic 6`、`Epic 7`、`Epic 8` 的结果字段稳定。
- 可在 mock 数据集下先开发页面，不阻塞于真实后端全部完成。  

### Entry Criteria
- 学习中心域页面边界冻结：`/learning` 聚合、`/history` 与 `/favorites` 为学习中心域、`/profile` 与 `/settings` 分离。  
- 聚合卡片结构、分页参数、时间格式、空态 / 错态说明稳定。  

### Exit Criteria
- 用户可在 `/learning` 聚合查看主要学习结果；
- `/history`、`/favorites` 可分页查看与管理；
- `/profile` 与 `/settings` 不混入学习结果；
- i18n 关键静态文案进入资源管理；
- 页面可在 mock / real 下保持一致状态机。  

### Parallel Delivery Rule
Story `9.1` 是学习中心与个人域页面的前置契约。  
Story `9.2`、`9.3`、`9.4` 可在 mock 数据集下并行推进。  
真实联调仅在 `Epic 10` 与对应业务域长期数据 schema 稳定后进行。  

### Story List
- Story 9.1: 学习中心聚合契约、分页结构与 mock 数据集  
- Story 9.2: 学习中心结果回看与入口整合  
- Story 9.3: 历史记录与收藏管理  
- Story 9.4: 个人资料与设置管理  
- Story 9.5: i18n 架构预留与关键静态文案资源化  

### Story 9.1: 学习中心聚合契约、分页结构与 mock 数据集
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结学习中心聚合 schema、分页结构与 mock 数据集，  
So that 聚合页、历史页、收藏页与结果回看都可以并行开发。  

**Acceptance Criteria:**
**Given** 学习中心域开始实施  
**When** 聚合契约首次冻结  
**Then** `/learning`、`/history`、`/favorites` 所需的分页字段、聚合卡片结构和结果摘要字段被统一定义  
**And** 前端可以直接消费 mock 数据集建设完整列表、空态、错态和权限态  

**Given** 学习中心需要聚合多种结果类型  
**When** 团队查看聚合卡片 schema  
**Then** 能明确区分视频、课堂、Companion、Evidence、checkpoint、quiz、wrongbook、path 等结果类型  
**And** 每类结果至少具备统一的标题、摘要、时间、状态、来源与打开动作字段  

**Given** 前端在本地切换 mock 或真实 adapter  
**When** 学习中心页面读取列表与详情  
**Then** 页面状态管理和分页逻辑保持不变  
**And** 无需为不同后端实现额外维护第二套展示逻辑  

**Deliverables:**
- 聚合卡片 schema
- 分页 schema
- mock learning center dataset
- 结果类型枚举

### Story 9.2: 学习中心结果回看与入口整合
**Story Type:** `Frontend Story`  
As a 回访用户，  
I want 在学习中心统一查看视频、课堂、Companion、证据问答、checkpoint、quiz 和推荐结果，  
So that 我能把所有学习结果作为一个连续旅程来回看。  

**Acceptance Criteria:**
**Given** 用户进入 `/learning`  
**When** 页面加载完成  
**Then** 页面按聚合维度展示至少历史结果、测验结果、推荐与继续学习入口  
**And** 用户能够从同一聚合页重新打开对应结果详情  

**Given** 某类结果为空、查询失败或权限不足  
**When** 学习中心渲染该模块  
**Then** 页面展示明确的空态、错态或权限提示  
**And** 其他模块仍保持可用而不会被整体拖垮  

**Given** 页面运行在 mock 模式  
**When** 验收聚合页  
**Then** 至少能覆盖多类型混合列表、单类型为空、某模块失败、全部为空和权限失败五类场景  
**And** 页面不需要等待所有真实结果源联通后才开始开发  

**Deliverables:**
- `/learning` 页面
- 聚合模块渲染
- 详情打开入口
- 继续学习入口

### Story 9.3: 历史记录与收藏管理
**Story Type:** `Frontend Story`  
As a 已登录用户，  
I want 查看、收藏、取消收藏和删除我的学习记录，  
So that 我可以主动整理自己的学习成果。  

**Acceptance Criteria:**
**Given** 用户已产生课堂、视频、Companion 或 Learning Coach 结果  
**When** 用户进入 `/history` 或 `/favorites`  
**Then** 页面分页展示对应数据并支持跳转到原结果  
**And** 分页结构、时间格式和返回语义与统一约定保持一致  

**Given** 用户执行收藏、取消收藏或删除记录  
**When** 操作成功或失败  
**Then** 页面立即反馈当前状态变化或错误原因  
**And** 删除、收藏等长期数据变更进入 RuoYi 业务承接边界而不是只停留在运行态缓存中  

**Given** 页面运行在 mock 模式  
**When** 演示记录管理  
**Then** 至少覆盖收藏成功、取消收藏成功、删除成功、删除失败、分页加载更多与无数据场景  
**And** 页面状态机不依赖真实后端联调才可完成  

**Deliverables:**
- `/history` 页面
- `/favorites` 页面
- 收藏 / 取消收藏动作
- 删除动作
- 分页加载逻辑

### Story 9.4: 个人资料与设置管理
**Story Type:** `Frontend Story`  
As a 已登录用户，  
I want 在个人中心管理个人资料与平台偏好，  
So that 我可以维护自己的身份信息和使用习惯，而不把学习结果混进个人页。  

**Acceptance Criteria:**
**Given** 用户进入 `/profile` 或 `/settings`  
**When** 页面加载完成  
**Then** `/profile` 只承接资料查看与修改，`/settings` 只承接平台设置与账号偏好  
**And** 学习历史、收藏与学习结果不再回流到个人中心主页  

**Given** 用户修改昵称、头像、学校等基础资料  
**When** 提交修改  
**Then** 页面返回明确成功或失败反馈  
**And** 不会将资料修改与学习中心聚合逻辑混杂在一个页面中处理  

**Given** 页面运行在 mock 模式  
**When** 验收个人域页面  
**Then** 至少能覆盖资料加载成功、保存成功、保存失败、设置切换成功与权限失败场景  
**And** 页面不依赖真实个人资料服务先跑通才开始建设  

**Deliverables:**
- `/profile` 页面
- `/settings` 页面
- 资料编辑表单
- 平台偏好项
- 保存反馈

### Story 9.5: i18n 架构预留与关键静态文案资源化
**Story Type:** `Integration Story`  
As a 前端团队，  
I want 为未来中英双语切换预留架构能力，  
So that MVP 虽默认中文，但不会因后期国际化而大规模返工。  

**Acceptance Criteria:**
**Given** 前端为未来多语言做架构预留  
**When** 页面定义关键静态文案  
**Then** 所有关键静态文本进入 i18n 资源管理而不是硬编码在组件内部  
**And** MVP 默认中文体验保持不变  

**Given** 当前阶段暂不要求完整双语上线  
**When** 前端接入 i18n 框架  
**Then** 页面结构、组件 props 与状态文案组织方式已适配未来扩展  
**And** 不要求本阶段完成所有动态内容翻译  

**Given** 学习中心、个人资料、设置等页面逐步接入资源化文案  
**When** 团队检查页面代码  
**Then** 关键导航、标题、CTA、状态文案具备资源键而非散落硬编码  
**And** 后续补充英文资源时不需要大面积改动组件结构  

**Deliverables:**
- i18n 接入基线
- 关键文案资源化
- 资源键命名规范
- MVP 默认中文策略说明

---

## Epic 10: RuoYi 持久化承接、业务表与防腐层
系统将视频、课堂、Companion、Evidence、Learning Coach 与学习中心所需的长期业务数据统一承接到 RuoYi 业务表 / MySQL / COS，并提供可查询、可回写、可审计边界。  
**FRs covered:** `FR-LR-005`，并间接支撑 `FR-CP-005`、`FR-KQ-006`、`FR-LA-005`、`FR-LA-006`  
**NFRs covered:** `NFR-AR-001`、`NFR-AR-002`、`NFR-CO-001`、`NFR-SE-002`  
**Primary Story Types:** `Contract Story`、`Backend Story`、`Persistence Story`、`Integration Story`

### Objective
Epic 10 是所有长期业务数据的宿主承接层。  
它回答的问题是：
- 什么数据必须进 RuoYi / MySQL？
- 什么数据只能放 Redis 运行态？
- FastAPI 如何通过防腐层与 RuoYi 交互？
- 后台查询与审计边界如何承接？  

它不是：
- 学生端页面；
- 运行时缓存层；
- 独立 ToB 产品域扩展。  

### Scope
- 小麦业务表设计
- RuoYi 业务模块边界
- FastAPI <-> RuoYi 防腐层
- 视频任务元数据回写
- 课堂会话摘要回写
- Companion 问答回写
- Evidence 问答回写
- quiz / path / wrongbook 承接
- 收藏与学习记录承接
- 审计 / 查询边界

### Out of Scope
- Redis 运行态缓存设计
- 前端聚合页实现
- 视频 / 课堂执行逻辑本身
- 外部 AI 平台实现

### Dependencies
- 依赖 `Epic 0` 的工程骨架与契约规范。  
- 被 `Epic 4 / 5 / 6 / 7 / 8 / 9` 依赖。  
- 可先于部分业务域实现基础表结构与防腐层。  

### Entry Criteria
- 长期数据边界已明确：哪些必须进 RuoYi / MySQL / COS。  
- 业务实体命名与最小字段集已讨论完成。  
- RuoYi 不改核心框架、只扩业务模块的原则已确认。  

### Exit Criteria
- 关键长期业务数据都有明确宿主；  
- FastAPI 与 RuoYi 间存在可用防腐层；  
- 业务表足以承接学习中心所需主要回看数据；  
- 后台查询与审计边界稳定；  
- Redis 不再被误用为长期业务存储。  

### Parallel Delivery Rule
Story `10.1` 与 `10.2` 是所有长期数据类 Story 的前置。  
Story `10.3` 可优先落地，以便 FastAPI 尽早接入回写。  
Story `10.4 ~ 10.7` 可与业务 Epic 并行推进，但字段变更必须通过契约变更流程。  
Story `10.8` 需在学习中心与后台查询联调前完成。  

### Story List
- Story 10.1: 长期业务数据边界、业务表清单与字段基线冻结  
- Story 10.2: RuoYi 小麦业务模块与权限承接规则  
- Story 10.3: FastAPI 与 RuoYi 防腐层客户端  
- Story 10.4: 视频与课堂任务元数据长期承接  
- Story 10.5: Companion 与 Evidence 问答长期承接  
- Story 10.6: Learning Coach 结果、错题与路径长期承接  
- Story 10.7: 学习记录、收藏与聚合查询承接  
- Story 10.8: 后台查询、导出与审计边界  

### Story 10.1: 长期业务数据边界、业务表清单与字段基线冻结
**Story Type:** `Contract Story`  
As a 架构与开发协作团队，  
I want 先冻结长期业务数据边界与业务表清单，  
So that 各业务域在回写和查询时不会再争论“这个数据到底该放 Redis 还是 RuoYi”。  

**Acceptance Criteria:**
**Given** 系统存在运行态数据与长期业务数据  
**When** 团队查看数据边界清单  
**Then** 能明确区分哪些数据进入 Redis、哪些进入 RuoYi/MySQL、哪些进入 COS  
**And** 不会把学习记录、收藏、任务元数据或问答历史继续错误存放在 Redis 中  

**Given** 各业务 Epic 需要长期回写  
**When** 团队查看业务表清单  
**Then** 至少能看到视频任务、课堂会话、Companion turn、artifact、whiteboard action、Evidence chat、quiz 结果、learning path、learning record、favorite 等表或等效实体  
**And** 上层业务不需要再各自新建临时表结构  

**Given** 某条数据需要供学习中心回看或后台审计  
**When** 设计其持久化归属  
**Then** 该数据必须进入长期宿主  
**And** 不能以“后面再补表”为借口先长期滞留在运行态缓存中  

**Deliverables:**
- 业务表清单
- 字段基线
- Redis / MySQL / COS 边界清单
- 数据宿主说明

### Story 10.2: RuoYi 小麦业务模块与权限承接规则
**Story Type:** `Integration Story`  
As a 平台团队，  
I want 在 RuoYi 中为小麦业务建立独立业务模块与权限承接规则，  
So that 长期数据、查询与审计能够在既有框架内稳定落位。  

**Acceptance Criteria:**
**Given** 小麦需要接入 RuoYi 作为长期业务宿主  
**When** 团队设计 RuoYi 承接方案  
**Then** 小麦业务通过新增业务模块、业务表、CRUD 与菜单权限扩展，而不修改 RuoYi 核心认证与权限框架  
**And** 架构边界符合“RuoYi 核心稳定，业务模块可扩展”的原则  

**Given** 需要对视频、课堂、学习记录等长期数据进行权限管理  
**When** 配置菜单与按钮权限  
**Then** 小麦业务权限标识遵循统一 `模块:资源:操作` 规则  
**And** FastAPI 不自建第二套独立 RBAC 表结构  

**Given** 后台未来需要承接查询与审计  
**When** 业务模块结构冻结  
**Then** 能支持后续 CRUD、查询、导出等管理扩展  
**And** 当前阶段不把其扩展成新的独立 ToB 产品域  

**Deliverables:**
- `ruoyi-xiaomai` 模块边界
- 权限标识清单
- 菜单 / 按钮权限规则
- 业务模块目录规划

### Story 10.3: FastAPI 与 RuoYi 防腐层客户端
**Story Type:** `Backend Story`  
As a 后端团队，  
I want 通过防腐层而不是直接耦合 RuoYi 领域模型进行交互，  
So that FastAPI 维持功能服务层定位，不膨胀成第二个业务后台。  

**Acceptance Criteria:**
**Given** FastAPI 需要回写或查询长期业务数据  
**When** 它与 RuoYi 交互  
**Then** 通过统一的防腐层客户端、DTO 或适配对象完成  
**And** 不直接依赖 RuoYi 的领域模型、Mapper 或内部服务实现  

**Given** RuoYi 业务字段调整  
**When** 需要更新 FastAPI 侧  
**Then** 优先在防腐层映射中消化差异  
**And** 不把 RuoYi 领域结构变化直接扩散到所有 FastAPI feature 模块  

**Given** 某次回写失败  
**When** FastAPI 处理与 RuoYi 的交互错误  
**Then** 能返回明确的集成失败语义并记录日志  
**And** 不会让业务层收到大量未映射的框架级异常  

**Deliverables:**
- `shared/ruoyi_client.py`
- DTO / mapper 设计
- 回写 / 查询接口封装
- 集成错误映射

### Story 10.4: 视频与课堂任务元数据长期承接
**Story Type:** `Persistence Story`  
As a 平台与回访用户，  
I want 视频和课堂的任务元数据被长期保存，  
So that 结果页回看、学习中心聚合与后台查询有稳定数据来源。  

**Acceptance Criteria:**
**Given** 视频任务或课堂任务创建、执行、完成或失败  
**When** 系统回写元数据  
**Then** 至少保存任务 ID、用户归属、任务类型、状态、摘要、结果资源标识与时间信息  
**And** 这些数据进入长期业务表而不是只依赖 Redis 运行态  

**Given** 任务失败  
**When** 后台或学习中心查询任务  
**Then** 至少能识别失败状态、失败时间和最小错误摘要  
**And** 不会在长期记录中把失败任务隐身掉只留下成功结果  

**Given** 用户从学习中心再次打开视频或课堂结果  
**When** 页面查询该条记录  
**Then** 能通过长期元数据定位到正确的结果详情  
**And** 不需要重新扫描运行态缓存才能恢复结果页入口  

**Deliverables:**
- `xm_video_task`
- `xm_classroom_session`
- 元数据回写
- 查询所需最小字段

### Story 10.5: Companion 与 Evidence 问答长期承接
**Story Type:** `Persistence Story`  
As a 回访用户与平台，  
I want 会话伴学与资料依据问答被长期保存，  
So that 学习中心能够回看问答过程，后台也能进行审计与分析。  

**Acceptance Criteria:**
**Given** 一轮 Companion 或 Evidence 问答结束  
**When** 系统执行回写  
**Then** 至少保存问题、回答摘要、来源、锚点或范围、时间戳与状态  
**And** 这些记录可用于学习中心回看与后台查询  

**Given** 某条问答带有白板动作、来源引用或范围信息  
**When** 记录被持久化  
**Then** 相关附加信息以结构化字段或关联记录形式保存  
**And** 后续页面不需要重新执行问答才能恢复主要内容  

**Given** 某轮问答部分失败  
**When** 记录进入长期存储  
**Then** 能区分主回答成功、白板降级、引用缺失或整体失败等状态  
**And** 后续回看页面不会误判本轮为“完整成功”  

**Deliverables:**
- `xm_companion_turn`
- `xm_whiteboard_action_log`
- `xm_knowledge_chat_log`
- 关联字段与查询字段

### Story 10.6: Learning Coach 结果、错题与路径长期承接
**Story Type:** `Persistence Story`  
As a 学习中心与平台，  
I want checkpoint、quiz、wrongbook、recommendation 与 path 结果被长期承接，  
So that 学后巩固结果能够持续沉淀而不是一次性消费。  

**Acceptance Criteria:**
**Given** 用户完成 checkpoint 或 quiz  
**When** 系统执行持久化  
**Then** 结果、得分、解析摘要、来源会话与时间信息进入长期业务表  
**And** 学习中心能够稳定查询这些结果  

**Given** 错题、推荐或学习路径被生成  
**When** 记录被写回  
**Then** 它们拥有清晰的结果类型、来源、状态与打开详情所需字段  
**And** 不会混入普通历史记录导致前端难以区分展示逻辑  

**Given** 用户后续调整学习路径  
**When** 路径再次保存  
**Then** 系统能保留版本或最后更新时间等必要信息  
**And** 不会因简单覆盖写入导致历史路径状态完全不可追溯  

**Deliverables:**
- `xm_quiz_result`
- `xm_learning_path`
- wrongbook / recommendation 承接字段
- 查询接口最小映射

### Story 10.7: 学习记录、收藏与聚合查询承接
**Story Type:** `Backend Story`  
As a 学习中心前端，  
I want 有稳定的长期数据查询入口承接历史、收藏与聚合结果，  
So that `/learning`、`/history` 与 `/favorites` 能以统一分页语义工作。  

**Acceptance Criteria:**
**Given** 学习中心需要聚合视频、课堂、Companion、Evidence 与 Learning Coach 结果  
**When** 前端发起查询  
**Then** 后端提供统一或可组合的分页查询结构  
**And** 返回格式与全局 `{code, msg, rows, total}` 约定保持一致  

**Given** 用户执行收藏、取消收藏或删除历史  
**When** 后端处理该类长期数据变更  
**Then** 变更被写入长期业务表  
**And** 学习中心刷新后能看到一致结果，而不是运行态和长期态不一致  

**Given** 页面按类型、时间或状态进行过滤  
**When** 后端返回聚合数据  
**Then** 至少支持最小可行的筛选与分页  
**And** 不要求前端自己在全量历史上做危险的本地拼装分页  

**Deliverables:**
- `xm_learning_record`
- `xm_learning_favorite`
- 聚合查询接口
- 删除 / 收藏变更接口

### Story 10.8: 后台查询、导出与审计边界
**Story Type:** `Integration Story`  
As a 平台运营人员或教师管理员，  
I want 关键学习数据能够被稳定查询与审计，  
So that 平台可以长期运营，同时又不把当前版本扩展成独立 ToB 产品。  

**Acceptance Criteria:**
**Given** 视频、课堂、Companion、Evidence、quiz、收藏等结果产生  
**When** 运营人员通过后台查询  
**Then** 可以按边界查看需要的学习记录、摘要和状态  
**And** 当前版本只承接管理、查询和审计边界，不额外扩展成新的独立 ToB 产品域  

**Given** 某类记录需要导出或审计  
**When** 后台调用查询能力  
**Then** 数据字段与状态语义足以支撑最小导出或审计  
**And** 不需要重新回到 Redis 运行态拼装历史信息  

**Given** 后台查询权限受 RuoYi RBAC 控制  
**When** 用户权限不足  
**Then** 后台按统一权限规则拒绝访问  
**And** 小麦不会在后台再自建一套平行权限系统与其冲突  

**Deliverables:**
- 后台查询边界说明
- 导出最小字段清单
- 审计场景字段清单
- 与 RBAC 的映射说明

---

## Cross-Epic Integration Matrix
### Matrix A: Runtime to Persistence
| 来源 Epic | 产出 | 消费 Epic | 集成边界 |
|---|---|---|---|
| Epic 4 | 视频任务元数据、video artifact | Epic 6 / Epic 9 / Epic 10 | task result + SessionArtifactGraph |
| Epic 5 | 课堂任务元数据、classroom artifact、completion signal | Epic 6 / Epic 8 / Epic 9 / Epic 10 | result schema + learning signal |
| Epic 6 | companion turn、whiteboard log | Epic 9 / Epic 10 | turn history schema |
| Epic 7 | evidence chat、citation record | Epic 9 / Epic 10 | evidence record schema |
| Epic 8 | checkpoint / quiz / wrongbook / path | Epic 9 / Epic 10 | learning result schema |

### Matrix B: UI Consumption
| 页面域 | 主要依赖 Epic | 次要依赖 Epic |
|---|---|---|
| `/login` | Epic 1 | Epic 0 |
| `/video/input` | Epic 1 / Epic 3 | Epic 2 |
| `/video/:id/generating` | Epic 2 / Epic 4 | Epic 3 |
| `/video/:id` | Epic 4 | Epic 6 / 7 / 8 |
| `/classroom/input` | Epic 1 / Epic 5 | Epic 2 |
| `/classroom/:id/generating` | Epic 2 / Epic 5 | |
| `/classroom/:id` | Epic 5 | Epic 6 / 8 |
| 来源抽屉 | Epic 7 | Epic 6 / 9 |
| Learning Coach 页面 | Epic 8 | Epic 5 / 6 / 7 |
| `/learning` | Epic 9 | Epic 10 |
| `/history` | Epic 9 | Epic 10 |
| `/favorites` | Epic 9 | Epic 10 |
| `/profile` | Epic 9 | Epic 1 / Epic 10 |
| `/settings` | Epic 9 | Epic 0 |

### Matrix C: Contract Freeze Order
1. Epic 0 契约资产规范  
2. Epic 1 认证契约  
3. Epic 2 任务 / SSE / Provider 契约  
4. Epic 10 长期数据边界与表清单  
5. Epic 3 视频创建契约  
6. Epic 4 视频 stage 与结果契约  
7. Epic 5 课堂 result 与 completion signal 契约  
8. Epic 6 Companion 契约  
9. Epic 7 Evidence 契约  
10. Epic 8 Learning Coach 契约  
11. Epic 9 聚合页与分页契约  

---

## Milestone Plan
### Milestone M0: Parallel Track Ready
**Goal:** 团队具备真实并行条件  
**Includes:**
- Epic 0 Done
- Epic 1 Story 1.1 / 1.3 Done
- Epic 2 Story 2.1 / 2.5 / 2.7 Done
- Epic 10 Story 10.1 / 10.3 Done

**Milestone Exit Signal:**
- 页面可以 mock 先行；
- 后端可以 schema 先行；
- RuoYi 承接边界已清晰；
- 长任务与 SSE 的基础语言已稳定。  

### Milestone M1: Core Learning Paths Visible
**Goal:** 视频与课堂主链路前后可见  
**Includes:**
- Epic 3 Done
- Epic 4 Story 4.1 ~ 4.8 Done
- Epic 5 Story 5.1 ~ 5.7 Done

**Milestone Exit Signal:**
- 用户可从输入到等待再到结果完成视频体验；
- 用户可从输入到等待再到结果完成课堂体验；
- 两条主链路失败时均可解释。  

### Milestone M2: Shared Learning Intelligence Visible
**Goal:** 伴学、证据与学后层接上  
**Includes:**
- Epic 6 Done
- Epic 7 Done
- Epic 8 Done

**Milestone Exit Signal:**
- Companion 可围绕锚点工作；
- Evidence 可补资料依据；
- Learning Coach 可在会话后承接。  

### Milestone M3: Long-term Value Closed
**Goal:** 学习中心、收藏历史与持久化闭环  
**Includes:**
- Epic 9 Done
- Epic 10 Story 10.4 ~ 10.8 Done

**Milestone Exit Signal:**
- 所有关键结果都能回看；
- 长期数据不依赖 Redis；
- 后台查询与审计边界可用。  

---

## Recommended Team Execution Model
### For a 1-Person Team
优先顺序建议：
1. Epic 0  
2. Epic 1  
3. Epic 2  
4. Epic 10（先做 10.1 / 10.3）  
5. Epic 3  
6. Epic 4  
7. Epic 5  
8. Epic 6  
9. Epic 7  
10. Epic 8  
11. Epic 9  
12. 回补 Epic 10 余下 Story  

### For a 2-Person Team
**Frontend-heavy line**
- Epic 1 前端 Story
- Epic 3 前端 Story
- Epic 4 前端 Story
- Epic 5 前端 Story
- Epic 6 前端 Story
- Epic 7 前端 Story
- Epic 8 前端 Story
- Epic 9 前端 Story

**Backend-heavy line**
- Epic 2
- Epic 10
- Epic 3 后端 Story
- Epic 4 后端 Story
- Epic 5 后端 Story
- Epic 6 后端 Story
- Epic 7 后端 Story
- Epic 8 后端 Story

**每日同步关注点**
- 契约是否变更
- mock 数据是否同步更新
- 持久化字段是否新增
- 页面空态 / 错态是否覆盖

---

## Final Validation Checklist
### A. Architecture Alignment
- [x] FastAPI 仍保持功能服务层定位  
- [x] RuoYi 仍保持长期业务宿主定位  
- [x] Redis 仅承担运行态与事件缓存  
- [x] 文件产物进入 COS  
- [x] Provider 通过抽象层接入  
- [x] 视频与课堂引擎保持独立  
- [x] Companion 只消费 `SessionArtifactGraph`  

### B. Parallel Development Alignment
- [x] 每个业务 Epic 均有契约 Story  
- [x] 前端页面均可基于 mock 先行  
- [x] 后端接口均可独立以 schema / 测试完成  
- [x] 底座能力未再混入业务 Epic  
- [x] 跨域依赖已显式化  

### C. Data Boundary Alignment
- [x] 学习记录、收藏、问答、任务元数据进入长期存储  
- [x] SSE 事件不作为长期历史宿主  
- [x] Companion 运行态窗口有 TTL  
- [x] Provider 健康缓存有 TTL  
- [x] Redis 不承接后台可查询长期业务数据  

### D. UX Boundary Alignment
- [x] `/login` 为统一认证页  
- [x] `/learning` 为聚合入口  
- [x] `/history` 与 `/favorites` 属学习中心域  
- [x] `/profile` 与 `/settings` 不承接学习结果聚合  
- [x] Evidence 只以面板 / 抽屉形式出现  
- [x] Learning Coach 只发生在会话后  

### E. Risk Reduction Alignment
- [x] 拆除了“视频 Epic 吞掉底座”的风险  
- [x] 拆除了“RuoYi 回写散落各 Epic” 的风险  
- [x] 拆除了“Companion 无 artifact 可消费”的风险  
- [x] 拆除了“学习中心后期无统一聚合 schema”的风险  
- [x] 拆除了“mock 只是静态假数据”的风险  

---

## Final Notes for Story Writers
后续如果你们要继续往下写到更细的 story 卡片、Jira tickets 或 BMAD story files，建议强制附加以下字段：

### Required Fields Per Story
- Story ID
- Story Type
- Depends On
- Blocks
- Contract Asset Path
- Mock Asset Path
- API / Event / Schema Impact
- Persistence Impact
- Frontend States Covered
- Error States Covered
- Acceptance Test Notes

### Suggested Ticket Template
```text
Story ID:
Title:
Type:
Epic:
Depends On:
Blocks:
Goal:
In Scope:
Out of Scope:
Contract Assets:
Mock Assets:
Persistence Impact:
Acceptance Criteria:
Test Notes:
Open Questions:
```

### Strong Warning
以下三种写法禁止再出现：
1. “等后端接口好了前端再做”
2. “这个先放 Redis，后面再落库”
3. “这个先不定义 schema，到时候按返回改
```markdown
4. “这个先做 happy path，错误态后面补”
5. “这个先把页面画出来，联调时再改结构”
6. “这个先直接调厂商 SDK，后面再抽象 Provider”

---

## Appendix A: Epic to Story ID Index
### Epic 0
- 0.1 Monorepo 基础目录与工程骨架冻结
- 0.2 契约资产目录、命名规则与版本规则冻结
- 0.3 前端 adapter、mock handler 与环境切换基线
- 0.4 后端 schema、OpenAPI、示例 payload 输出基线
- 0.5 request_id / task_id / 日志追踪骨架
- 0.6 Story 交付门禁与并行开发 DoR / DoD 冻结

### Epic 1
- 1.1 统一认证契约、会话 payload 与 mock 基线
- 1.2 独立认证页中的注册、登录与回跳
- 1.3 登出、401 处理与受保护访问一致性
- 1.4 首页双入口理解与非阻塞推荐提示
- 1.5 输入壳层中的老师风格最小选择配置
- 1.6 角色边界与入口级权限可见性

### Epic 2
- 2.1 统一任务状态枚举、错误码与结果 schema 冻结
- 2.2 Task 基类、TaskContext 与调度骨架
- 2.3 Dramatiq + Redis broker 基础接入
- 2.4 Redis 运行态 Key、TTL 与事件缓存落地
- 2.5 SSE 事件类型、payload 与 broker 契约冻结
- 2.6 SSE 断线恢复与 `/status` 查询降级
- 2.7 Provider Protocol、工厂与优先级注册骨架
- 2.8 Provider 健康检查、Failover 与缓存策略

### Epic 3
- 3.1 视频任务创建契约与 mock task 基线
- 3.2 视频输入页壳层与多模态输入交互
- 3.3 图片 / OCR 前置预处理接口
- 3.4 视频任务创建接口与初始化运行态
- 3.5 创建后跳转等待页与任务上下文承接

### Epic 4
- 4.1 视频流水线阶段、进度区间与结果契约冻结
- 4.2 题目理解与分镜生成服务
- 4.3 Manim 代码生成与自动修复链
- 4.4 Manim 沙箱执行与资源限制
- 4.5 TTS 合成与 Provider Failover 落地
- 4.6 FFmpeg 合成、COS 上传与完成结果回写
- 4.7 视频等待页前端状态机、恢复与降级
- 4.8 视频结果页、播放器与结果操作
- 4.9 视频侧 SessionArtifactGraph 回写

### Epic 5
- 5.1 课堂任务契约、结果 schema 与 mock session 基线
- 5.2 主题输入与课堂任务创建
- 5.3 课堂等待页与统一进度复用
- 5.4 课堂生成服务与多 Agent 讨论结果
- 5.5 白板布局与基础可读性规则
- 5.6 课堂结果页中的幻灯片、讨论与白板浏览
- 5.7 会话结束信号与课后触发出口
- 5.8 课堂侧 SessionArtifactGraph 回写

### Epic 6
- 6.1 `TimeAnchor`、turn schema 与 mock Companion turns 基线
- 6.2 视频 / 课堂共享 Companion 侧栏壳层
- 6.3 视频与课堂的 Context Adapter
- 6.4 当前时刻提问与回答服务
- 6.5 连续追问与上下文窗口管理
- 6.6 白板动作协议与结构化降级
- 6.7 问答回写与视频 / 课堂双页复用闭环

### Epic 7
- 7.1 Evidence 契约、来源抽屉 schema 与 mock 数据基线
- 7.2 来源抽屉 / 证据面板前端
- 7.3 EvidenceProvider 适配层与外部能力编排
- 7.4 文档上传、解析状态与范围切换
- 7.5 引用来源展示与术语解释
- 7.6 证据问答回写与学习中心回看

### Epic 8
- 8.1 学后入口契约与 `checkpoint / quiz / path` schema 冻结
- 8.2 会话后入口与 Learning Coach 路由承接
- 8.3 轻量 checkpoint 生成与反馈
- 8.4 正式 quiz 生成、判题与解析
- 8.5 错题本与知识推荐
- 8.6 学习路径规划、保存与调整
- 8.7 Learning Coach 长期数据回写

### Epic 9
- 9.1 学习中心聚合契约、分页结构与 mock 数据集
- 9.2 学习中心结果回看与入口整合
- 9.3 历史记录与收藏管理
- 9.4 个人资料与设置管理
- 9.5 i18n 架构预留与关键静态文案资源化

### Epic 10
- 10.1 长期业务数据边界、业务表清单与字段基线冻结
- 10.2 RuoYi 小麦业务模块与权限承接规则
- 10.3 FastAPI 与 RuoYi 防腐层客户端
- 10.4 视频与课堂任务元数据长期承接
- 10.5 Companion 与 Evidence 问答长期承接
- 10.6 Learning Coach 结果、错题与路径长期承接
- 10.7 学习记录、收藏与聚合查询承接
- 10.8 后台查询、导出与审计边界

---

## Appendix B: Recommended BMAD / Ticket Split
为了便于你们后续进一步落到 BMAD、Jira、Linear 或 GitHub Projects，建议把 Story 再映射到如下四类执行单元：

### 1. Contract Ticket
用于冻结：
- schema
- 枚举
- 错误码
- 示例 payload
- mock 数据样本
- 状态图

**示例：**
- `CONTRACT-2.1-task-status-and-error-codes`
- `CONTRACT-6.1-timeanchor-and-companion-turn-schema`

### 2. Frontend Ticket
用于交付：
- 页面壳层
- 组件
- adapter 接入
- 状态机
- mock 流

**示例：**
- `FE-4.7-video-generating-page-state-machine`
- `FE-7.2-evidence-drawer-panel`

### 3. Backend Ticket
用于交付：
- service
- task worker
- provider adapter
- API route
- 运行态逻辑

**示例：**
- `BE-4.3-manim-gen-and-fix-chain`
- `BE-7.3-evidence-provider-adapter`

### 4. Persistence / Integration Ticket
用于交付：
- RuoYi 表
- 防腐层
- 回写逻辑
- 聚合查询
- 后台查询接口

**示例：**
- `INT-10.3-ruoyi-acl-client`
- `DB-10.4-video-and-classroom-task-persistence`

---

## Appendix C: Suggested Story Sizing Rule
为避免 Story 再次变成“名义上一个故事，实际上半个 Epic”，建议采用以下粒度约束：

### Size S: 0.5 - 1.5 天
适合：
- 契约冻结
- 单个页面静态壳层
- 单一错误码 / 状态枚举补齐
- 单个 adapter 封装
- 单张表结构冻结

### Size M: 1.5 - 3 天
适合：
- 一个等待页状态机
- 一个 Provider 适配实现
- 一个任务创建接口
- 一个结果页主组件
- 一个回写链路

### Size L: 3 - 5 天
适合：
- Manim 修复链
- 课堂生成服务
- quiz 生成与判题
- 聚合查询接口
- Evidence 上传 + 解析状态

### 禁止 XXL Story
若某 Story 同时包含以下任意 3 项以上，必须继续拆分：
- 前端页面
- 后端接口
- Worker / queue
- 持久化回写
- RuoYi 后台承接
- 外部 Provider 接入

---

## Appendix D: High-Risk Stories Requiring Early Spike
以下 Story 建议在正式开发前先做 Spike 或技术验证，不应直接按普通 Story 估时：

### Spike Candidates
- 4.3 Manim 代码生成与自动修复链
- 4.4 Manim 沙箱执行与资源限制
- 4.5 TTS 合成与 Provider Failover 落地
- 5.4 课堂生成服务与多 Agent 讨论结果
- 6.3 视频与课堂的 Context Adapter
- 7.3 EvidenceProvider 适配层与外部能力编排
- 7.4 文档上传、解析状态与范围切换
- 8.4 正式 quiz 生成、判题与解析

### Spike Output Requirements
每个 Spike 至少应产出：
- 风险假设列表
- 最小可行验证结果
- 失败时的降级方案
- 是否能进入正式 Story 开发的判断
- 契约是否需要反向修订

---

## Appendix E: Release Gate Checklist
### Gate 1: Mock Gate
进入正式页面开发前必须满足：
- [ ] 契约 schema 已冻结
- [ ] mock 数据已存在
- [ ] 至少覆盖成功 / 空态 / 失败 / 权限失败
- [ ] 状态枚举已稳定
- [ ] 页面边界已稳定

### Gate 2: Real API Gate
进入真实接口联调前必须满足：
- [ ] OpenAPI / schema 可用
- [ ] 错误码文档可查
- [ ] SSE 事件语义稳定
- [ ] 持久化字段已冻结
- [ ] 页面使用 adapter，而非直连临时接口

### Gate 3: Merge Gate
进入主分支合并前必须满足：
- [ ] 高保真视觉稿已核对
- [ ] 关键状态已覆盖
- [ ] 交互说明已核对
- [ ] 稳定接口契约未发生破坏性漂移
- [ ] 真实联调记录可追溯

### Gate 4: Release Gate
进入发布前必须满足：
- [ ] 长期数据已落 RuoYi / MySQL / COS
- [ ] Redis 中无关键长期业务数据依赖
- [ ] 401 / 403 / 失败态行为一致
- [ ] SSE 恢复与 `/status` 降级可用
- [ ] 日志具备 request_id / task_id
- [ ] 至少一个 happy path 和一个 fail path 已手工验收

---

## Appendix F: MVP Cut Strategy
如果时间不足，建议按以下优先级收缩，而不是随机砍功能。

### Must Keep
- Epic 0
- Epic 1
- Epic 2
- Epic 3
- Epic 4
- Epic 5
- Epic 10（至少 10.1 / 10.3 / 10.4 / 10.7）

### Can Degrade
- Epic 6：先只做基础文字回答 + 白板降级
- Epic 7：先只做证据提问 + 引用摘要，不做复杂深挖
- Epic 8：先做 checkpoint + quiz，path 延后
- Epic 9：先做 `/learning` 聚合和 `/history`，`/favorites`、`/settings` 可简化

### Can Defer
- 复杂推荐
- 路径编辑高级能力
- 高级白板渲染
- 文档解析高级状态展示
- 多语言真实切换
- 平板适配深化

---

## Appendix G: Final Quality Statement
本版 Epic / Story 拆解相较旧版，已经完成以下关键质量提升：

### 1. 从“按功能堆”变成“按依赖拆”
旧版问题在于把视频域做成巨型 Epic，并把任务框架、SSE、Provider、错误码都吞进去。  
本版已拆出：
- Epic 0：工程轨道
- Epic 2：运行时底座
- Epic 10：长期数据宿主

### 2. 从“理论并行”变成“工程并行”
旧版虽然写了“mock 先行”，但没有：
- adapter 基线
- mock 状态流规范
- 契约资产目录
- contract story  
本版全部补齐。

### 3. 从“故事很大”变成“故事可验收”
旧版很多 Story 同时混合了：
- 页面
- 接口
- 持久化
- 降级
- provider  
本版按 story type 全部拆开。

### 4. 从“后期补落库”变成“长期数据一开始就有宿主”
旧版长期数据承接分散在 AC 里。  
本版直接用 Epic 10 把它上升为一级规划对象。

### 5. 从“Companion 看起来很自然”变成“它的输入条件被显式定义”
旧版 Companion 最大风险是没有把 `SessionArtifactGraph` 作为正式输入。  
本版已通过：
- 4.9
- 5.8
- 6.3  
明确这一点。

---

## Closing Recommendation
如果你们接下来要把这份文档真正用于实施，我建议下一步不要直接继续“写代码”，而是先做这 4 件事：

1. **把本稿拆成 machine-readable story cards**
   - 每个 Story 单独成文件或单独成 issue

2. **先执行 4 个冻结会**
   - 认证契约冻结
   - 任务 / SSE / 错误码冻结
   - 视频 / 课堂 result schema 冻结
   - 长期数据边界与表清单冻结

3. **先做 8 个 mock 入口**
   - login
   - home
   - video input
   - video generating
   - video result
   - classroom input
   - classroom generating
   - classroom result

4. **先做 3 条最小真实链路**
   - 创建视频任务 -> mock 等待 -> 结果页
   - 创建课堂任务 -> mock 等待 -> 结果页
   - RuoYi 回写一条视频 / 课堂元数据

当这 4 步做完，你们的实施成功率会比直接开始写业务代码高很多。

---

## End of Document
**状态：本次 Epic 重构稿已完成。**  
**覆盖：Epic 0 ~ Epic 10，全量 FR / NFR / AR / UX 约束已映射。**  
**定位：可直接作为后续 Story 卡片拆分、任务排期、BMAD 输入与联调门禁依据。**
