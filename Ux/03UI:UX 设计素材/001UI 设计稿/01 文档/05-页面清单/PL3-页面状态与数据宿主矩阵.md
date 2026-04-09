# PL3-页面状态与数据宿主矩阵

- 文档编号：PL3
- 版本：v1.0
- 日期：2026-03-27
- 范围：页面级状态、任务级状态（统一 5 态）、SSE 事件与页面呈现映射、FastAPI / RuoYi / Redis / COS 数据宿主、关键错误与恢复（401 / 403 / 超时 / Provider 切换 / 基于 Redis 运行态的断线恢复）
- 唯一业务事实源（仅用于“事实判断”）：
  - `_bmad-output/planning-artifacts/archive/prd.md`
  - `_bmad-output/planning-artifacts/archive/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/archive/architecture.md`
  - `_bmad-output/planning-artifacts/archive/epics.md`
- 结构对齐参考（非事实源）：IN0、IA1、UF2 系列文档（只用于路由与流程对齐，不反向替代事实源）

> 关键要求：必须区分“等待态（运行时）”与“长期历史态（持久态）”，避免把 Redis 运行时状态当成长期业务事实源。

---

## 1. 状态命名原则（避免冲突）

### 1.1 命名空间（Namespace）

为保证“同一状态命名不冲突”，本文统一使用以下命名空间（仅用于文档表达，不要求代码内完全一致，但需保持语义映射一致）：

- 页面级状态：`PageState.*`
- 认证状态：`AuthState.Unauthenticated`（未登录）
- 授权状态：`AuthzState.Forbidden`（无权限）
- 任务级状态：`TaskStatus.*`（`pending / processing / completed / failed / cancelled`）
- SSE 事件：`SSEEvent.*`（`connected / progress / provider_switch / completed / failed / heartbeat / snapshot`）

### 1.2 “等待态（运行时）”与“历史态（持久态）”的区分

| 维度 | 等待态（运行时，Runtime） | 历史态（持久态，Persistent） |
|---|---|---|
| 典型页面 | `/video/:id/generating`、`/classroom/:id/generating` | 历史视图、收藏视图、`LearningCenter.tsx` 页面组件、`Profile.tsx` 页面组件、设置视图 |
| 权威来源 | FastAPI 执行态 + Redis 运行时缓存 | RuoYi / MySQL 业务表（长期数据权威） |
| Redis 使用 | 允许（必须 TTL）：任务进度、SSE 事件缓存、snapshot、Provider 健康 | 禁止作为权威：只能做加速缓存，不可替代 RuoYi |
| COS 使用 | 仅作为产物存储（文件地址/引用） | 仅作为产物存储（文件地址/引用），列表与管理仍以 RuoYi 为准 |
| 断线恢复 | 通过 Redis 运行时状态、事件缓存补发与 `SSEEvent.snapshot` / 状态查询对齐恢复 | 通过 RuoYi 列表与结果引用重新打开 |

---

## 2. 页面级状态矩阵（加载 / 空 / 错 / 禁用 / 未登录 / 无权限）

### 2.1 页面级状态定义（统一口径）

| 状态名 | 触发条件（示例） | 页面呈现（最小要求） | 退出动作（最小要求） |
|---|---|---|---|
| `PageState.Loading` | 首次进入页面、切换路由、请求初始化数据 | 骨架屏或 loading 区块；不遮挡全局导航 | 自动退出（数据到达） |
| `PageState.Empty` | 列表为空、无可展示结果、首次进入无历史 | 明确“空”的原因与下一步 CTA | 去创建（`/`、`/video/input`、`/classroom/input`）或刷新 |
| `PageState.Error` | 网络失败、服务不可用、请求异常、解析失败 | 用户可理解摘要 + 重试 + 返回出口 | 重试 / 返回入口 / 稍后再试 |
| `PageState.Disabled` | 操作前置条件不满足（例如未选题目、表单校验失败、上传不合法） | 控件置灰 + 就地提示原因（非弹窗打断） | 纠正输入后自动可用 |
| `AuthState.Unauthenticated` | 访问受保护路由但未登录；或收到 401 | 进入独立登录页；401 固定为清除 Token 并跳转登录页 | 登录成功回跳 `returnTo`；离开登录流则回到可访问范围（建议 `/`） |
| `AuthzState.Forbidden` | 已登录但访问资源返回 403 | 无权限提示页或区块（非死路） | 返回 `/` 或返回上一级；可选“切换账号” |

> 注：`AuthState.Unauthenticated` 与 `AuthzState.Forbidden` 是“鉴权类状态”，不与 `PageState.Error` 混写。401/403 归类为鉴权问题，不应表现为“泛错误页”。

### 2.2 页面覆盖矩阵（按路由）

说明：本表要求“每个页面必须明确哪些状态需要设计与实现”，并给出“去哪个后端取数”的主驱动结论（细节见第 5 节数据宿主矩阵）。

补充说明：对 `LearningCenter.tsx`、`Profile.tsx` 及其内部历史 / 收藏 / 设置视图，以及测验 / 学习路径承载页，本文沿用当前候选路径记法；正式 route 命名仍以全站 IA 冻结为准。

| 页面 / 候选路由 | 受保护 | 主驱动取数 | Loading | Empty | Error | Disabled | 未登录 | 无权限 | 备注（关键区分点） |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 否 | RuoYi（可选） | 是 | 是 | 是 | 否 | 否 | 否 | 空态可用作“未登录首次进入引导”。 |
| `建议：/login` | 否 | RuoYi | 是 | 否 | 是 | 是 | 否 | 否 | 独立登录页；错误态为登录失败或服务异常；当前缺专用线框。 |
| `/video/input` | 是 | FastAPI | 是 | 否 | 是 | 是 | 是 | 是 | 禁用态主要来自“题目为空/图片不合法/OCR 回填前不可提交”。 |
| `/video/:id/generating` | 是 | FastAPI + Redis（运行时） | 是 | 否 | 是 | 否 | 是 | 是 | 等待态页面不允许出现“空态”；失败态属于任务态（第 3 节），不是 Empty。 |
| `/video/:id` | 是 | FastAPI + COS + RuoYi | 是 | 是 | 是 | 否 | 是 | 是 | 若结果未就绪（任务仍在 `pending/processing`），应引导回 generating（不是空态）。 |
| `/classroom/input` | 是 | FastAPI | 是 | 否 | 是 | 是 | 是 | 是 | 禁用态主要来自“主题为空/校验失败”。 |
| `/classroom/:id/generating` | 是 | FastAPI + Redis（运行时） | 是 | 否 | 是 | 否 | 是 | 是 | 与视频 generating 共用“共享等待壳层”语义。 |
| `/classroom/:id` | 是 | FastAPI + RuoYi | 是 | 是 | 是 | 否 | 是 | 是 | 允许“局部缺失降级”（幻灯片/白板/讨论片段任一缺失不应整页失败）。 |
| `/knowledge` | 是 | FastAPI | 是 | 是 | 是 | 是 | 是 | 是 | 空态：首次进入无对话；禁用态：问题为空不可提交。 |
| `LearningCenter.tsx` 页面组件（候选：`/learning`） | 是 | RuoYi | 是 | 是 | 是 | 否 | 是 | 是 | 聚合页“空态”是核心状态之一（无记录时引导去双入口）；历史 / 收藏归属其结果聚合范围。 |
| 历史视图（独立路由待冻结，候选：`/history`） | 是 | RuoYi | 是 | 是 | 是 | 否 | 是 | 是 | 属于 `LearningCenter.tsx` 的学习结果聚合视图；删除必须二次确认。 |
| 收藏视图（独立路由待冻结，候选：`/favorites`） | 是 | RuoYi | 是 | 是 | 是 | 否 | 是 | 是 | 属于 `LearningCenter.tsx` 的学习结果聚合视图；取消收藏为可逆操作不需要二次确认。 |
| `Profile.tsx` 页面组件（候选：`/profile`） | 是 | RuoYi | 是 | 是 | 是 | 是 | 是 | 是 | 仅承接资料查看 / 编辑；路径仍待冻结。 |
| 设置视图（独立路由待冻结，候选：`/settings`） | 是 | RuoYi | 是 | 是 | 是 | 否 | 是 | 是 | 属于 `Profile.tsx` 的平台设置视图；缺失时表现为空态/占位而非错误。 |
| 测验承载页（候选：`/quiz/:sessionId`） | 是 | FastAPI + RuoYi | 是 | 是 | 是 | 是 | 是 | 是 | 注意：这里的 loading 属于“页面内部加载态”，不应被写成“长任务等待流”；参数语义待冻结。 |
| 学习路径承载页（候选：`/path`） | 是 | FastAPI | 是 | 是 | 是 | 是 | 是 | 是 | 若作为后置能力占位，空态需明确“尚未开放/建设中”并提供返回出口。 |

---

## 3. 任务级状态矩阵（统一 5 态）

### 3.1 适用范围

本节的 `TaskStatus.*` 仅适用于“长任务”：

- 视频任务（VideoTask）：`/video/:id/generating` ↔ `/video/:id`
- 课堂任务（ClassroomTask）：`/classroom/:id/generating` ↔ `/classroom/:id`

### 3.2 状态定义与页面呈现

| `TaskStatus.*` | 含义 | 运行时承载（等待态） | 持久态承载（历史态） | 用户可行动作（最小集） |
|---|---|---|---|---|
| `TaskStatus.pending` | 已受理未开始 | generating：展示“已排队/准备中”，阶段尚未展开或为第 1 阶段 | 历史列表可显示“进行中”（由 RuoYi 任务索引承载） | 返回输入、返回首页（不建议提供“重试”） |
| `TaskStatus.processing` | 执行中 | generating：展示阶段列表 + 进度 + 预计剩余时间（如可用） | 历史列表可显示“进行中”并支持打开恢复 | 继续等待、取消（若支持）、断线后恢复 |
| `TaskStatus.completed` | 成功完成 | generating：收到完成事件后自动跳转结果页 | 历史/学习中心：条目状态为“可回看” | 打开结果、收藏、分享、重开（创建新任务） |
| `TaskStatus.failed` | 失败完成 | generating：进入失败态，展示可理解摘要与恢复动作；不跳转独立错误页 | 历史/学习中心：条目状态为“失败”，打开后引导到 generating 查看原因/重试 | 再试一次（创建新任务或对同任务重试，策略待冻结）、返回输入、稍后再试 |
| `TaskStatus.cancelled` | 已取消/中止 | generating：进入取消收口态，说明“已取消/已中止” | 历史/学习中心：条目可显示“已取消” | 返回输入、重新开始（创建新任务） |

> 关键区分：`failed/cancelled` 属于任务收口态，不应被页面误判为 `PageState.Empty`。

---

## 4. SSE 事件与页面呈现映射（等待页契约）

### 4.1 SSEEvent → UI 映射（仅等待态页面）

适用页面：`/video/:id/generating`、`/classroom/:id/generating`。

| `SSEEvent.*` | 语义 | 页面呈现（等待态） | 与任务状态的关系 | 断线恢复要求 |
|---|---|---|---|---|
| `SSEEvent.connected` | SSE 连接建立 | 可选轻提示（不强打断）；UI 进入“可接收进度” | 不改变 `TaskStatus.*` | 若多次重连，应避免反复打扰（仅保留一次提示或静默） |
| `SSEEvent.progress` | 阶段/进度更新 | 更新阶段列表、阶段描述、整体进度条；允许展示“当前在做什么” | `TaskStatus.pending/processing` 内部推进 | 断线后应基于 Redis 运行时状态、事件缓存补发与 `SSEEvent.snapshot` / 状态查询对齐进度，避免回退跳动 |
| `SSEEvent.provider_switch` | Provider 切换（Failover） | toast：“已切换到备用服务”；可在页面保留一处“已切换”提示点（可关闭） | 不直接改变 `TaskStatus.*`（通常仍为 `TaskStatus.processing`） | 断线恢复后应通过 Redis 事件缓存补发与运行时状态保持提示一致，不要求 `snapshot` 承载该字段 |
| `SSEEvent.heartbeat` | 心跳 | 默认不改变 UI（可用于维持“连接正常”指示） | 不改变 | 若心跳长期缺失，触发“连接异常”并进入重连/降级 |
| `SSEEvent.snapshot` | 快照恢复 | 明确展示“正在恢复进度”，并用快照覆盖当前 UI（status/stage/progress） | 快照可直接指定 `TaskStatus.*` | 若快照为 `TaskStatus.completed`，应执行与 `SSEEvent.completed` 同等的跳转逻辑 |
| `SSEEvent.completed` | 任务完成 | 进入完成态过渡（可选 0.5-1s 动效），随后自动跳转结果页 | `TaskStatus.completed` | 若跳转失败或结果页拉取失败，结果页应能引导回 generating 进行恢复 |
| `SSEEvent.failed` | 任务失败 | 进入失败态：原因摘要 + 动作按钮；停留本页 | `TaskStatus.failed` | 断线后重新进入页面时，应通过 Redis 运行时状态、事件缓存补发或降级状态查询恢复失败收口；原因摘要以最近失败事件为准 |

### 4.2 SSE 断线、超时与降级（必须覆盖）

等待页必须支持以下运行时策略（语义层要求）：

1. **自动重连**：SSE 断线后自动重试连接，期间给出“正在恢复连接”的可理解提示。
2. **超时/重试上限**：超过重试上限后进入降级模式（轮询任务状态），并在 UI 明确“当前网络不稳定，已进入降级模式”。
3. **降级不等于失败**：降级模式下任务仍可完成；完成时仍需跳转结果页。

---

## 5. 数据宿主矩阵（FastAPI / RuoYi / Redis / COS）

### 5.1 数据宿主原则（摘要）

- FastAPI：AI 功能执行与编排、异步任务协调、视频与课堂生成、Provider 调度、SSE 推送、运行时状态管理。
- RuoYi：用户/角色/权限，以及长期业务数据持久化与查询（学习记录、收藏、任务元数据、问答日志等）。
- Redis：仅运行时（必须 TTL）：任务进度、SSE 事件缓存、短期上下文、Provider 健康状态、Token 在线态等；不作为长期业务权威。
- COS：文件产物存储（例如视频 MP4），不作为业务列表权威来源。

### 5.2 “数据对象 → 宿主”映射

| 数据对象（概念） | 运行时宿主（等待态） | 持久态宿主（历史态） | 前端取数主驱动（页面视角） | 备注（边界提醒） |
|---|---|---|---|---|
| 登录态 / Token 在线态 | Redis（在线态/TTL） | RuoYi（用户/权限权威） | 所有受保护路由 | 401 固定触发“清除 Token + 跳转登录”；Redis 不可替代 RuoYi 的权限判断。 |
| 用户资料（昵称/头像/学校） | 无（或短缓存） | RuoYi | `Profile.tsx` 页面组件、导航用户入口 | 头像文件本身可在 COS，但字段权威仍是 RuoYi。 |
| VideoTask / ClassroomTask（任务元数据） | FastAPI（执行）+ Redis（状态/事件） | RuoYi（任务索引、历史条目） | generating：FastAPI；`LearningCenter.tsx` / 历史视图：RuoYi | 任务执行不在 RuoYi；RuoYi 只承接长期索引与管理。 |
| TaskProgress / Stage（进度与阶段） | Redis（TTL） | 可选写入 RuoYi（摘要） | `/video/:id/generating`、`/classroom/:id/generating` | 等待态以运行时为准；历史页若展示“进行中”，以 RuoYi 索引为长期权威，FastAPI 仅提供运行时补充查询。 |
| TaskSnapshot（断线恢复快照） | Redis（TTL） | 不存（默认） | generating 页 | snapshot 是运行时恢复资产，不写入长期业务表（除非后续明确需要审计）。 |
| SSEEvent 缓存（用于补发/重连） | Redis（TTL） | 不存（默认） | generating 页 | 断线恢复依赖 Redis 事件缓存补发；Provider 切换信息由独立 `provider_switch` 事件承载。 |
| Provider 健康状态 / Failover 记录 | Redis（TTL） | Failover 审计可选写入 RuoYi；健康探针状态不入 RuoYi 主表 | generating 页（仅呈现） | 前端只呈现“已切换到备用服务”，不暴露具体 Provider 名称；短期健康状态不应持久化到业务主表。 |
| 视频产物（MP4） | FastAPI 生成并上传 | COS | `/video/:id` | COS 只存文件；视频列表、收藏、历史引用以 RuoYi 为准。 |
| 课堂结果（幻灯片/白板/讨论片段等结构化结果） | FastAPI 生成 | RuoYi（索引/引用），必要时 COS（大文件） | `/classroom/:id` | 结果详情主驱动为 FastAPI；个人域列表与管理以 RuoYi 为准。 |
| 历史记录（History） | 无 | RuoYi | 历史视图、`LearningCenter.tsx` | 属于学习结果聚合域；删除只删除“历史引用”，不默认物理删除 COS 文件（需合规评审）。 |
| 收藏（Favorites） | 无 | RuoYi | 收藏视图、`LearningCenter.tsx`、结果页收藏按钮 | 属于学习结果聚合域；收藏为可逆操作，不建议二次确认。 |
| 知识问答会话与日志 | FastAPI（问答执行） | RuoYi（问答日志/沉淀） | `/knowledge` | 历史视图是否包含问答记录，以及“打开结果”定位策略需冻结（见第 7 节）。 |
| 小测题目与判定结果 | FastAPI（生成/判定） | RuoYi（沉淀） | 测验承载页（候选：`/quiz/:sessionId`） | 小测页的加载态是页面内部加载，不混同长任务等待态。 |
| 学习中心聚合数据 | 无 | RuoYi | `LearningCenter.tsx` 页面组件（候选：`/learning`） | 聚合以持久态为准，Redis 仅可做加速缓存。 |

---

## 6. 典型错误场景（必须覆盖）

### 6.1 401（未认证 / Token 失效）

- 触发：受保护页面初始化请求或操作请求返回 401。
- 归类：`AuthState.Unauthenticated`（不是 `PageState.Error`）。
- UI 处理：
  - 立即清理本地“已认证态”（至少不再用旧 Token 发请求）。
  - 记录 `returnTo = 当前 URL`，并跳转独立登录页。
  - 登录成功后回跳 `returnTo`。
  - 用户离开登录流则回到可访问范围（建议 `/`），并提示“登录后可继续访问刚才内容”。

### 6.2 403（无权限）

- 触发：访问资源返回 403。
- 归类：`AuthzState.Forbidden`（不是 `PageState.Error`）。
- UI 处理：
  - 进入统一的“无权限 / 登录失效”提示通道（与 `VITE_SERVICE_MODAL_LOGOUT_CODES=403` 对齐）。
  - 给出明确出口：返回首页 `/`、返回上一级。
  - 可选提供“切换账号 / 重新认证”。

### 6.3 超时（等待态与非等待态要区分）

- 等待态超时（SSE 断线、长时间无事件）：
  - 先重连，再进入降级轮询；降级不等于失败。
  - 用户可手动重试连接。
- 非等待态超时（列表/详情接口超时）：
  - 归类为 `PageState.Error`，提供重试与返回出口。

### 6.4 Provider 切换（Failover）

- 触发：`SSEEvent.provider_switch`。
- UI 处理：
  - toast：“已切换到备用服务，生成将继续进行”。
  - 页面可保留一个“已切换”提示点（可关闭），用于解释结果风格/耗时变化。
  - 不展示具体 Provider 名称、不展示内部错误码。

### 6.5 snapshot 对齐（断线重连后）

- 触发：断线重连后收到 `SSEEvent.snapshot`。
- UI 处理：
  - 恢复依据以 Redis 运行时状态与事件缓存补发为准，`snapshot` 只负责把当前 `status / stage / progress` 对齐到页面。
  - 展示“正在恢复进度”。
  - 用快照覆盖本地进度与阶段，避免进度回退或跳动造成焦虑。
  - 若快照已为 `TaskStatus.completed`，直接进入结果页跳转逻辑。

---

## 7. 冲突 / 待确认点（只记录，不改写事实源）

1. **独立登录页的最终路径与注册承载方式**：当前轮按“建议 `/login`，注册作为同页状态切换”执行；若要拆出 `/register` / `/forgot-password`，需继续冻结。
2. **结果页 `:id` 的资源语义**：`/video/:id`、`/classroom/:id` 是否与任务 ID 完全一致，或存在“任务 ID → 结果资源 ID”的二段映射；需接口契约冻结。
3. **`/quiz/:sessionId` 的 `sessionId` 语义与来源**：课堂会话 ID、测验会话 ID，还是独立 `quizSessionId`；需接口契约冻结。
4. **`/knowledge` 与 `/quiz` 的优先级差异**：事实源在“能力闭环优先级”和“独立路由页面成品化优先级”存在差异，是否允许拆分需评审定稿。
5. **历史 / 收藏在 LearningCenter 中的承载形态**：采用内部 Tab、二级路由还是独立 `/history`、`/favorites`；需全站 IA 继续冻结。
6. **历史视图是否包含知识问答记录**：若包含，“打开结果”应跳转 `/knowledge` 并定位到某次对话还是仅在 `/knowledge` 内部查看；需产品与数据模型冻结。
