## Epic 4: 单题视频生成、结果消费与失败恢复
用户可以完成视频生成主链路、透明等待、结果播放、公开发布 / 复用、失败解释、TTS Failover 与视频侧 SessionArtifactGraph 回写。  
**FRs covered:** `FR-UI-004`、`FR-VS-002~009`、`FR-VP-001~004`  
**NFRs covered:** `NFR-PF-002`、`NFR-PF-005`、`NFR-SE-005`  
**Primary Story Types:** `Contract Story`、`Backend Story`、`Frontend Story`、`Persistence Story`、`Integration Story`

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
- 结果公开发布与输入页复用卡片；
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
- 公开发布状态与最小复用卡片 payload
- 视频侧 artifact 回写

### Out of Scope
- 视频输入创建
- 课堂生成
- Companion 逻辑
- Evidence 检索
- 评论、点赞、关注等社区互动
- Quiz 逻辑

### Dependencies
- 依赖 `Epic 2` 的任务框架、SSE 与 Provider 抽象。  
- 依赖 `Epic 3` 的视频任务创建起点。  
- 依赖 `Epic 10` 的任务元数据与 artifact 长期回写。  
- `Epic 3` 的公开视频发现区会消费本 Epic 产出的公开结果元数据。  

### Entry Criteria
- 视频 stage 命名与阶段进度分布已稳定。  
- 等待页与结果页关键状态说明稳定。  
- 沙箱安全边界已明确。  

### Frontend Design Reference
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/04-视频等待页/01-generating.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/05-视频结果页/02-video-result.html`
- 参考共享状态：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/02-共享交互与通用状态/01-任务等待与进度/task-progress-shell.html`
- 当前补充规则：视频结果成品图已覆盖播放器、Companion 与来源抽屉，但未完整展开公开发布 / 取消公开 / 复用入口；前端仍必须按 Story `4.8` 与 `4.10` 补足结果操作区

### Exit Criteria
- 视频任务可以完整执行或失败退出；  
- 等待页可以透明展示状态并支持恢复；  
- 结果页可以稳定消费视频；  
- 公开视频可显式发布、取消公开并被输入页复用；  
- 失败原因和 Provider 切换可解释；  
- 视频侧 artifact 已可供 Companion 消费。  

### Parallel Delivery Rule
Story `4.1` 是前后端的共同前置。  
Story `4.7` 和 `4.8` 可在 `4.1 + Epic 2` 完成后基于 mock 先做。  
Story `4.2 ~ 4.6` 可由后端并行实现，但以统一 stage 契约为边界。  
Story `4.9` 必须在视频结果 schema 稳定后接入。  
Story `4.10` 依赖 `4.6` 的结果元数据与 `4.8` 的结果页壳层，但可围绕冻结 payload 并行推进。  
Story `4.11` 依赖 `4.7` 的等待页状态机、`4.6` 的资产发布能力与 `4.9` 的中间产物结构认知，但不得改写 `4.8` 的“结果页只消费最终成片”边界。  

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
- Story 4.10: 视频结果公开发布与输入页复用卡片  
- Story 4.11: 视频等待页渐进式产物展示与分段预览  

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

**Given** 页面需要承接结果操作  
**When** 用户查看结果摘要区与结果操作区  
**Then** 页面提供公开发布 / 取消公开、结果复用入口与必要状态反馈  
**And** 即使当前成品图未完整展开该操作区，也不能遗漏 Story `4.10` 约定的业务动作

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

### Story 4.10: 视频结果公开发布与输入页复用卡片
**Story Type:** `Integration Story`  
As a 产出讲解结果的用户，  
I want 在视频结果页显式公开发布可复用的视频结果，  
So that 输入页可以发现这些公开结果并为其他用户提供快速复用入口。  

**Acceptance Criteria:**
**Given** 视频任务已经完成且结果满足公开条件  
**When** 用户在 `/video/:id` 执行公开发布  
**Then** 系统记录公开状态、最小卡片元数据与稳定结果标识  
**And** 默认私有结果不会在未确认的情况下自动进入公开发现区  

**Given** 某个结果已经公开发布  
**When** `/video/input` 请求公开卡片数据  
**Then** 输入页可获得标题 / 摘要、知识点、封面 / 时长与复用所需最小字段  
**And** 不需要额外拼装社区详情数据或依赖独立视频社区页  

**Given** 用户取消公开、公开失败或权限不足  
**When** 结果页更新公开状态  
**Then** 页面返回明确反馈并同步到公开发现区  
**And** 不会把失败或未授权结果伪装成已公开可复用状态  

**Deliverables:**
- 公开发布 / 取消公开动作
- 公开结果最小元数据 schema
- 输入页复用卡片 payload
- 公开状态失败与权限处理

### Story 4.11: 视频等待页渐进式产物展示与分段预览
**Story Type:** `Integration Story`  
As a 等待讲解视频生成的用户，  
I want 在等待页先看到结构化中间产物并逐步查看已完成片段，  
So that 在最终整片生成完成前，我也能确认任务真实推进并提前开始消费部分结果。  

**Acceptance Criteria:**
**Given** 视频任务已经完成 `storyboard` 阶段  
**When** 用户停留在 `/video/:id/generating`  
**Then** 页面可展示题目摘要、知识点与按顺序排列的分镜卡片  
**And** 这些数据来自真实后端中间产物，而不是前端根据日志文案猜测拼装  

**Given** 某个 section 在 `render` 阶段已成功产出视频片段  
**When** 等待页刷新渐进预览  
**Then** 页面可展示该 section 的稳定片段地址或播放器卡片  
**And** 用户刷新页面后仍能恢复这些已完成片段，而不是回退成只剩总体进度条  

**Given** 最终整片尚未生成完成  
**When** 用户查看等待页或触发恢复  
**Then** 系统不会把 section 片段预览伪装成任务已完成  
**And** `/video/:id` 结果页仍只在最终 `videoUrl` 可用后才承担成功态播放职责  

**Given** 当前瓶颈仍主要发生在 `manim_gen` 阶段  
**When** 团队设计渐进体验  
**Then** 系统只承诺在该阶段展示非视频中间产物（如理解摘要、分镜、ETA、日志）  
**And** 不会对用户做出“边生成脚本边播放最终视频”的错误承诺  

**Deliverables:**
- 渐进预览 schema
- preview endpoint / 恢复策略
- 等待页分镜预览区
- section 片段发布策略
- 最终成片与渐进预览边界说明

---
