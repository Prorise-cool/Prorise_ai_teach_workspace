# Story 10.5: Companion 与 Evidence 问答长期承接

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 回访用户与平台，
I want 会话伴学与资料依据问答被长期保存，
so that 学习中心能够回看问答过程，后台也能进行审计与分析。

## Acceptance Criteria

1. 一轮 Companion 或 Evidence 问答结束时，系统至少保存问题、回答摘要、来源、锚点或范围、时间戳与状态，这些记录可用于学习中心回看与后台查询。
2. 某条问答带有白板动作、来源引用或范围信息时，相关附加信息以结构化字段或关联记录形式保存，后续页面不需要重新执行问答才能恢复主要内容。
3. 某轮问答部分失败时，长期记录能区分主回答成功、白板降级、引用缺失或整体失败等状态，后续回看页面不会误判本轮为“完整成功”。

## Tasks / Subtasks

- [x] 定义问答主记录与关联记录结构（AC: 1, 2, 3）
  - [x] 明确 `xm_companion_turn`、`xm_whiteboard_action_log`、`xm_knowledge_chat_log` 的主键、关联键、会话类型、锚点 / 范围、来源摘要与状态字段。
  - [x] 对白板动作、来源引用和结构化范围信息设计独立关联字段或子表，不把复杂数据压成不可恢复的自由文本。
  - [x] 约束 Evidence 侧沿用 `xm_knowledge_chat_log` 这一历史表名时的字段语义说明，避免语义漂移。
- [x] 建立 Companion / Evidence 回写映射（AC: 1, 2）
  - [x] 将 Companion 的当前时刻追问、连续追问、白板动作与来源引用映射到统一长期结构。
  - [x] 将 Evidence 的检索范围、引用来源、问答摘要与状态映射到长期结构。
  - [x] 保持学习中心与后台查询消费的字段语义一致。
- [x] 补齐降级状态与回看恢复规则（AC: 2, 3）
  - [x] 定义完整成功、部分成功、白板降级、引用缺失、整体失败等状态语义。
  - [x] 保证回看页可以直接从长期记录恢复问题、回答摘要、锚点和来源，而不是重新发起问答。
  - [x] 对需要落入 COS 的白板渲染产物，只保存对象引用和必要元数据。
- [x] 增加持久化与恢复测试（AC: 1, 2, 3）
  - [x] 覆盖 Companion 问答、Evidence 问答、带白板动作和带来源引用的回写场景。
  - [x] 覆盖部分失败、引用缺失和白板降级的状态记录。
  - [x] 覆盖学习中心或后台从长期记录回看主要内容的场景。

## Dev Notes

### Business Context

- 该 Story 直接支撑 Epic 6 与 Epic 7 的长期回写能力，并为 Epic 9 学习中心回看提供数据来源。
- Companion 与 Evidence 虽然来自不同功能域，但长期宿主层需要为它们提供统一的回写、查询与审计边界。
- 如果 `10.5` 没有明确部分失败与降级语义，后续回看页面会把“有缺损的回答”误判成完整成功。

### Technical Guardrails

- 问答长期记录必须包含会话类型、锚点 / 范围、问题、回答摘要、来源信息、时间戳与状态字段。
- 白板动作、来源引用和范围信息必须结构化保存，避免后续无法精确恢复。
- `xm_knowledge_chat_log` 是 Evidence / Retrieval 问答历史的既有表名，使用时必须在文档和代码中明确其当前承载语义。
- 部分失败是一级状态，不得简单折叠为 success / failed 二值。
- 长期回看不得依赖重新执行 LLM 问答；只允许使用已沉淀的摘要、引用与对象引用恢复内容。

### Suggested File Targets

- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_companion_evidence_log.sql`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/`
- `packages/fastapi-backend/app/features/companion/`
- `packages/fastapi-backend/app/features/knowledge/`
- `packages/fastapi-backend/app/shared/ruoyi_client.py`
- `packages/fastapi-backend/tests/integration/test_companion_evidence_persistence.py`

### Project Structure Notes

- 架构文档把 `companion/` 与 `knowledge/` 作为两个独立 FastAPI feature 目录，但当前仓库里这些目录尚未创建。
- `xm_knowledge_chat_log` 在架构文档中被标注为历史表名，当前 Story 必须显式保留这个约束，避免开发阶段随意改名导致上下游脱节。
- 白板动作日志既可能落入 RuoYi，也可能关联 COS 产物，因此表结构与对象引用要同时考虑。

### Testing Requirements

- 覆盖当前时刻追问、连续追问、Evidence 检索问答三类主要回写路径。
- 覆盖带白板动作、带来源引用与带范围信息的结构化恢复。
- 覆盖主回答成功但白板降级、主回答成功但引用缺失、整体失败等状态组合。
- 覆盖学习中心回看和后台查询不依赖重新发起问答即可恢复主要内容。

### References

- `_bmad-output/planning-artifacts/epics/27-epic-10-ruoyi.md`：Story 10.5 AC 与交付物。
- `_bmad-output/planning-artifacts/epics/23-epic-6.md`：Companion 问答、白板动作与持久化字段上下文。
- `_bmad-output/planning-artifacts/epics/24-epic-7.md`：Evidence / Retrieval 问答、来源抽屉与长期记录上下文。
- `_bmad-output/planning-artifacts/epics/28-cross-epic-integration-matrix.md`：Companion / Evidence 与 Epic 10、Epic 9 的对齐关系。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-CP-005`、`FR-KQ-006`。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：Companion 关键链路与回写节点。
- `_bmad-output/planning-artifacts/architecture/07-7-职责边界与集成关系.md`：`xm_companion_turn`、`xm_whiteboard_action_log`、`xm_knowledge_chat_log` 宿主定义。
- `_bmad-output/planning-artifacts/architecture/09-9-外部平台集成策略.md`：Evidence / Learning 相关结果回写时机。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已新增 `xm_companion_turn`、`xm_whiteboard_action_log`、`xm_knowledge_chat_log` 的 SQL 表结构，并保留 `xm_knowledge_chat_log` 的历史表名语义。
- 已补齐 Companion / Evidence 的内存级长期回写模型，显式保存 `user_id`、锚点、来源引用、白板动作日志与 `partial_failure` 等状态。
- 已新增 FastAPI unit / integration tests，并通过 `python -m pytest` 全量回归与 `mvn -pl ruoyi-modules/ruoyi-xiaomai -am -DskipTests compile` 编译校验。

### File List

- `_bmad-output/implementation-artifacts/10-5-companion-与-evidence-问答长期承接.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/fastapi-backend/app/features/companion/long_term_records.py`
- `packages/fastapi-backend/app/features/companion/routes.py`
- `packages/fastapi-backend/app/features/companion/service.py`
- `packages/fastapi-backend/app/features/knowledge/routes.py`
- `packages/fastapi-backend/app/features/knowledge/service.py`
- `packages/fastapi-backend/tests/unit/test_companion_evidence_persistence.py`
- `packages/fastapi-backend/tests/integration/test_companion_evidence_api_persistence.py`
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_companion_evidence_log.sql`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/companion/domain/XmCompanionTurn.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/companion/domain/XmWhiteboardActionLog.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/companion/mapper/XmCompanionTurnMapper.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/companion/mapper/XmWhiteboardActionLogMapper.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/knowledge/domain/XmKnowledgeChatLog.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/knowledge/mapper/XmKnowledgeChatLogMapper.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/resources/mapper/xiaomai/companion/XmCompanionTurnMapper.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/resources/mapper/xiaomai/companion/XmWhiteboardActionLogMapper.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/resources/mapper/xiaomai/knowledge/XmKnowledgeChatLogMapper.xml`

## Change Log

- 2026-03-29：完成 Story 10.5 的 Companion / Evidence 长期问答承接，实现结构化白板动作日志、Evidence 历史表语义和 FastAPI 回看测试闭环。
