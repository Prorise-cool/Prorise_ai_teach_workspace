## Epic 3: 单题视频输入与任务创建
用户可以通过统一输入区提交文本或图片题目，浏览可复用的公开视频，并完成任务创建后进入可恢复的等待态起点。  
**FRs covered:** `FR-UI-003`、`FR-VS-001`、`FR-VS-010`  
**NFRs covered:** `NFR-SE-003`、`NFR-UX-001`、`NFR-UX-003`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`

### Objective
Epic 3 只解决“视频主链路的前半段”：
- 如何输入；
- 如何校验；
- 如何创建任务；
- 如何发现和复用公开视频；
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
- 公开视频发现与复用入口
- 视频任务创建
- 任务 ID 返回
- 创建后跳转等待页

### Out of Scope
- 视频 stage 执行
- 播放器
- 历史回看
- 公开视频发布动作
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

### Frontend Design Reference
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/03-视频输入页/01-input.html`
- 当前补充规则：视频输入页成品图中的语境切换与公开视频发现区属于辅助理解与复用层，正式实现不得让其抢占核心输入区与主 CTA 的主叙事位置；若 OCR 失败、公开内容空态 / 错态或权限失败等状态未单独画出，前端仍必须按 Story `3.2`、`3.3` 与 `3.6` 补足

### Exit Criteria
- 用户可从输入页创建视频任务；  
- 三种输入方式可在同一输入区完成；  
- 公开视频发现区可被消费且失败不阻断主输入流程；  
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
- Story 3.6: 视频输入页公开视频广场与复用入口  

### Story 3.1: 视频任务创建契约与 mock task 基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结视频任务创建所需的接口、字段与 mock 样例，  
So that 输入页、创建接口和等待页可以围绕同一任务起点并行开发。  

**Acceptance Criteria:**
**Given** 视频域进入实施阶段  
**When** 视频任务创建契约首次发布  
**Then** 至少明确创建请求字段、成功响应字段、校验失败响应、权限失败响应与任务初始化状态  
**And** 前端不需要猜测 `taskId`、`inputType`、`userProfile`、`sourcePayload` 等字段含义  

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
**And** 当前任务 ID、输入摘要与用户配置可在等待页被正确识别  

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

### Story 3.6: 视频输入页公开视频广场与复用入口
**Story Type:** `Frontend Story`  
As a 想快速判断是否已有相近讲解的用户，  
I want 在视频输入页浏览公开视频卡片并把合适内容复用到当前输入流程，  
So that 我可以先看已有结果或少走重复创建路径。  

**Acceptance Criteria:**
**Given** 用户进入 `/video/input` 且存在已公开的视频结果  
**When** 页面完成加载  
**Then** 页面展示公开视频卡片列表或推荐集合  
**And** 主输入区与主 CTA 仍然保持页面主叙事，不会被公开内容区挤掉  

**Given** 用户浏览某张公开视频卡片  
**When** 用户点击“查看讲解”或“复用题目”  
**Then** 用户可进入对应公开视频结果页或把题目 / 摘要带回当前输入流程  
**And** 不需要通过独立社区页或额外社交流程才能完成复用  

**Given** 公开内容为空、加载失败或当前环境只提供 mock 数据  
**When** 页面渲染发现区  
**Then** 页面展示空态、降级提示或 mock 卡片样例  
**And** 用户仍可直接输入题目并创建新视频任务，不被阻断  

**Deliverables:**
- 公开视频发现区
- 卡片数据消费逻辑
- 查看讲解 / 复用题目动作
- 空态 / 错态 / mock 态

---
