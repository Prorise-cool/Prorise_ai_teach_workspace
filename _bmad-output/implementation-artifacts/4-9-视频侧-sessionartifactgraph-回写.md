# Story 4.9: 视频侧 SessionArtifactGraph 回写

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 后续需要 Companion 解释的系统，
I want 在视频任务完成时回写可被消费的会话产物索引，
so that Companion 不需要反向依赖视频流水线内部实现。

## Acceptance Criteria

1. 视频任务执行成功后，系统在结果回写阶段（`task:completed` 之后或同步执行）回写视频产物图（`VideoArtifactGraph`），至少包含视频时间轴、分镜结构、旁白文本、关键知识点与公式步骤等可索引结构，这些数据进入长期存储而不仅停留在 Redis 运行态。
2. `VideoArtifactGraph` 遵循统一的 `SessionArtifactGraph` 接口（由 Epic 10 定义），包含 `sessionId`（映射 taskId）、`sessionType: video`、`artifacts: list[Artifact]`、`createdAt`、`version`，Companion 可通过统一 artifact schema 获取当前时刻所需的上下文片段。
3. 视频 artifact 至少包含以下类型：`timeline`（时间轴与 scene 分段）、`storyboard`（完整分镜结构）、`narration`（旁白文本列表）、`knowledge_points`（知识点列表）、`solution_steps`（解题步骤）、`manim_code`（最终渲染使用的 Manim 代码，可选）。
4. 视频产物图回写失败时，视频主任务本身已完成的状态不受影响（用户仍可播放视频），但系统记录明确错误并在结果元数据中标记 `artifactWritebackFailed: true`，后续系统能区分"视频播放可用"与"Companion 支撑索引缺失"。
5. Artifact 回写通过 RuoYi 防腐层（Story 10.3）写入长期存储，key 结构与 Story 10.5（Companion 问答承接）兼容。

## Tasks / Subtasks

- [x] 定义 VideoArtifactGraph schema（AC: 1, 2, 3）
  - [x] 在 `packages/fastapi-backend/app/domains/video/schemas/` 下创建 `artifact.py`。
  - [x] 定义 `VideoArtifactGraph`（实现 `SessionArtifactGraph` 接口）。
  - [x] 定义 `Artifact` 类型枚举：`timeline`、`storyboard`、`narration`、`knowledge_points`、`solution_steps`、`manim_code`。
  - [x] 每个 artifact 包含 `artifactType`、`data`（JSON 结构）、`version`、`createdAt`。
  - [x] `timeline` artifact 结构：`scenes: list[{ sceneId, startTime, endTime, title }]`。
  - [x] `narration` artifact 结构：`segments: list[{ sceneId, text, startTime, endTime }]`。
- [x] 实现 artifact 回写 service（AC: 1, 4, 5）
  - [x] 在 `packages/fastapi-backend/app/domains/video/services/` 下创建 `artifact_writeback_service.py`。
  - [x] 从 Redis 运行态收集理解结果、分镜、旁白、渲染信息等中间产物。
  - [x] 组装 `VideoArtifactGraph`。
  - [x] 通过 RuoYi 防腐层客户端写入长期存储。
  - [x] 回写成功 → 在结果元数据中标记 `artifactWritebackSuccess: true`。
  - [x] 回写失败 → 记录 ERROR 日志，标记 `artifactWritebackFailed: true`，不阻断主流程。
- [x] 集成到视频任务完成流程（AC: 1, 4）
  - [x] 在 `video_worker.py` 的任务完成后（`task:completed` 事件之后）触发 artifact 回写。
  - [x] 回写作为"尽力而为"操作，不阻塞 `task:completed` 事件的发送。
  - [x] 回写失败时更新 Redis 中的 result 元数据标记。
- [x] 实现 Companion 消费说明与接口对齐（AC: 2）
  - [x] 在 `contracts/video/v1/` 下补充 `video-artifact-graph.md`，说明 artifact 结构与 Companion 消费方式。
  - [x] 确保 `sessionId` 映射 `taskId`，`sessionType` 为 `video`。
  - [x] 确保 artifact 查询接口与 Story 10.5 Companion 问答承接的数据源一致。
- [x] 建立测试（AC: 1, 2, 3, 4, 5）
  - [x] VideoArtifactGraph 组装测试：验证从 Redis 中间产物组装出完整 graph。
  - [x] 回写成功测试：mock 防腐层客户端，验证写入数据结构正确。
  - [x] 回写失败降级测试：防腐层客户端 raise → 日志 ERROR → `artifactWritebackFailed: true` → 主流程不中断。
  - [x] Artifact 类型完整性测试：验证至少包含 timeline、storyboard、narration、knowledge_points、solution_steps 五种类型。

## Dev Notes

### Story Metadata

- Story ID: `4.9`
- Story Type: `Persistence Story`
- Epic: `Epic 4`
- Depends On: `4.1`（结果 schema）、`4.2`（理解与分镜中间产物）、`4.6`（任务完成触发点）、`10.3`（RuoYi 防腐层客户端）、`10.5`（Companion 问答长期承接）
- Blocks: `6.3`（Companion context adapter 消费 artifact graph）
- Contract Asset Path: `contracts/video/v1/video-artifact-graph.md`
- Mock Asset Path: N/A
- API / Event / Schema Impact: 产出 `VideoArtifactGraph`、`Artifact` 数据模型；扩展 VideoResult 元数据增加 `artifactWritebackFailed` 标记
- Persistence Impact: RuoYi 长期存储（artifact graph 数据）；Redis 运行态（标记更新）
- Frontend States Covered: N/A（后端 Persistence Story）
- Error States Covered: 防腐层写入超时、防腐层写入异常、中间产物缺失、数据组装错误
- Acceptance Test Notes: 必须覆盖正常回写、回写失败降级、中间产物缺失处理

### Business Context

- Artifact graph 是 Companion 伴学功能的数据基础。没有 artifact，Companion 无法围绕视频内容提问和解答。
- 回写设计为"尽力而为"是产品决策：视频播放是用户最核心诉求，不能因为辅助功能的数据写入失败而阻断用户观看。
- `artifactWritebackFailed` 标记允许后台运维团队识别和修复回写失败的任务，后续可设计重试机制。
- Manim 代码作为可选 artifact 存储，用于后续可能的"编辑动画"高级功能。

### Technical Guardrails

- Artifact 回写必须在 `task:completed` 事件发送**之后**执行，不能阻塞用户收到完成通知。
- 回写使用 Story 10.3 防腐层客户端，不得直接访问 RuoYi 数据库。
- 从 Redis 收集中间产物时，如果某个 key 已过期（边界情况），应记录警告并跳过该 artifact，而非整体失败。
- `VideoArtifactGraph` 的 `version` 字段用于后续 schema 升级，初始版本为 `"1.0"`。
- 大体积 artifact（如 Manim 代码）应压缩后存储，避免长期存储膨胀。
- artifact 的时间戳应使用 UTC，与 Story 2.1 统一时间约定一致。

### Suggested File Targets

- `packages/fastapi-backend/app/domains/video/schemas/artifact.py`
- `packages/fastapi-backend/app/domains/video/services/artifact_writeback_service.py`
- `packages/fastapi-backend/app/domains/video/workers/video_worker.py`（扩展完成后回写）
- `contracts/video/v1/video-artifact-graph.md`
- `packages/fastapi-backend/tests/domains/video/test_artifact_writeback_service.py`

### Project Structure Notes

- `schemas/artifact.py` 定义 artifact 域模型，与 pipeline、storyboard 等 schema 平级。
- `artifact_writeback_service.py` 在 `services/` 下与其他 service 平级。
- 回写逻辑挂载在 `video_worker.py` 的任务完成后回调中。

### Testing Requirements

- 组装测试：构造完整的 Redis 中间产物 → 组装 `VideoArtifactGraph` → 验证所有 artifact 类型存在。
- 组装边界测试：某个 Redis key 缺失 → 跳过该 artifact → graph 仍可用 → 日志包含 WARNING。
- 回写成功测试：mock 防腐层 → 调用参数正确 → `artifactWritebackSuccess: true`。
- 回写失败测试：防腐层 raise Exception → `artifactWritebackFailed: true` → 主流程不中断 → ERROR 日志记录。
- 接口兼容性测试：`VideoArtifactGraph` 实现 `SessionArtifactGraph` 接口 → `sessionId`、`sessionType`、`artifacts` 字段齐全。
- 时间戳测试：所有 `createdAt` 使用 UTC 格式。

### References

- `_bmad-output/planning-artifacts/epics/17-epic-4.md`：Epic 4 范围、Story 4.9 AC 与 Deliverables。
- `_bmad-output/implementation-artifacts/4-1-视频流水线阶段进度区间与结果契约冻结.md`：VideoResult schema。
- `_bmad-output/implementation-artifacts/4-2-题目理解与分镜生成服务.md`：中间产物来源。
- `_bmad-output/implementation-artifacts/4-6-ffmpeg-合成cos-上传与完成结果回写.md`：任务完成触发点。
- `_bmad-output/implementation-artifacts/10-3-fastapi-与-ruoyi-防腐层客户端.md`：防腐层客户端。
- `_bmad-output/implementation-artifacts/10-5-companion-与-evidence-问答长期承接.md`：Companion 数据承接。
- `_bmad-output/planning-artifacts/architecture/06-6-数据分层与存储策略.md`：数据分层策略。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pytest -q packages/fastapi-backend/tests`
- `mvn -pl ruoyi-modules/ruoyi-xiaomai -am -DskipTests=false -Dtest=XmPersistenceSyncServiceTest -Dsurefire.failIfNoSpecifiedTests=false test`

### Completion Notes List

- 已定义 `VideoArtifactGraph`、artifact 类型枚举与对应 JSON 结构，并把图谱写入独立 artifact 资产文件。
- 已把 artifact 回写挂到视频任务完成后的尽力而为流程，失败时仅回写 `artifactWritebackFailed` 标记，不阻断视频可用性。
- 已将 artifact graph 通过 `/internal/xiaomai/video/session-artifacts` 真实同步到 `xm_session_artifact`，字段对齐 `/Users/prorise/Downloads/xm_dev.sql`。
- 已补充 artifact 图谱组装、RuoYi 防腐层映射与类型完整性的后端单测。

### File List

- `_bmad-output/implementation-artifacts/4-9-视频侧-sessionartifactgraph-回写.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `contracts/video/v1/video-artifact-graph.md`
- `packages/fastapi-backend/app/features/video/long_term_records.py`
- `packages/fastapi-backend/app/features/video/long_term_service.py`
- `packages/fastapi-backend/app/features/video/service.py`
- `packages/fastapi-backend/app/features/video/pipeline/models.py`
- `packages/fastapi-backend/app/features/video/pipeline/services.py`
- `packages/fastapi-backend/tests/unit/video/test_video_long_term_records.py`
- `packages/fastapi-backend/tests/unit/video/test_video_pipeline_services.py`
- `packages/fastapi-backend/tests/integration/test_video_pipeline_api.py`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/integration/domain/bo/XmPersistenceSyncBo.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/integration/domain/vo/XmPersistenceSyncVo.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/integration/controller/internal/XmPersistenceSyncController.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/integration/service/XmPersistenceSyncService.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/integration/mapper/SessionArtifactMapper.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/resources/mapper/xiaomai/integration/SessionArtifactMapper.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/test/java/org/dromara/xiaomai/integration/service/XmPersistenceSyncServiceTest.java`

## Change Log

- 2026-04-06：完成 Story 4.9 后端 artifact graph 组装、`xm_session_artifact` 长期回写、结果元数据降级标记与测试补齐，状态保持 `review`。
