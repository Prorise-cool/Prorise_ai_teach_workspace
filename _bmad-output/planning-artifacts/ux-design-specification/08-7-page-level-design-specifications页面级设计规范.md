## 7. Page-Level Design Specifications（页面级设计规范）

> **架构对齐**：页面语义仍基于 `Video Engine`、`Classroom Engine`、`Companion`、`Evidence / Retrieval`、`Learning Coach` 五层骨架理解，但线框图与成品图资产一律按页面归档；除共享反馈状态、通用对话框与警告类交互外，不再按能力模块拆 UI 目录。

### 7.1 路由分层总览（重构版）

| 页面层 | 路由 | 页面角色 | 后端依赖 | 优先级 |
|------|------|----------|----------|:------:|
| 营销落地页 | `/landing` | 营销获客、品牌说明与试点转化 | 弱依赖 CTA 跳转能力 | P1 |
| 首页与入口 | `/` | 默认产品首页中的双入口理解、推荐与去向分发 | FastAPI + RuoYi | P0 |
| 统一认证 | `/login` | 登录 / 注册与原上下文回跳 | RuoYi | P0 |
| Video Engine | `/video/input` | 单题视频任务创建与公开视频发现 | FastAPI | P0 |
| Video Engine | `/video/:id/generating` | 视频任务等待与恢复 | FastAPI + SSE | P0 |
| Video Engine | `/video/:id` | 视频播放、公开发布 / 复用、Companion 与来源抽屉 | FastAPI + RuoYi | P0 |
| Classroom Engine | `/classroom/input` | 主题课堂任务创建与联网搜索配置 | FastAPI | P0 |
| Classroom Engine | `/classroom/:id/generating` | 课堂任务等待与恢复 | FastAPI + SSE | P0 |
| Classroom Engine | `/classroom/:id` | 课堂讲解、导出、幻灯片、讨论、白板、Companion 与来源抽屉 | FastAPI + RuoYi | P0 |
| Learning Coach | `/checkpoint/:sessionId` | 会话后轻量检查点 | FastAPI | P1 |
| Learning Coach | `/quiz/:sessionId` | 正式 quiz、解析、结果回写 | FastAPI + QuizFlowProvider | P1 |
| Learning Coach | `/path` | 学习路径规划与保存 | FastAPI + PathPlanningProvider | P1/P2 |
| 学习中心域 | `/learning` | 结果聚合、推荐、错题、回看与证据面板入口 | RuoYi | P0 |
| 学习中心域 | `/history` `/favorites` | 历史与收藏管理视图 | RuoYi | P1 |
| 个人中心域 | `/profile` `/settings` | 个人资料与平台偏好 | RuoYi | P1 |

**冻结规则**

* 正式页面进入开发前，必须同时冻结高保真视觉稿、关键状态、交互说明、稳定接口契约。
* 默认产品首页固定为 `/`；营销落地页固定为 `/landing`，只在投放、宣传、试点招募等营销场景出现。
* `/learning` 承担学习结果聚合；`/history`、`/favorites` 属于学习中心域视图。
* `/profile` 只负责个人资料；`/settings` 只负责平台设置与账号偏好。
* 当前版本不保留学生端独立 `/knowledge` 主路由；Evidence / Retrieval 仅以内嵌来源抽屉或证据面板承载。
* 如后续需要独立证据深挖页，需作为后续版本需求单独立项，不属于当前 MVP 冻结口径。

### 7.2 首页与认证页

**营销落地页 `/landing`**

* 目标：用于投放、宣传、试点招募与合作转化，不替代默认产品首页。
* 模块：品牌价值、双入口能力总览、老师风格亮点、试点方案、FAQ、联系 CTA。
* 关键约束：
  * 主体验 CTA 回到 `/` 或转去 `/login`。
  * 营销页可展示教师 / 院校方案，但默认以咨询、预约、申请动作承接，不新增学生端业务路由。

**首页 `/`**

* 目标：作为默认产品首页，让用户在 3 秒内理解“主题课堂”和“单题视频”两个入口差异。
* 模块：Logo、双入口卡片、推荐提示区、最近学习入口、登录入口。
* 入口文案：
  * `我想系统地学`
  * `我有道题不会`
* 推荐语义：只帮助用户选对入口，不提前暴露复杂系统结构。
* 默认首页不承接营销落地页的长文案、定价、FAQ 或合作表单。

**统一认证页 `/login`**

* 独立页面承接登录 / 注册切换，不在首页弹框完成。
* 成功后必须回跳原上下文。
* 未授权重定向要保持可恢复，而不是无上下文跳转。

### 7.3 Video Engine 会话页

**输入页 `/video/input`**

* 一个核心输入区承接打字、拍照、粘贴。
* 老师风格以下拉方式附着在输入区域旁，不使用大卡片角色选择。
* 页面可在不打断主输入区的前提下展示公开视频发现区，作为辅助发现与复用入口。
* 主 CTA 明确表达“开始生成讲解视频”。
* 公共视频加载失败或为空时，不影响用户继续输入与创建任务。

**等待页 `/video/:id/generating`**

* 复用统一等待壳层。
* 阶段粒度至少包含：题目理解、分镜、Manim、渲染、TTS、合成。
* 失败、超时、断线恢复必须在同页闭环。

**结果页 `/video/:id`**

* 主区域为播放器。
* 侧区域为 `Companion` 入口、问答流与解释白板。
* 用户可一边播放一边追问，主叙事不被伴学劫持。
* 页面可提供公开发布 / 取消公开与复用入口，但播放器仍然是主叙事中心。
* `Evidence / Retrieval`、`Learning Coach` 只作为后续动作入口，不占据主叙事。

### 7.4 Classroom Engine 会话页

**输入页 `/classroom/input`**

* 输入主题并发起课堂任务。
* 会话配置与视频输入页保持一致，但文案偏主题学习。
* 页面提供显式联网搜索开关与最小证据范围配置，不默认替用户开启公开资料检索。

**等待页 `/classroom/:id/generating`**

* 与视频等待页共用统一任务体验。
* 阶段文案偏课堂生成、幻灯片、讨论与白板。

**结果页 `/classroom/:id`**

* 主内容区：幻灯片 / 讲解 / 讨论。
* 白板区：公式、结构图、步骤拆解。
* 伴学侧栏：围绕当前 slide、当前步骤或当前白板段落发问。
* 导出动作属于课堂后的结果消费入口，不得打断课堂主叙事或抢占主内容区。
* 正式 quiz 不得硬插在课堂主叙事中。
* Classroom Engine 只产出课后练习触发信号；正式 checkpoint / quiz 由 Learning Coach 承接。

### 7.5 学习沉淀与个人域页面

**Evidence / Retrieval（非路由来源抽屉 / 证据面板）**

* 面向资料接入、文档解析、来源引用与证据回看。
* 只作为 `/video/:id`、`/classroom/:id`、`/learning` 内的来源抽屉或证据面板出现，不再保留学生端独立页面。
* 未来若需要独立证据深挖页，视为后续版本需求，不属于当前 MVP / 当前冻结口径。

**Learning Coach `/checkpoint/:sessionId`、`/quiz/:sessionId`、`/path`**

* `checkpoint`：轻量检查理解，不打断沉浸主流程。
* `quiz`：正式作答、判题、解析与结果回写。
* `path`：长期目标、周期、计划与后续行动。

**学习中心 `/learning`**

* 聚合历史、收藏、问答记录、错题、推荐与学习路径。
* 是“结果回看与继续学”的统一入口。

**个人中心域 `/profile`、`/settings`**

* `/profile` 只承接资料编辑。
* `/settings` 承接偏好与平台设置。
* 学习结果不回流个人中心主页。

### 7.6 页面级边界冻结规则

* `Companion` 解释“当前这一步”，`Evidence / Retrieval` 解释“资料里怎么说、依据是什么”，`Learning Coach` 负责“接下来怎么学”。
* 视频与课堂页面都必须支持不中断主叙事的追问入口。
* `Companion` 的展开态属于视频结果页 / 课堂结果页的一部分，不再单独算一类页面目录。
* 任何共享等待态、toast、error、confirm，统一归入共享状态资产，不拆成伪路由。

***
