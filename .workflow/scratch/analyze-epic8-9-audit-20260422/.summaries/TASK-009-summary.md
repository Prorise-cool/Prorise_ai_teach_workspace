# TASK-009: RuoYi Java 学习中心聚合扩字段 + 测验历史端点 + DB migration

## DB migrations executed (xm_dev)
```sql
ALTER TABLE xm_learning_path ADD COLUMN completed_step_count INT NOT NULL DEFAULT 0 AFTER step_count;
ALTER TABLE xm_learning_path ADD COLUMN total_step_count INT NOT NULL DEFAULT 0 AFTER completed_step_count;
ALTER TABLE xm_quiz_result   ADD COLUMN question_items_json JSON NULL AFTER detail_ref;
UPDATE xm_learning_path SET total_step_count = step_count WHERE step_count IS NOT NULL AND step_count > 0;
```
`DESC` 已验证三列新增成功。`packages/RuoYi-Vue-Plus-5.X/script/sql/xm_dev.sql` 的 `CREATE TABLE xm_learning_path`/`xm_quiz_result` 已同步。

## Java files changed/added
- `ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/integration/domain/bo/XmPersistenceSyncBo.java` — LearningResultSyncItemBo 新增 `questionItemsJson/completedStepCount/totalStepCount`。
- `ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/mapper/LearningResultMapper.java` — 新增 4 个方法：`selectQuizBySourceResultId / selectAverageQuizScore / selectLatestRecommendation / selectActiveLearningPath`。
- `ruoyi-xiaomai/src/main/resources/mapper/xiaomai/learning/LearningResultMapper.xml` — quiz insert/update 写 `question_items_json`；path insert/update 写 completed/total；新增 4 个 select。
- `ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/domain/vo/QuizHistoryVo.java`（新） + `QuizHistoryItemVo.java`（新）。
- `ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learning/service/ILearningResultService.java` + `impl/LearningResultServiceImpl.java` — `queryQuizHistory(quizId)` 反序列化 `question_items_json`。
- `ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/integration/controller/internal/XmLearningResultInternalController.java`（新） — `GET /internal/xiaomai/learning/results/quiz/{quizId}`，未命中返回 HTTP 404。
- `ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learningcenter/domain/vo/LearningCenterSummaryVo.java`（新）。
- `ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learningcenter/service/ILearningCenterService.java` + `impl/LearningCenterServiceImpl.java` — 新增 `querySummary(userId)`。
- `ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/learningcenter/controller/XmLearningCenterController.java` — 新增 `GET /xiaomai/learning-center/summary`。

## FastAPI files changed
- `app/features/learning/schemas.py` — `LearningResultInput` 与 `LearningPersistenceItem` 新增 `question_items_json: str | None`。
- `app/features/learning/service.py` — `_to_ruoyi_record` 输出 `questionItemsJson`；`_normalize_record` 透传；`_from_ruoyi_record` 读取。
- `app/features/learning_coach/service.py` — `_AnswerKeyItem` 扩 stem/options；`_build_questions_from_bank` 填充；`generate_quiz/generate_checkpoint` state 中保存 stem/options；`submit_quiz` 组装 `items_full` + `json.dumps(..., ensure_ascii=False)` 传入 `LearningResultInput.question_items_json`；`_ruoyi_to_quiz_history` 兜底解析 `questionItemsJson` 字符串。

## Verification
- [x] `DESC xm_dev.xm_learning_path` → completed_step_count / total_step_count 存在。
- [x] `DESC xm_dev.xm_quiz_result` → question_items_json 存在。
- [x] `xm_dev.sql` 含 completed_step_count / question_items_json。
- [x] Java 路径注解匹配 `/internal/xiaomai/learning/results/quiz/` + `{quizId}`。
- [x] `service.py` 含 `questionItemsJson`（两处：write + read）。
- [x] `cd packages/fastapi-backend && uv run pytest tests/unit/learning tests/unit/learning_coach -x` — 41 passed。

## Deviations
- TASK 原文说"extend existing aggregate endpoint"，但 `XmLearningCenterController` 现有 3 个端点全是分页列表（learning/history/favorites），没有 dashboard 聚合入口。按最小改动原则新增 `GET /xiaomai/learning-center/summary`，返回 `LearningCenterSummaryVo`。前端/FastAPI 若要消费需调这个 URL；FastAPI 的 `build_learning_center_aggregate` 已能解析同样字段结构。
- `updateQuizRecord.question_items_json` 用 `<if>` 保护：FastAPI `persist_results` 先 insert 后 update 场景下，重复 submit_quiz 才有 JSON 可写；首写后不应被 None 覆盖。
- `insertPathRecord` 的 `total_step_count` 用 `<choose>`：FastAPI 当前传 `step_count` 不显式传 `totalStepCount`，用 stepCount 做 fallback 可让 active path 查询有合理初值。

## Concerns for Java compile step
- 未本地 `mvn compile` 验证（task 明确说可以跳过）。潜在坑：
  - `LearningCenterServiceImpl` 新增依赖 `LearningResultMapper`（同 xiaomai 模块，Spring 自动注入应该没问题）。
  - `XmLearningResultInternalController` 返回 `ResponseEntity<R<QuizHistoryVo>>`；若 RuoYi-Plus 全局响应封装拦截器把 R 再包一次，可能出现双包，需 Java 端 code review 关注。
  - `QuizHistoryItemVo.options` 用 `List<Map<String,Object>>` 而非强类型 VO —— 兼容早期历史脏数据；如需严格类型，Java 端可改成内嵌 OptionVo。
  - `OBJECT_MAPPER` 新建未复用 Spring 的 Jackson —— 极简实现，不吃项目级配置；若需跟随 Spring 配置可改为注入。

## Notes / Follow-up
- 前端 TASK-006 已经在读 `items` 字段，Java 反序列化后结构与 FastAPI 原有 `_ruoyi_to_quiz_history` 兼容（optionId/label/text + selectedOptionId/correctOptionId/isCorrect/explanation）。
- `total_step_count` 回填已对所有 step_count > 0 的既有 path 执行；新路径由 insert 时的 `<choose>` 兜底为 step_count。
- FastAPI `submit_quiz` 的 `items_full` 序列化失败时降级为 None（日志告警，不阻塞落库），与参考项目风格一致。
