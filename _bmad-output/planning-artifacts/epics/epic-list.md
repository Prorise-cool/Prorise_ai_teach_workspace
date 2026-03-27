# Epic List

## 执行节奏调整（2026-03-27）
当前计划改为两阶段执行：
- **Phase A：后端能力、接口契约与测试先行。** 先完成 FastAPI / RuoYi / 统一任务框架 / Provider / 状态恢复 / 数据回写 / 接口测试。
- **Phase B：正式前端页面与成品图落地。** 等线框图落地为成品图且接口契约稳定后，再交付首页、输入页、等待页、结果页、个人中心等正式页面。

执行硬规则：
1. 前端临时验证壳层不算正式页面完成。
2. 任何正式页面 Story 若缺少成品图或关键状态说明，不得进入当前迭代开发。
3. 后端 Story 的完成定义必须包含接口测试或契约验证，而不是只看代码跑通。

## Phase A：后端能力、接口契约与测试先行

## Epic 1: 用户接入、双入口与最小老师启动配置
聚焦认证、会话、受保护访问、双后端鉴权一致性与老师风格参数透传，为正式首页 / 认证入口 / 输入壳层提供稳定契约。
**Priority:** MVP / P0
**FRs covered:** FR1, FR2
**Supports Later UI FRs:** FR4, FR18（MVP 子集）
**Key NFRs:** NFR-SE-002, NFR-AR-001, NFR-AR-003
**Completion Definition:** 登录、登出、受保护访问、风格透传、鉴权一致性与接口测试闭环完成；正式首页与输入壳层转由 Epic 8 承接。

## Epic 2: 单题视频生成后端能力闭环
聚焦视频任务创建、题目理解、分镜、代码生成、渲染、旁白、合成、上传和结果查询契约闭环。
**Priority:** MVP / P0
**FRs covered:** FR5, FR6, FR7, FR8, FR10, FR11（MVP 子集）, FR12
**Supports Later UI FRs:** FR14, FR15, FR16
**Key NFRs:** NFR-PF-002, NFR-AR-001, NFR-AR-002, NFR-SE-005
**Completion Definition:** 视频任务 API、结果数据结构、上传与查询闭环完成；正式播放器页与结果页转由 Epic 9 承接。

## Epic 3: 单题视频可靠性与事件契约
聚焦 Manim 自动修复、多 TTS Provider、SSE 事件、状态恢复与统一错误处理，不在本 Epic 关闭正式等待页视觉交付。
**Priority:** MVP / P0
**FRs covered:** FR9, FR11（可靠性增强部分）, FR13
**Key NFRs:** NFR-DEP-001, NFR-DEP-002, NFR-DEP-005, NFR-AR-005, NFR-AR-006
**Supports Later UI FRs:** UX-DR9, UX-DR10, UX-DR11
**Completion Definition:** 自动修复、Failover、事件模型、状态恢复与接口测试闭环完成；统一等待页成品化转由 Epic 9 承接。

## Epic 4: 主题课堂生成后端能力闭环
聚焦课堂任务创建、结构化课堂内容生成、幻灯片数据结构、状态恢复和白板结果数据契约。
**Priority:** MVP / P0
**FRs covered:** FR17, FR19, FR22, FR23
**Key NFRs:** NFR-PF-003, NFR-AR-001, NFR-AR-004, NFR-UX-001
**Supports Later UI FRs:** UX-DR21
**Completion Definition:** 课堂任务 API、结果 schema、等待恢复语义和数据回写闭环完成；正式课堂输入 / 等待 / 结果页转由 Epic 9 承接。

## Epic 5: 学习沉淀与最小结果数据闭环
聚焦测验数据、历史记录数据、结果重开契约和长期业务表写入，不在本 Epic 关闭正式历史页 / 测验页视觉交付。
**Priority:** MVP 最小子集 + P1 扩展
**FRs covered:** FR20, FR24
**Key NFRs:** NFR-AR-002, NFR-AR-006, NFR-UX-003
**Completion Definition:** 测验生成与判定接口、历史写入、结果重开契约完成；正式测验页和历史页转由 Epic 10 承接。

## Epic 6: 个人数据域与结果操作接口准备
聚焦个人资料、收藏、删除、结果管理相关业务表和接口，为正式个人中心页面提供稳定数据域。
**Priority:** P1
**FRs covered:** FR3, FR25, FR26
**Supports Later UI FRs:** FR27
**Key NFRs:** NFR-AR-002, NFR-UX-003, NFR-CO-001
**Completion Definition:** 资料、收藏、删除相关接口和数据模型准备就绪；正式个人中心壳层与页面交互转由 Epic 10 承接。

## Epic 7: 智能互动与扩展学习能力
保留为 Post-MVP 能力扩展域；如果涉及正式页面，仍需遵循“成品图冻结后再开发”的规则。
**Priority:** P2 / Post-MVP
**FRs covered:** FR21, FR18（增强交互/可扩展形态）
**Backlog Attached:** Knowledge QA、Video Sharing、Learning Path、更完整的 History / Favorites / Settings 扩展
**Key NFRs:** NFR-AR-005, NFR-UX-005
**Completion Definition:** 这是明确的增强域，不承担当前波次正式页面交付压力。

## Phase B：正式前端页面与成品图落地

## Epic 8: 首页、认证入口与输入壳层成品化交付
在首页、落地页、认证入口与输入壳层成品图冻结后，交付正式的首页、认证对话框、视频 / 课堂输入壳层和老师风格选择体验。
**Priority:** MVP / P1（依赖设计冻结）
**Depends On:** Epic 1
**FRs covered:** FR4, FR18（MVP 子集）
**Key UX Drivers:** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR6, UX-DR7, UX-DR8, UX-DR15, UX-DR16, UX-DR17, UX-DR18, UX-DR19, UX-DR20
**Completion Definition:** 首页、认证入口、输入壳层以成品图为准完成实现，并通过视觉验收与基础可访问性验证。

## Epic 9: 视频与课堂正式流程页面成品化交付
在视频 / 课堂相关成品图冻结后，交付统一等待页、视频结果页、播放器页、课堂输入页、课堂等待页和课堂结果页。
**Priority:** MVP / P1（依赖设计冻结）
**Depends On:** Epic 2, Epic 3, Epic 4
**FRs covered:** FR14, FR15, FR16, FR17（前端承载）, FR19（前端承载）, FR22（前端承载）, FR23（前端承载）
**Key UX Drivers:** UX-DR9, UX-DR10, UX-DR11, UX-DR12, UX-DR13, UX-DR21
**Completion Definition:** 视频与课堂正式页面完成视觉实现、状态页覆盖和契约联调，不再依赖原型页。

## Epic 10: 历史记录、个人中心与扩展页面成品化交付
在历史记录、测验、个人中心等成品图冻结后，交付测验页、历史记录页、个人中心与结果管理页面。
**Priority:** P1 / P2（依赖设计冻结）
**Depends On:** Epic 5, Epic 6
**FRs covered:** FR3（前端承载）, FR20（前端承载）, FR24（前端承载）, FR25, FR26, FR27
**Key UX Drivers:** UX-DR23, UX-DR25
**Completion Definition:** 历史记录、测验与个人中心等正式页面完成成品化交付，并以稳定接口消费真实数据。

## Cross-Epic Platform Common Delivery Package
该交付包不是独立产品 Epic，但必须作为 Phase A 的前置共性交付能力显式挂靠。
- 统一任务框架最小骨架
- Redis 在线态与运行态 Key 规范
- SSE Broker 最小能力
- Provider 基础接口与工厂骨架
- FastAPI 与 RuoYi 防腐层
- 统一 API 响应格式 `{code, msg, data}`
- `request_id` 与统一日志链路
- Nginx / 容器化接入骨架
**Execution Constraint:** Phase A 共性交付项必须先完成，Phase B 的正式页面才允许大规模展开。

## Natural Dependencies
- Epic 1 完成后，Epic 8 才能交付正式首页、认证入口与输入壳层。
- Epic 2 完成后，Epic 9 才能交付视频结果页与播放器正式页面。
- Epic 3 完成后，Epic 9 才能交付统一等待页与恢复交互。
- Epic 4 完成后，Epic 9 才能交付课堂正式输入 / 等待 / 结果页。
- Epic 5 完成后，Epic 10 才能交付测验页、历史记录页和结果重开页面。
- Epic 6 完成后，Epic 10 才能交付个人中心、收藏与删除相关正式页面。
- Epic 7 是增强层，不阻塞 MVP，但若涉及新页面仍依赖对应成品图冻结。
