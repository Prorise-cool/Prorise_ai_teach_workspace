# TASK-005: 新增测验历史回看后端接口 GET /learning-coach/quiz/history/{quiz_id}

## Changes
- `packages/fastapi-backend/app/features/learning_coach/schemas.py`: 新增 `QuizHistoryItem` / `QuizHistoryPayload` / `QuizHistoryEnvelope` 三个 pydantic 模型。
- `packages/fastapi-backend/app/features/learning/service.py`: 新增 `LearningService.fetch_quiz_history(quiz_id, user_id, *, access_context)` — 调 RuoYi `GET /internal/xiaomai/learning/results/quiz/{quiz_id}`；RuoYi 404 → 返回 None；其他错误包装成 `IntegrationError(status_code=503, code=QUIZ_HISTORY_UPSTREAM_UNAVAILABLE, retryable=True)`。
- `packages/fastapi-backend/app/features/learning_coach/service.py`: 新增 `LearningCoachService.fetch_quiz_history` 方法 + 私有辅助 `_ruoyi_to_quiz_history` 做驼峰/下划线兼容映射。None → `AppError(QUIZ_HISTORY_NOT_FOUND, 404)`。
- `packages/fastapi-backend/app/features/learning_coach/routes.py`: 新增 `@router.get("/quiz/history/{quiz_id}", response_model=QuizHistoryEnvelope)`。
- `packages/fastapi-backend/tests/unit/learning/test_learning_service_quiz_history.py`: 3 个 LearningService 测试（endpoint 正确、404 → None、500 → 503）。
- `packages/fastapi-backend/tests/unit/learning_coach/test_quiz_history_service.py`: 3 个 LearningCoachService 测试（payload 映射正确、None → AppError 404、503 传播）。

## Verification
- [x] schemas.py 包含 `class QuizHistoryPayload` / `class QuizHistoryItem`
- [x] service.py（coach）包含 `async def fetch_quiz_history`
- [x] routes.py 包含 `@router.get("/quiz/history/{quiz_id}"`

## Tests
- [x] `cd packages/fastapi-backend && uv run pytest tests/unit/learning_coach tests/unit/learning -x` — 35 passed（含新增 6 条）。

## Deviations
- None. TASK-004 已在 service.py 顶部 import 与 `_AnswerKeyItem` 附近做了 tag 字段变更，本 task 仅在同文件增加 import（QuizHistoryItem/QuizHistoryPayload）、追加方法、文件末尾新增 `_ruoyi_to_quiz_history`，与其改动不重叠。

## Notes / Follow-up
- **RuoYi Java 侧尚未实现** `GET /internal/xiaomai/learning/results/quiz/{quiz_id}`。后端会在真实调用时返回 502（RuoYi 路由 404 会被判成"历史不存在"的合法 None）或 503，前端 TASK-006 需要区分：
  - 404（业务）→ 展示"历史数据不存在"；
  - 503 → 展示"历史数据暂不可用，稍后重试"。
- 建议后续给 xiaomai 模块新增一个 issue：在 `XmLearningResultController` 下暴露 `xm_quiz_result + 关联题目 + 用户答题记录` 的只读聚合查询，响应字段与 `QuizHistoryPayload` 对齐（quizId / sourceType / questionTotal / correctTotal / score / summary / occurredAt / items[{questionId,stem,options[{optionId,label,text}],selectedOptionId,correctOptionId,isCorrect,explanation}]）。
- 对 question 存储落表方案：当前 xm_quiz_result 只存聚合指标，真实题干/用户选项需要新表 `xm_quiz_result_item`（或复用 xm_quiz_question_bank + 一个答题明细表）；Java 侧确认后可反向影响 FastAPI 字段容忍度。
