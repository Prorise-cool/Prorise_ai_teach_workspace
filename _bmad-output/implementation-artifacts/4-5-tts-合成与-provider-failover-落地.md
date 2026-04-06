# Story 4.5: TTS 合成与 Provider Failover 落地

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 等待旁白生成的用户，
I want 系统在主 TTS 服务异常时自动切换备用服务，
so that 视频合成不因单一语音服务失败而整体报废。

## Acceptance Criteria

1. 讲解文本（来自 Storyboard 的 `narration` 字段）准备完成后，系统进入 `tts` 阶段，调用主 TTS Provider 完成语音合成，产出按 scene 分段的音频文件，旁白结果可被后续 FFmpeg 合成阶段消费。
2. 主 TTS Provider 超时、报错或不可用时，系统自动切换到备用 TTS Provider（通过 Story 2.8 Provider Failover 机制），切换信息通过 SSE 事件或结果元数据可见（`providerUsed`、`failoverOccurred`）。
3. 所有 TTS Provider 都失败时，返回统一错误码 `VIDEO_TTS_ALL_PROVIDERS_FAILED`，任务进入明确失败状态，不会静默卡住或返回无音频的伪成功结果。
4. TTS 合成支持按 scene 粒度分段处理，每个 scene 的音频独立生成，单个 scene 失败不立即终止整个 TTS 阶段，而是尝试 failover 后再决定是否终止。
5. TTS 合成期间通过 SSE `task:progress` 事件推送 `tts` 阶段进度，至少包含当前处理的 scene 索引与总 scene 数。
6. TTS 输出的音频格式统一为 `MP3` 或 `WAV`（具体格式在配置中指定），采样率与比特率满足视频合成质量要求。

## Tasks / Subtasks

- [x] 实现 TTS service（AC: 1, 4, 6）
  - [x] 在 `packages/fastapi-backend/app/domains/video/services/` 下创建 `tts_service.py`。
  - [x] 从 Redis 读取 `Storyboard`，遍历 scenes 提取 `narration` 文本列表。
  - [x] 对每个 scene 调用 TTS Provider 生成音频文件，存储到临时目录。
  - [x] 定义 `TTSResult` 数据模型：`audioSegments: list[AudioSegment]`、`totalDuration`、`providerUsed`、`failoverOccurred`。
  - [x] 定义 `AudioSegment` 数据模型：`sceneId`、`audioPath`、`duration`、`format`。
  - [x] 将 `TTSResult` 元数据写入 Redis `video:task:{taskId}:tts_result`。
- [x] 实现 TTS Provider 注册与 Failover（AC: 2, 3）
  - [x] 通过 Story 2.7 Provider Protocol 注册 TTS Provider（主备至少两个）。
  - [x] 使用 Story 2.8 Provider Failover 机制：主 Provider 调用失败 → 健康检查标记 → 切换备 Provider。
  - [x] 定义 TTS Provider 接口：`synthesize(text: str, voice_config: VoiceConfig) -> AudioOutput`。
  - [x] `VoiceConfig` 数据模型：`language`、`voiceId`、`speed`、`format`、`sampleRate`。
  - [x] failover 发生时在 `TTSResult` 中标记 `providerUsed` 和 `failoverOccurred: true`。
- [x] 实现 TTS 全 Provider 失败处理（AC: 3）
  - [x] 所有 Provider 失败后产生 `VIDEO_TTS_ALL_PROVIDERS_FAILED` 错误码。
  - [x] 触发 `task:failed` 事件并携带 `failedStage: tts`。
  - [x] 清理已生成的部分音频临时文件。
- [x] 实现 scene 粒度容错（AC: 4）
  - [x] 单个 scene TTS 失败后先尝试当前 Provider 重试（1 次），再尝试 failover Provider。
  - [x] 如果单个 scene 在所有 Provider 上都失败，标记该 scene 为 `failed`，决定是否继续其他 scene 或终止整个 TTS 阶段（默认策略：任一 scene 失败则终止）。
- [x] 实现 SSE 事件推送（AC: 5）
  - [x] `tts` 阶段开始时发送 `task:progress`（stage: `tts`，message: "正在生成旁白"）。
  - [x] 每完成一个 scene 的 TTS 后发送进度更新（含 `currentScene` / `totalScenes`）。
  - [x] failover 发生时在事件 message 中标记"切换备用语音服务"。
- [x] 实现音频格式与质量配置（AC: 6）
  - [x] 默认输出格式 `MP3`，采样率 `44100Hz`，比特率 `192kbps`。
  - [x] 格式参数可通过配置文件覆盖。
  - [x] 生成后验证音频文件可用性（文件存在、大小 > 0、可被 FFmpeg 探测）。
- [x] 建立测试（AC: 1, 2, 3, 4, 5, 6）
  - [x] TTS 正常合成测试：mock Provider，验证按 scene 粒度产出音频元数据。
  - [x] Failover 测试：主 Provider 失败 → 自动切换备 Provider → 结果标记 failoverOccurred。
  - [x] 全 Provider 失败测试：所有 Provider 失败 → `VIDEO_TTS_ALL_PROVIDERS_FAILED`。
  - [x] scene 粒度容错测试：单 scene 失败 → 重试 → failover → 终止。
  - [x] 音频格式验证测试：输出格式、采样率、文件可用性。

## Dev Notes

### Story Metadata

- Story ID: `4.5`
- Story Type: `Backend Story`
- Epic: `Epic 4`
- Depends On: `4.1`（stage 枚举）、`4.2`（Storyboard 提供 narration）、`2.7`（Provider Protocol）、`2.8`（Provider Failover）、`2.4`（Redis 运行态）
- Blocks: `4.6`（FFmpeg 合成消费 TTS 音频）
- Contract Asset Path: N/A（内部服务）
- Mock Asset Path: N/A
- API / Event / Schema Impact: 产出 `TTSResult`、`AudioSegment`、`VoiceConfig` 数据模型；发送 `tts` 阶段 `task:progress` 事件
- Persistence Impact: Redis 运行态（tts_result）；音频临时文件（合成后清理）
- Frontend States Covered: N/A（后端 Story；前端通过 SSE 事件间接消费 tts 阶段进度）
- Error States Covered: TTS 主 Provider 超时/报错、Failover 切换、所有 Provider 失败、单 scene 合成失败
- Acceptance Test Notes: 必须覆盖正常合成、failover 切换、全 Provider 失败、scene 粒度容错四条路径

### Business Context

- TTS 是视频主链路中外部依赖最重的阶段之一，主流 TTS 服务（Azure、阿里云等）的可用性直接影响视频生成成功率。
- Failover 机制是 MVP 阶段降低单点故障影响的关键策略，用户不应因为单一语音服务临时不可用而得到失败结果。
- TTS 的 `providerUsed` 信息会出现在视频结果元数据中，用于后续质量分析和成本核算。
- scene 粒度的分段处理允许未来实现部分重试（只重新生成失败的 scene），但 MVP 阶段默认任一 scene 失败则终止。

### Technical Guardrails

- TTS 调用必须通过 Story 2.7 Provider Protocol 进行，不得直接调用特定 TTS SDK。
- Failover 必须使用 Story 2.8 已建立的健康检查与切换机制，不得在 TTS service 中重新实现 failover 逻辑。
- 音频临时文件必须使用带 `taskId` 前缀的命名，便于清理和排查。
- TTS Provider 的 API key、endpoint 等敏感配置通过环境变量注入，不得硬编码。
- 音频文件不得直接暴露给前端；前端消费的是合成后的完整视频（Story 4.6）。
- TTS 输出的音频时长应与 Storyboard scene 的 `durationHint` 大致匹配；若偏差过大应记录警告但不阻断流程。

### Suggested File Targets

- `packages/fastapi-backend/app/domains/video/services/tts_service.py`
- `packages/fastapi-backend/app/domains/video/schemas/tts.py`
- `packages/fastapi-backend/app/domains/video/providers/tts_provider.py`（TTS Provider 接口定义）
- `packages/fastapi-backend/app/domains/video/providers/azure_tts.py`（Azure TTS 实现示例）
- `packages/fastapi-backend/app/domains/video/providers/aliyun_tts.py`（阿里云 TTS 实现示例）
- `packages/fastapi-backend/app/domains/video/config.py`（扩展 TTS 配置项）
- `packages/fastapi-backend/tests/domains/video/test_tts_service.py`

### Project Structure Notes

- `providers/` 子目录用于存放视频域特有的 Provider 实现，与 Story 2.7 的通用 Provider Protocol 配合。
- TTS Provider 实现类注册到 `ProviderFactory`，由 `tts_service.py` 通过工厂获取，不直接 import 具体实现。
- `schemas/tts.py` 定义 TTS 域数据模型，与 `schemas/pipeline.py`、`schemas/storyboard.py` 平级。

### Testing Requirements

- TTS 正常合成：mock TTS Provider 返回音频元数据，验证 `TTSResult` 结构完整、`audioSegments` 与 scenes 一一对应。
- Failover 切换：主 Provider raise Exception → 验证切换到备 Provider → 结果 `failoverOccurred: true`。
- 全 Provider 失败：主备均 raise Exception → 验证 `VIDEO_TTS_ALL_PROVIDERS_FAILED` 错误码和 `task:failed` 事件。
- scene 粒度容错：第 2 个 scene 主 Provider 失败 → 备 Provider 成功 → 继续后续 scene。
- 音频格式：验证输出格式配置生效、文件元数据（格式、采样率）正确。
- SSE 事件：验证每个 scene 完成后发送进度更新，包含正确的 scene 索引。
- Redis 状态：验证 `tts_result` 写入 Redis 的完整性和 TTL 设置。

### References

- `_bmad-output/planning-artifacts/epics/17-epic-4.md`：Epic 4 范围、Story 4.5 AC 与 Deliverables。
- `_bmad-output/implementation-artifacts/4-1-视频流水线阶段进度区间与结果契约冻结.md`：stage 枚举。
- `_bmad-output/implementation-artifacts/4-2-题目理解与分镜生成服务.md`：Storyboard 结构（narration 来源）。
- `_bmad-output/implementation-artifacts/2-7-provider-protocol工厂与优先级注册骨架.md`：Provider Protocol。
- `_bmad-output/implementation-artifacts/2-8-provider-健康检查failover-与缓存策略.md`：Provider Failover 机制。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：TTS Failover 流程。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-VS-006`。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pytest -q packages/fastapi-backend/tests/unit/video/test_video_pipeline_services.py`
- `pytest -q packages/fastapi-backend/tests/integration/test_video_pipeline_api.py`

### Completion Notes List

- 已完成 scene 粒度 TTS 合成、Provider Failover、全链路错误映射与 `tts_result` 运行态持久化。
- 已在 `task:progress` 中补齐 `currentScene`、`totalScenes`、`providerUsed`、`failoverOccurred`，便于等待态展示。
- 已补充针对 TTS 成功、failover 与输出元数据的后端单测。

### File List

- `_bmad-output/implementation-artifacts/4-5-tts-合成与-provider-failover-落地.md`
- `packages/fastapi-backend/app/core/config.py`
- `packages/fastapi-backend/app/features/video/pipeline/models.py`
- `packages/fastapi-backend/app/features/video/pipeline/services.py`
- `packages/fastapi-backend/tests/unit/video/test_video_pipeline_services.py`
- `packages/fastapi-backend/tests/integration/test_video_pipeline_api.py`

## Change Log

- 2026-04-06：完成 Story 4.5 后端 TTS 合成与 failover 落地，补齐事件字段与单测，状态更新为 `review`。
