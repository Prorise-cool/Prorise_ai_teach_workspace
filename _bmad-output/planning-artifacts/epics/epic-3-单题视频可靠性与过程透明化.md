# Epic 3: 单题视频可靠性与过程透明化

用户可以更稳定、更可信地获得视频生成结果，并在执行过程中获得清晰反馈。

## Story 3.1: 统一长任务进度页与事件映射

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

## Story 3.2: Manim 自动修复与可用结果降级

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

## Story 3.3: 多 TTS Provider、健康状态与 Failover

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
