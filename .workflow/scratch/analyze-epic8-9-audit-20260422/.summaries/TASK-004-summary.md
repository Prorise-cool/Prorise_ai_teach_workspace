# TASK-004: submit_quiz 推荐由 LLM 生成替换硬编码字符串

## Changes
- `packages/fastapi-backend/app/features/learning_coach/llm_generator.py`: 新增 `_build_recommendation_prompt`、`_parse_recommendation`、`async generate_recommendation_via_llm`。复用 `_call_with_failover` / `_extract_json_text` / `_looks_like_placeholder`。
- `packages/fastapi-backend/app/features/learning_coach/service.py`:
  - 导入 `generate_recommendation_via_llm`。
  - `_AnswerKeyItem` 增加 `tag: str | None = None` 字段；`_build_questions_from_bank` 写入 tag。
  - `generate_checkpoint` / `generate_quiz` 的 state.answer_key 同时存 `tag`（向后兼容：reader 用 `get("tag")` 读不到时降级）。
  - `submit_quiz`：收集 `wrong_question_tags`；若 `_provider_chain` 有配置，优先调 `generate_recommendation_via_llm`；`LLMGenerationError` 时降级到原硬编码文案并写 `recommendation_llm_fallback` 警告日志；recommendation 记录用 `rec_summary` / `rec_target` 填充。
- `packages/fastapi-backend/tests/unit/learning_coach/test_learning_coach_service.py`: 新增 `_llm_recommendation_payload` 辅助 + 4 个测试（parses_valid_json / rejects_placeholder / uses_llm_recommendation_when_provider_chain_set / falls_back_to_default_when_llm_fails）。

## Verification
- [x] `llm_generator.py` 包含 `async def generate_recommendation_via_llm`
- [x] `service.py` 包含 `generate_recommendation_via_llm` 调用
- [x] 硬编码字符串 `推荐：先回看错题对应知识点，再完成一次 5 题小测巩固。` 仅保留在 `submit_quiz` 的默认变量赋值（fallback 分支）中
- [x] `uv run pytest tests/unit/learning_coach -x` 通过（23/23）

## Tests
- [x] `cd packages/fastapi-backend && uv run pytest tests/unit/learning_coach -x`: 23 passed in 0.71s

## Deviations
- None

## Notes
- answer_key state 新增 `tag` 字段；旧 state（无 tag）读取时自动回退为空字符串，不影响旧 quiz。
- TASK-003 已在 service.py 新增 `QuizHistoryItem`/`QuizHistoryPayload` import，未冲突。
- TASK-001 已改 `_fallback_question_bank` 的 tag 字符串（链式法则→核心概念），对本任务无影响。
