# Epic List

## Epic 1: 用户接入、双入口与最小老师启动配置
用户可以登录进入平台，理解两条主入口，并在发起学习前完成老师风格的最小启动配置。
**Priority:** MVP / P0
**FRs covered:** FR1, FR2, FR4, FR18（MVP 子集）
**Key NFRs:** NFR-SE-002, NFR-AR-001, NFR-AR-003
**Key UX Drivers:** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR15, UX-DR16, UX-DR17, UX-DR18, UX-DR19, UX-DR20
**Completion Definition:** 本 Epic 只关闭老师风格的最小启动配置能力，包括默认风格、参数透传、基础选择能力；不关闭完整下拉展开、可扩展老师列表、增强预览体验。

## Epic 2: 单题视频生成与基础播放闭环
用户可以提交题目并获得一个可播放、可基本消费的讲解视频结果。
**Priority:** MVP / P0
**FRs covered:** FR5, FR6, FR7, FR8, FR10, FR11（MVP 子集）, FR12, FR14, FR15, FR16
**Key NFRs:** NFR-PF-002, NFR-AR-001, NFR-AR-002, NFR-SE-005
**Key UX Drivers:** UX-DR5, UX-DR6, UX-DR12, UX-DR13
**Completion Definition:** 本 Epic 包含单一 Provider 的最小旁白生成能力与最小播放器能力，以支撑可播放讲解视频闭环；不包含分享、截图笔记、继续追问后端能力等增强结果交互。

## Epic 3: 单题视频可靠性与过程透明化
用户可以更稳定、更可信地获得视频生成结果，并在执行过程中获得清晰反馈。
**Priority:** MVP / P0
**FRs covered:** FR9, FR11（可靠性增强部分）, FR13
**Key NFRs:** NFR-DEP-001, NFR-DEP-002, NFR-DEP-005, NFR-AR-005, NFR-AR-006
**Key UX Drivers:** UX-DR9, UX-DR10, UX-DR11
**Completion Definition:** 本 Epic 是 MVP 必要质量闭环，不是纯增强项；它关闭自动修复、TTS Failover、SSE 透明进度与恢复能力。

## Epic 4: 主题课堂生成与浏览闭环
用户可以输入主题，生成基础课堂内容，查看进度，并浏览课堂结果。
**Priority:** MVP / P0
**FRs covered:** FR17, FR19, FR22, FR23
**Key NFRs:** NFR-PF-003, NFR-AR-001, NFR-AR-004, NFR-UX-001
**Key UX Drivers:** UX-DR9, UX-DR19, UX-DR21
**Completion Definition:** 本 Epic 关闭“主题输入 → 课堂生成 → 幻灯片浏览 → 进度透明 → 基础可读布局”闭环，不包含测验与结果沉淀闭环。

## Epic 5: 学习沉淀与最小结果回看闭环
用户可以在课堂结束后完成最小测验，并对视频/课堂结果进行历史沉淀与重新打开。
**Priority:** MVP 最小子集 + P1 扩展
**FRs covered:** FR20, FR24
**Key NFRs:** NFR-AR-002, NFR-AR-006, NFR-UX-003
**Key UX Drivers:** UX-DR23, UX-DR25
**Internal Story Lanes:** 5A 课堂测验闭环；5B 视频/课堂最小历史记录闭环
**Completion Definition:** 最小历史记录闭环至少覆盖“任务完成后写入记录、列表展示、重新打开结果页”三项能力。

## Epic 6: 个人空间与结果整理
用户可以管理个人资料，并集中整理自己的学习成果。
**Priority:** P1
**FRs covered:** FR3, FR25, FR26, FR27
**Key NFRs:** NFR-AR-002, NFR-UX-003, NFR-CO-001
**Key UX Drivers:** UX-DR20, UX-DR25
**Completion Definition:** 个人资料与个人中心壳层可先落位；收藏、删除、集中结果管理依赖最小结果数据域成熟。

## Epic 7: 智能互动与扩展学习能力
用户可以获得更丰富的互动学习体验，系统也保留后续扩展能力域。
**Priority:** P2 / Post-MVP
**FRs covered:** FR21, FR18（增强交互/可扩展形态）
**Backlog Attached:** Knowledge QA、Video Sharing、Learning Path、更完整的 History / Favorites / Settings 扩展
**Key NFRs:** NFR-AR-005, NFR-UX-005
**Key UX Drivers:** UX-DR7, UX-DR8, UX-DR14, UX-DR22, UX-DR24
**Completion Definition:** 这是明确的“智能互动扩展域”，不再作为杂项池。

## Cross-Epic Platform Common Delivery Package
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

## Natural Dependencies
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
