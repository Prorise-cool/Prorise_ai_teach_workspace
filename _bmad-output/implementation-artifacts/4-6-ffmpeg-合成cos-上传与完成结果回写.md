# Story 4.6: FFmpeg 合成、COS 上传与完成结果回写

Status: backlog

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 等待成片的用户，
I want 系统在完成动画与音频后合成最终视频并上传对象存储，
so that 我可以通过稳定 URL 播放和回看结果。

## Acceptance Criteria

1. 动画渲染产物（视频片段）与 TTS 音频都准备完成后，系统进入 `compose` 阶段，使用 FFmpeg 将视频与音频合成为最终视频文件（H.264 + AAC、MP4 容器），合成失败返回明确错误码 `VIDEO_COMPOSE_FAILED`。
2. 合成后的视频文件上传到 COS（或等效对象存储），进入 `upload` 阶段，成功后返回可用于结果页播放的稳定访问地址 `videoUrl` 和封面地址 `coverUrl`。
3. 上传失败时任务不会被错误标记为完成，返回 `VIDEO_UPLOAD_FAILED` 错误码；上传支持重试（最多 2 次），重试仍失败后任务进入 `failed` 状态。
4. 上传成功后，系统回写视频结果摘要（`VideoResult`）到 Redis 运行态，并触发 `task:completed` 事件，前端结果页与学习中心都可基于同一份结果标识消费视频。
5. 任务完成后，将视频结果元数据回写到 RuoYi 长期存储（通过 Story 10.4 防腐层），回写失败不阻断用户查看结果但需记录警告。
6. `compose` 和 `upload` 阶段各自通过 SSE `task:progress` 事件推送进度更新。
7. 合成前自动从渲染产物中提取封面帧（默认第 1 秒关键帧），上传为独立封面文件。

## Tasks / Subtasks

- [ ] 实现 FFmpeg 合成 service（AC: 1, 7）
  - [ ] 在 `packages/fastapi-backend/app/domains/video/services/` 下创建 `compose_service.py`。
  - [ ] 从 Redis 读取 `render_output`（视频路径）和 `tts_result`（音频路径列表）。
  - [ ] 使用 FFmpeg 合并视频与音频轨：`ffmpeg -i video.mp4 -i audio.mp3 -c:v libx264 -c:a aac -movflags +faststart output.mp4`。
  - [ ] 实现封面帧提取：`ffmpeg -ss 1 -i output.mp4 -frames:v 1 -q:v 2 cover.jpg`。
  - [ ] 定义 `ComposeResult` 数据模型：`videoPath`、`coverPath`、`duration`、`fileSize`、`format`。
  - [ ] 合成失败返回 `VIDEO_COMPOSE_FAILED` 并清理中间文件。
- [ ] 实现 COS 上传 service（AC: 2, 3）
  - [ ] 在同目录下创建 `upload_service.py`。
  - [ ] 定义 COS 上传抽象接口：`upload(local_path: str, remote_key: str) -> UploadResult`。
  - [ ] 实现 `TencentCOSUploader`（或等效对象存储实现）。
  - [ ] 上传视频文件到 `video/{taskId}/output.mp4`，封面到 `video/{taskId}/cover.jpg`。
  - [ ] 返回 `UploadResult`：`videoUrl`、`coverUrl`、`expiresAt`（签名 URL 有效期）。
  - [ ] 上传失败重试：最多 2 次，间隔递增（1s → 2s）。
  - [ ] 重试仍失败返回 `VIDEO_UPLOAD_FAILED`。
- [ ] 实现完成结果回写（AC: 4, 5）
  - [ ] 组装 `VideoResult`（对齐 Story 4.1 成功结果 schema）：`videoUrl`、`coverUrl`、`duration`、`summary`（从 UnderstandingResult 提取）、`knowledgePoints`、`resultId`、`completedAt`、`aiContentFlag: true`。
  - [ ] 将 `VideoResult` 写入 Redis `video:task:{taskId}:result`。
  - [ ] 触发 `task:completed` 事件，payload 包含 `taskId`、`taskType: video`、`status: completed`、`resultId`。
  - [ ] 异步回写到 RuoYi 长期存储（通过 Story 10.3 防腐层客户端调用 Story 10.4 元数据承接接口）。
  - [ ] RuoYi 回写失败记录 `WARNING` 日志并标记 `longTermWritebackFailed: true`，不阻断用户。
- [ ] 实现 SSE 事件推送（AC: 6）
  - [ ] `compose` 阶段开始与完成时发送 `task:progress` 事件。
  - [ ] `upload` 阶段开始与完成时发送 `task:progress` 事件。
  - [ ] 上传重试时在事件 message 中标记"重试上传"。
- [ ] 实现临时文件清理（AC: 1, 2）
  - [ ] 合成完成并上传成功后，清理本地视频片段、音频片段、合成输出等临时文件。
  - [ ] 合成或上传失败后同样清理临时文件，防止磁盘泄漏。
- [ ] 建立测试（AC: 1, 2, 3, 4, 5, 6, 7）
  - [ ] FFmpeg 合成测试：mock 输入文件，验证合成命令参数正确。
  - [ ] 封面帧提取测试：验证输出封面文件存在。
  - [ ] COS 上传测试：mock COS SDK，验证 upload 参数与返回 URL。
  - [ ] 上传重试测试：首次失败 → 重试成功 → 返回正确结果。
  - [ ] 上传全部失败测试：2 次重试均失败 → `VIDEO_UPLOAD_FAILED`。
  - [ ] 结果回写测试：验证 `VideoResult` 写入 Redis 与 `task:completed` 事件。
  - [ ] RuoYi 回写失败降级测试：回写失败 → 日志警告 → 不阻断主流程。

## Dev Notes

### Story Metadata

- Story ID: `4.6`
- Story Type: `Persistence Story`
- Epic: `Epic 4`
- Depends On: `4.1`（结果 schema）、`4.4`（渲染产物）、`4.5`（TTS 音频）、`2.4`（Redis 运行态）、`10.3`（RuoYi 防腐层客户端）、`10.4`（视频元数据长期承接）
- Blocks: `4.8`（结果页消费 VideoResult）、`4.9`（artifact 回写依赖完成态）、`4.10`（公开发布依赖结果元数据）
- Contract Asset Path: N/A（消费 Story 4.1 定义的 VideoResult schema）
- Mock Asset Path: N/A
- API / Event / Schema Impact: 触发 `task:completed` 事件；产出 `ComposeResult`、`UploadResult` 内部模型
- Persistence Impact: Redis 运行态（VideoResult）；COS 对象存储（视频文件、封面文件）；RuoYi 长期存储（元数据）
- Frontend States Covered: N/A（后端 Story；前端通过 task:completed 事件触发跳转）
- Error States Covered: FFmpeg 合成失败、COS 上传超时/失败、上传重试耗尽、RuoYi 回写失败
- Acceptance Test Notes: 必须覆盖合成成功→上传成功→回写、合成失败、上传重试、RuoYi 回写降级四条路径

### Business Context

- FFmpeg 合成与 COS 上传是视频主链路的"最后一公里"，执行到此阶段说明生成质量已通过，失败主要来自基础设施层面。
- `videoUrl` 是用户消费视频的唯一入口，URL 的稳定性和有效期直接影响用户体验。
- RuoYi 长期回写确保视频结果在 Redis TTL 过期后仍可通过学习中心查看。
- `aiContentFlag: true` 是合规硬要求，所有 AI 生成视频必须标记。

### Technical Guardrails

- FFmpeg 调用应通过 subprocess 封装执行，必须设置超时（默认 60s），防止合成命令卡死。
- COS 上传的 AK/SK 通过环境变量注入，不得硬编码或写入配置文件。
- `videoUrl` 应优先使用 CDN 加速地址而非直连 COS 地址；若 CDN 未配置则使用签名 URL。
- 签名 URL 有效期建议 7 天，前端播放器在 URL 过期前应能通过 result API 获取新 URL。
- 合成输出必须包含 `faststart` flag（`-movflags +faststart`），确保浏览器可边下边播。
- 封面帧提取使用关键帧（`-frames:v 1`），不使用非关键帧以避免模糊封面。
- 临时文件使用 `tempfile.mkdtemp(prefix=f"video_{taskId}_")` 管理，确保隔离和可追踪。

### Suggested File Targets

- `packages/fastapi-backend/app/domains/video/services/compose_service.py`
- `packages/fastapi-backend/app/domains/video/services/upload_service.py`
- `packages/fastapi-backend/app/domains/video/schemas/result.py`
- `packages/fastapi-backend/app/domains/video/storage/__init__.py`
- `packages/fastapi-backend/app/domains/video/storage/cos_uploader.py`
- `packages/fastapi-backend/app/domains/video/config.py`（扩展 COS、FFmpeg 配置项）
- `packages/fastapi-backend/tests/domains/video/test_compose_service.py`
- `packages/fastapi-backend/tests/domains/video/test_upload_service.py`

### Project Structure Notes

- `storage/` 子目录封装对象存储相关逻辑，与沙箱 `sandbox/` 平级。
- `schemas/result.py` 定义 `ComposeResult`、`UploadResult` 等内部模型，`VideoResult` 复用 Story 4.1 定义。
- FFmpeg 二进制需确保 Worker 部署环境中已安装（通过 Docker 镜像或系统包管理）。

### Testing Requirements

- FFmpeg 合成：mock subprocess.run，验证命令行参数包含 `-c:v libx264 -c:a aac -movflags +faststart`。
- 封面帧提取：验证 FFmpeg 命令包含 `-ss 1 -frames:v 1`。
- COS 上传：mock COS SDK `put_object`，验证 remote key 格式为 `video/{taskId}/output.mp4`。
- 上传重试：首次 raise → 第二次成功 → 返回正确 URL。
- 上传全部失败：2 次均 raise → `VIDEO_UPLOAD_FAILED` → `task:failed` 事件。
- VideoResult 组装：验证所有必填字段存在且类型正确。
- Redis 回写：验证 `video:task:{taskId}:result` 写入完整 VideoResult。
- `task:completed` 事件：验证事件 payload 对齐 Story 2.5 统一结构。
- RuoYi 回写降级：mock 防腐层客户端 raise → 日志包含 WARNING → 主流程不中断。
- 临时文件清理：验证成功和失败路径均清理临时目录。

### References

- `_bmad-output/planning-artifacts/epics/17-epic-4.md`：Epic 4 范围、Story 4.6 AC 与 Deliverables。
- `_bmad-output/implementation-artifacts/4-1-视频流水线阶段进度区间与结果契约冻结.md`：VideoResult schema。
- `_bmad-output/implementation-artifacts/4-4-manim-沙箱执行与资源限制.md`：渲染产物来源。
- `_bmad-output/implementation-artifacts/4-5-tts-合成与-provider-failover-落地.md`：TTS 音频来源。
- `_bmad-output/implementation-artifacts/10-3-fastapi-与-ruoyi-防腐层客户端.md`：RuoYi 防腐层。
- `_bmad-output/implementation-artifacts/10-4-视频与课堂任务元数据长期承接.md`：长期存储承接。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：合成与上传流程。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-VS-007`、`FR-VS-008`、`FR-VS-009`。
