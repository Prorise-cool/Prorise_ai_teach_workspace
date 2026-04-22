# TASK-001: 重写 _fallback_question_bank 为通用元学习题并尊重 topic_hint

## Changes
- `packages/fastapi-backend/app/features/learning_coach/service.py`:
  - 删除 `_ = topic_hint` 丢弃行
  - 新增 `topic_prefix` 局部变量：`topic_hint` 非空时拼接 `针对「{topic}」这段学习，` 作为题干自然前缀
  - 替换 5 道硬编码微积分题（链式法则/sin(x^2)/e^{2x}/ln(x^2)/cos(3x)）为 5 道通用元学习题：
    1. q1 核心概念 — 能否一句话复述核心
    2. q2 巩固策略 — 主动复述 vs 被动重读
    3. q3 不确定点处理 — 标记疑点回溯验证
    4. q4 自测卡点 — 起手/中段/结尾定位
    5. q5 费曼检验 — 用一句话教别人
  - 函数签名、返回类型、`QuestionTuple` 结构（6 元组 + A/B/C/D 选项 + recommended_option_id + explanation）保持不变，上游 `_build_questions_from_bank` 消费者零影响

## Verification
- [x] `_ = topic_hint` 已删除（grep 无匹配）
- [x] `链式法则` 已从 _fallback_question_bank 中移除（全文件仅剩在 service.py:258 归纳文案出现「核心概念」，非原硬编码 tag）
- [x] `y = sin(x^2)` 已删除（grep 无匹配）
- [x] 签名 `def _fallback_question_bank(topic_hint: str | None)` 保留（service.py:79）
- [x] 新题库包含 `刚才` 与 `核心` 关键词（多处命中）
- [x] `cd packages/fastapi-backend && uv run pytest tests/unit/learning_coach -x` 全绿

## Tests
- `uv run pytest tests/unit/learning_coach -x` → **13 passed in 0.05s**
  - test_learning_coach_service.py: 9 passed
  - test_rate_limit.py: 4 passed

## Test Adjustments
- 无需改动 pytest fixture。现有测试仅把 `链式法则` 作为 `topic_hint` 输入字符串（`test_learning_coach_service.py:95,303,304`），并未断言 fallback 题干里必须出现「链式法则」。因此替换题库后测试直接通过。

## Deviations
- 无。实现严格按 implementation 步骤执行。

## Notes
- 旧 tag（链式法则/复合函数/指数函数 等）改为与元学习题目匹配的新 tag（核心概念/巩固策略/不确定点处理/自测卡点/费曼检验），请后续 wave 任务注意 `tag` 字符串变更（若有下游依赖特定 tag，需单独处理；当前代码库未发现此类依赖）。
- `recommended_option_id` 语义由「唯一正确答案」改为「教学上推荐做法」，docstring 已说明；判题逻辑端仍按 correct_option_id 字段消费，无行为差异。
