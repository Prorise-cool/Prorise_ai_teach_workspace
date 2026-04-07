# Story 4.3: Manim 代码生成与自动修复链

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 等待动画生成的用户，
I want 系统在生成 Manim 代码后自动尝试修复渲染错误，
so that 视频主链路在首次失败时仍然有较高概率恢复为可用结果。

## Acceptance Criteria

1. 分镜结果已生成后，系统进入 `manim_gen` 阶段，基于 `Storyboard` 的 `scenes` 列表产出可供沙箱执行的 Manim 代码（Python 脚本），代码与当前 `taskId`、分镜上下文建立关联，并写入 Redis 运行态。
2. Manim 代码生成使用 LLM Provider（通过 Story 2.7 Provider Protocol），prompt 中包含 scene 的 `visualDescription`、`narration` 参考与 Manim 语法约束，输出为可直接执行的 `.py` 脚本内容。
3. 初次渲染失败后，系统自动进入 `manim_fix` 阶段，按修复链执行：先尝试规则修复（语法修正、常见导入缺失补齐），若规则修复不足则触发 LLM 修复（将错误日志与原始代码回传 LLM 重新生成）。
4. 自动修复尝试次数不超过 2 次（`MAX_FIX_ATTEMPTS = 2`），达到上限后任务进入明确失败状态（`VIDEO_MANIM_GEN_FAILED` 或 `VIDEO_RENDER_FAILED`），不会无限重试或无期限卡在处理中。
5. 修复链执行期间，前端可通过 SSE 事件流观察到 `manim_fix` 阶段的语义事件：`fix_attempt_start`、`fix_attempt_success`、`fix_attempt_failed`、`fix_exhausted`，用户不会误以为任务卡死不动。
6. 每次修复尝试的错误日志、修复策略（rule/llm）与修复结果记录到 Redis 运行态，供后续排查与 artifact 回写使用。

## Tasks / Subtasks

- [x] 实现 manim_gen service（AC: 1, 2）
  - [x] 在 `packages/fastapi-backend/app/domains/video/services/` 下创建 `manim_gen_service.py`。
  - [x] 从 Redis 读取 `Storyboard`，遍历 scenes 构建 Manim 代码生成 prompt。
  - [x] 通过 LLM Provider 生成 Manim Python 脚本内容。
  - [x] 定义 `ManimCodeResult` 数据模型：`scriptContent: str`、`sceneMapping: list[SceneCodeMapping]`、`generatedAt: datetime`。
  - [x] 将生成结果写入 Redis `video:task:{taskId}:manim_code`。
  - [x] 发送 `task:progress` 事件（stage: `manim_gen`）。
- [x] 实现规则修复策略（AC: 3）
  - [x] 在 `packages/fastapi-backend/app/domains/video/services/` 下创建 `manim_fix_service.py`。
  - [x] 实现 `RuleBasedFixer`：处理常见 Manim 错误（缺失 import、Scene 类名不匹配、API 版本差异、未定义变量引用）。
  - [x] `RuleBasedFixer` 接收 `scriptContent` + `errorLog` → 返回 `FixResult { fixed: bool, fixedScript: str | None, strategy: "rule", errorType: str }`。
- [x] 实现 LLM 修复策略（AC: 3）
  - [x] 在 `manim_fix_service.py` 中实现 `LLMBasedFixer`。
  - [x] 将原始代码 + 错误日志 + Storyboard 上下文回传 LLM Provider，请求修复版本。
  - [x] `LLMBasedFixer` 返回 `FixResult { fixed: bool, fixedScript: str | None, strategy: "llm", errorType: str }`。
- [x] 实现修复链调度与次数控制（AC: 3, 4, 6）
  - [x] 实现 `FixChain` 调度器：规则修复优先 → 失败后 LLM 修复 → 直到成功或达到 `MAX_FIX_ATTEMPTS`。
  - [x] 每次修复尝试记录到 Redis `video:task:{taskId}:fix_log`，包含 `attemptNo`、`strategy`、`errorType`、`success`、`timestamp`。
  - [x] 修复成功后更新 `video:task:{taskId}:manim_code` 为修复后版本。
  - [x] 达到上限后产生 `VIDEO_MANIM_GEN_FAILED` 或 `VIDEO_RENDER_FAILED`（取决于失败点）。
- [x] 实现修复事件推送（AC: 5）
  - [x] `manim_fix` 阶段开始时发送 `task:progress`（stage: `manim_fix`，message 包含 attemptNo）。
  - [x] 每次修复尝试结束后发送细粒度事件：成功 → `fix_attempt_success`、失败 → `fix_attempt_failed`。
  - [x] 修复耗尽后发送 `fix_exhausted` → 随后触发 `task:failed`。
  - [x] 修复成功后恢复到 `render` 阶段，发送 `task:progress`（stage: `render`）。
- [x] 集成到视频任务主调度链（AC: 1, 3, 4）
  - [x] 在 `video_worker.py` 中 `storyboard` 之后调用 `manim_gen_service`。
  - [x] 渲染失败后进入 `manim_fix` 分支，调用 `FixChain`。
  - [x] 修复成功后回到渲染阶段重新尝试。
- [x] 建立单元测试与集成测试（AC: 1, 2, 3, 4, 5, 6）
  - [x] Manim 代码生成测试：mock LLM，验证输出为合法 Python 脚本结构。
  - [x] 规则修复测试：输入已知错误模式，验证修复输出。
  - [x] LLM 修复测试：mock LLM，验证错误日志回传与修复脚本产出。
  - [x] 修复链次数控制测试：连续失败时验证不超过 MAX_FIX_ATTEMPTS。
  - [x] 事件推送测试：验证修复链各阶段产出正确 SSE 事件。
  - [x] Redis 日志记录测试：验证 fix_log 写入完整性。

## Dev Notes

### Story Metadata

- Story ID: `4.3`
- Story Type: `Backend Story`
- Epic: `Epic 4`
- Depends On: `4.1`（stage 枚举）、`4.2`（Storyboard 结构）、`2.7`（Provider Protocol）、`2.4`（Redis 运行态）
- Blocks: `4.4`（沙箱执行消费 Manim 代码）、`4.9`（artifact 回写消费修复日志）
- Contract Asset Path: N/A（内部服务，对外语义通过 stage 事件暴露）
- Mock Asset Path: N/A
- API / Event / Schema Impact: `task:progress` 事件增加修复语义消息；产出 `ManimCodeResult`、`FixResult`、`FixLog` 数据模型
- Persistence Impact: Redis 运行态（manim_code、fix_log）；长期存储由 Story 4.9 处理
- Frontend States Covered: N/A（后端 Story；前端通过 SSE 事件间接消费）
- Error States Covered: LLM 生成失败、Manim 语法错误、规则修复失败、LLM 修复失败、修复次数耗尽
- Acceptance Test Notes: 必须覆盖正常生成、首次成功无需修复、规则修复成功、LLM 修复成功、修复耗尽失败五条路径

### Business Context

- Manim 代码生成是视频主链路的核心技术风险点，LLM 生成的代码不一定能直接渲染成功，自动修复链是降低失败率的关键机制。
- 修复链设计遵循"快修优先、重生兜底"策略：规则修复几乎零延迟，LLM 修复需要额外 API 调用但覆盖面更广。
- `MAX_FIX_ATTEMPTS = 2` 是时间与成本的权衡：每次修复尝试意味着额外的 LLM 调用和渲染尝试，用户等待时间线性增加。
- 修复日志不仅用于运行态排查，还是后续优化 prompt 和规则修复器的重要数据来源。

### Technical Guardrails

- Manim 代码生成必须通过 Provider Protocol 调用 LLM，不得硬编码 API endpoint。
- 生成的 Manim 脚本必须为标准 Python 语法，能被 `ast.parse()` 校验通过后才传递给沙箱（Story 4.4 的沙箱预检可以在这里做）。
- `MAX_FIX_ATTEMPTS` 必须为可配置常量（环境变量或配置文件），不得硬编码在业务逻辑中。
- 修复链不得在失败后静默吞掉错误信息；每次修复尝试的 `errorLog` 必须完整传递，不能只传最后一条。
- 修复成功后必须重新运行沙箱渲染（Story 4.4），不能跳过渲染直接进入后续 stage。
- Manim 代码中不得包含 `os.system`、`subprocess`、`eval`、`exec`、网络请求等危险操作，生成后应做基础安全扫描。

### Suggested File Targets

- `packages/fastapi-backend/app/domains/video/services/manim_gen_service.py`
- `packages/fastapi-backend/app/domains/video/services/manim_fix_service.py`
- `packages/fastapi-backend/app/domains/video/schemas/manim.py`
- `packages/fastapi-backend/app/domains/video/workers/video_worker.py`（扩展 manim_gen + manim_fix 调度）
- `packages/fastapi-backend/app/domains/video/config.py`（MAX_FIX_ATTEMPTS 等可配置常量）
- `packages/fastapi-backend/tests/domains/video/test_manim_gen_service.py`
- `packages/fastapi-backend/tests/domains/video/test_manim_fix_service.py`

### Project Structure Notes

- `services/` 下新增 `manim_gen_service.py` 和 `manim_fix_service.py`，与 `understanding_service.py`、`storyboard_service.py` 平级。
- `schemas/manim.py` 定义 `ManimCodeResult`、`FixResult`、`FixLog`、`SceneCodeMapping` 等数据模型。
- `config.py` 集中管理视频域可配置常量，避免散落在各 service 中。

### Testing Requirements

- Manim 代码生成：mock LLM 返回合法 Python 脚本，验证 `ManimCodeResult` 结构完整。
- Manim 代码安全扫描：验证生成脚本不含 `os.system`、`subprocess`、`eval` 等危险调用。
- 规则修复：构造缺失 import、类名不匹配等已知错误，验证 `RuleBasedFixer` 修复成功。
- LLM 修复：mock LLM 返回修复版本，验证错误日志完整传递。
- 修复链调度：连续 3 次失败验证只尝试 2 次后返回 `VIDEO_MANIM_GEN_FAILED`。
- 修复事件：验证每次修复尝试产生正确的 SSE 事件序列。
- Redis 状态：验证 `manim_code` 和 `fix_log` 的 Redis 读写一致性。
- 时长约束传递：验证从 Storyboard 接收的时长约束在代码生成中被正确考虑。

### References

- `_bmad-output/planning-artifacts/epics/17-epic-4.md`：Epic 4 范围、Story 4.3 AC 与 Deliverables。
- `_bmad-output/implementation-artifacts/4-1-视频流水线阶段进度区间与结果契约冻结.md`：stage 枚举。
- `_bmad-output/implementation-artifacts/4-2-题目理解与分镜生成服务.md`：Storyboard 结构。
- `_bmad-output/implementation-artifacts/2-7-provider-protocol工厂与优先级注册骨架.md`：Provider Protocol。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：Manim 自动修复上限与流程。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-VS-004`、`FR-VS-005`。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pytest -q packages/fastapi-backend/tests/unit/video/test_video_pipeline_services.py`
- `pytest -q packages/fastapi-backend/tests/integration/test_video_pipeline_api.py`

### Completion Notes List

- 已在视频流水线服务中补齐 Manim 脚本生成、规则修复、LLM 修复与修复次数控制，并把修复日志写入 Redis 运行态。
- 已打通 `manim_gen -> render -> manim_fix -> render` 的回环执行，以及 `fix_attempt_start / success / failed / exhausted` 事件语义。
- 已补充针对 Manim 生成、规则修复、LLM 修复的后端单测。

### File List

- `_bmad-output/implementation-artifacts/4-3-manim-代码生成与自动修复链.md`
- `packages/fastapi-backend/app/core/config.py`
- `packages/fastapi-backend/app/features/video/pipeline/models.py`
- `packages/fastapi-backend/app/features/video/pipeline/services.py`
- `packages/fastapi-backend/app/features/video/tasks/video_task_actor.py`
- `packages/fastapi-backend/app/worker.py`
- `packages/fastapi-backend/tests/unit/video/test_video_pipeline_services.py`
- `packages/fastapi-backend/tests/integration/test_video_pipeline_api.py`

## Change Log

- 2026-04-06：完成 Story 4.3 后端 Manim 生成与自动修复链，实现修复日志、修复事件与对应单测，状态更新为 `review`。
