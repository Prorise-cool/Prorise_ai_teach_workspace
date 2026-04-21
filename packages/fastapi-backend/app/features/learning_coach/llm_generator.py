"""Learning Coach LLM 生成器。

职责：
- 根据来源上下文调 LLM 生成 checkpoint/quiz 题库与学习路径。
- 统一 JSON 输出约束与解析，失败时抛 `LLMGenerationError` 交由 service 降级。

输出 tuple 结构与 service._question_bank 保持一致，便于降级路径无缝切换。
"""
from __future__ import annotations

import json
import logging
import re
from collections.abc import Sequence

from app.providers.protocols import LLMProvider, ProviderError

from app.features.learning_coach.schemas import LearningCoachSource

logger = logging.getLogger(__name__)

QuestionTuple = tuple[str, str | None, str, list[tuple[str, str]], str, str]
PathStageDict = dict[str, object]

OPTION_IDS = ("A", "B", "C", "D")


class LLMGenerationError(Exception):
    """LLM 调用或解析失败，调用方应回退到本地题库。"""


def _build_question_prompt(
    source: LearningCoachSource,
    question_count: int,
    *,
    mode: str,
) -> str:
    mode_label = {
        "checkpoint": "会话后轻量 checkpoint（用于快速验证理解）",
        "quiz": "正式课后 quiz（覆盖关键方法与常见变式）",
    }.get(mode, "学后练习")

    difficulty_hint = (
        "难度设定为简单到中等，侧重概念与基本应用"
        if mode == "checkpoint"
        else "难度设定为中等，覆盖常见变式与易错点，避免过于简单"
    )

    topic = (source.topic_hint or "").strip() or "（未指定具体知识点，请根据 session 上下文自行推断）"
    source_line = f"来源：{source.source_type} / session={source.source_session_id}"
    if source.source_task_id:
        source_line += f" / task={source.source_task_id}"

    return (
        "你是资深教学助手，需要出单选题用于" + mode_label + "。\n\n"
        "上下文：\n"
        f"- {source_line}\n"
        f"- 知识点提示：{topic}\n"
        f"- 题目数量：{question_count}\n\n"
        "要求：\n"
        f"1. 每题 4 个选项（A/B/C/D），单选题；{difficulty_hint}。\n"
        "2. 题目内容必须紧扣知识点提示，若提示不明确则围绕该 session 的典型场景出题。\n"
        "3. 每题必须给出唯一正确答案（A/B/C/D）与不超过 120 字的解析。\n"
        "4. 严格输出 JSON 对象，不要 Markdown 代码块、不要额外说明文字。\n"
        "5. 解析须说明选对的原因与常见干扰项；选项文字不超过 120 字，可含 LaTeX。\n\n"
        "JSON Schema：\n"
        "{\n"
        '  "questions": [\n'
        "    {\n"
        '      "question_id": "q1",\n'
        '      "tag": "知识点简短标签",\n'
        '      "stem": "题干",\n'
        '      "options": [\n'
        '        {"option_id": "A", "text": "..."},\n'
        '        {"option_id": "B", "text": "..."},\n'
        '        {"option_id": "C", "text": "..."},\n'
        '        {"option_id": "D", "text": "..."}\n'
        "      ],\n"
        '      "correct_option_id": "B",\n'
        '      "explanation": "..."\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        f"仅输出 JSON，包含恰好 {question_count} 道题，question_id 依次为 q1..q{question_count}。"
    )


def _build_path_prompt(
    source: LearningCoachSource,
    goal: str,
    cycle_days: int,
) -> str:
    topic = (source.topic_hint or "").strip() or "学习者当前主题未明确，结合目标自行推断"
    return (
        "你是学习规划师，需为学习者制定阶段化学习路径。\n\n"
        "上下文：\n"
        f"- 学习目标：{goal}\n"
        f"- 可用周期：{cycle_days} 天\n"
        f"- 来源知识点：{topic}\n\n"
        "要求：\n"
        "1. 3 个阶段（由浅入深：基础 → 变式 → 强化/复盘）。\n"
        "2. 每阶段 2~3 个行动步骤，步骤需具体到学习行为（阅读/推导/练习/复盘等）。\n"
        "3. 每步给出预估分钟数（10~90 之间的整数）。\n"
        "4. 标题与摘要使用中文，契合目标主题。\n"
        "5. 严格输出 JSON，不要 Markdown 代码块。\n\n"
        "JSON Schema：\n"
        "{\n"
        '  "path_title": "...",\n'
        '  "path_summary": "一句话总结，80 字内",\n'
        '  "stages": [\n'
        "    {\n"
        '      "title": "第一阶段：...",\n'
        '      "goal": "该阶段目标",\n'
        '      "steps": [\n'
        '        {"title": "...", "action": "...", "estimatedMinutes": 30}\n'
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "仅输出 JSON。"
    )


def _build_knowledge_points_prompt(source: LearningCoachSource) -> str:
    topic = (source.topic_hint or "").strip()
    context = topic or f"source_type={source.source_type}, session={source.source_session_id}"
    return (
        "你需要从学习会话上下文中提取 3-6 个关键知识点标签。\n"
        f"上下文：{context}\n\n"
        "要求：\n"
        "1. 每个标签 2-12 字中文，具体且互相区分。\n"
        "2. 若上下文不足，请结合来源类型做最合理的推断。\n"
        "3. 严格输出 JSON 数组，例如 [\"链式法则\", \"指数求导\"]。\n"
        "仅输出 JSON 数组。"
    )


_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(?P<body>[\s\S]+?)```", re.IGNORECASE)


def _extract_json_text(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        raise LLMGenerationError("LLM 返回为空")
    block_match = _JSON_BLOCK_RE.search(raw)
    if block_match:
        return block_match.group("body").strip()
    # 回退：截取首个 { 到最后一个 }
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        return raw[start : end + 1]
    # 数组形式
    start = raw.find("[")
    end = raw.rfind("]")
    if start != -1 and end != -1 and end > start:
        return raw[start : end + 1]
    raise LLMGenerationError("LLM 返回中未找到 JSON 片段")


async def _call_with_failover(
    prompt: str,
    provider_chain: Sequence[LLMProvider],
) -> str:
    if not provider_chain:
        raise LLMGenerationError("未配置 LLM Provider")
    last_error: Exception | None = None
    for provider in provider_chain:
        try:
            result = await provider.generate(prompt)
            content = (result.content or "").strip()
            if not content:
                raise LLMGenerationError(f"Provider {provider.provider_id} 返回空内容")
            logger.debug(
                "learning_coach.llm.ok",
                extra={"provider": provider.provider_id, "content_len": len(content)},
            )
            return content
        except (ProviderError, LLMGenerationError) as error:
            last_error = error
            logger.warning(
                "learning_coach.llm.failover",
                extra={"provider": provider.provider_id, "error": str(error)},
            )
            continue
        except Exception as error:  # pragma: no cover - 未知异常统一归类
            last_error = error
            logger.warning(
                "learning_coach.llm.unexpected",
                extra={"provider": provider.provider_id, "error": str(error)},
            )
            continue
    raise LLMGenerationError(
        f"全部 LLM Provider 调用失败：{last_error}" if last_error else "全部 LLM Provider 调用失败"
    )


def _normalize_option_id(raw: object, index: int) -> str:
    if isinstance(raw, str):
        candidate = raw.strip().upper()
        if candidate in OPTION_IDS:
            return candidate
        # 处理 "A. xxx" 之类
        for option_id in OPTION_IDS:
            if candidate.startswith(option_id):
                return option_id
    if 0 <= index < len(OPTION_IDS):
        return OPTION_IDS[index]
    raise LLMGenerationError(f"无法解析选项 ID：{raw!r}")


def _parse_questions(payload: object, expected_count: int) -> list[QuestionTuple]:
    if not isinstance(payload, dict):
        raise LLMGenerationError("LLM 题目 JSON 根节点必须是对象")
    questions_raw = payload.get("questions")
    if not isinstance(questions_raw, list) or not questions_raw:
        raise LLMGenerationError("LLM 未返回 questions 列表")
    parsed: list[QuestionTuple] = []
    for idx, item in enumerate(questions_raw, start=1):
        if not isinstance(item, dict):
            raise LLMGenerationError(f"第 {idx} 题不是对象")
        stem = str(item.get("stem") or "").strip()
        options_raw = item.get("options")
        correct_raw = item.get("correct_option_id") or item.get("correctOptionId")
        explanation = str(item.get("explanation") or "").strip()
        if not stem or not isinstance(options_raw, list) or not correct_raw or not explanation:
            raise LLMGenerationError(f"第 {idx} 题字段缺失")
        options: list[tuple[str, str]] = []
        for opt_idx, opt in enumerate(options_raw[:4]):
            if not isinstance(opt, dict):
                raise LLMGenerationError(f"第 {idx} 题选项格式错误")
            option_id = _normalize_option_id(opt.get("option_id") or opt.get("optionId"), opt_idx)
            text = str(opt.get("text") or "").strip()
            if not text:
                raise LLMGenerationError(f"第 {idx} 题选项 {option_id} 文本为空")
            options.append((option_id, text))
        if len(options) < 2:
            raise LLMGenerationError(f"第 {idx} 题选项少于 2 个")
        correct_option_id = _normalize_option_id(correct_raw, 0)
        if correct_option_id not in {opt_id for opt_id, _ in options}:
            raise LLMGenerationError(f"第 {idx} 题 correct_option_id 不在选项中")
        question_id_raw = str(item.get("question_id") or item.get("questionId") or f"q{idx}").strip()
        question_id = question_id_raw or f"q{idx}"
        tag_raw = item.get("tag")
        tag = str(tag_raw).strip() if isinstance(tag_raw, str) and tag_raw.strip() else None
        parsed.append((question_id, tag, stem, options, correct_option_id, explanation))
    if len(parsed) < expected_count:
        raise LLMGenerationError(
            f"LLM 返回题数不足（期望 {expected_count}，实际 {len(parsed)}）"
        )
    return parsed[:expected_count]


def _parse_path(payload: object) -> tuple[str, str, list[PathStageDict]]:
    if not isinstance(payload, dict):
        raise LLMGenerationError("LLM path JSON 根节点必须是对象")
    title = str(payload.get("path_title") or payload.get("pathTitle") or "").strip()
    summary = str(payload.get("path_summary") or payload.get("pathSummary") or "").strip()
    stages_raw = payload.get("stages")
    if not title or not summary or not isinstance(stages_raw, list) or not stages_raw:
        raise LLMGenerationError("LLM path 字段缺失")
    stages: list[PathStageDict] = []
    for stage_idx, stage in enumerate(stages_raw, start=1):
        if not isinstance(stage, dict):
            raise LLMGenerationError(f"第 {stage_idx} 阶段格式错误")
        stage_title = str(stage.get("title") or "").strip()
        stage_goal = str(stage.get("goal") or "").strip()
        steps_raw = stage.get("steps")
        if not stage_title or not stage_goal or not isinstance(steps_raw, list) or not steps_raw:
            raise LLMGenerationError(f"第 {stage_idx} 阶段字段缺失")
        steps: list[dict[str, object]] = []
        for step_idx, step in enumerate(steps_raw, start=1):
            if not isinstance(step, dict):
                raise LLMGenerationError(f"阶段 {stage_idx} 第 {step_idx} 步格式错误")
            step_title = str(step.get("title") or "").strip()
            step_action = str(step.get("action") or "").strip()
            minutes_raw = step.get("estimatedMinutes") or step.get("estimated_minutes") or 30
            try:
                minutes = int(minutes_raw)
            except (TypeError, ValueError):
                minutes = 30
            minutes = max(10, min(90, minutes))
            if not step_title or not step_action:
                raise LLMGenerationError(f"阶段 {stage_idx} 第 {step_idx} 步字段缺失")
            steps.append({"title": step_title, "action": step_action, "estimatedMinutes": minutes})
        stages.append({"title": stage_title, "goal": stage_goal, "steps": steps})
    return title, summary, stages


def _parse_knowledge_points(payload: object) -> list[str]:
    if not isinstance(payload, list):
        raise LLMGenerationError("LLM knowledge_points JSON 根节点必须是数组")
    seen: set[str] = set()
    result: list[str] = []
    for item in payload:
        if not isinstance(item, str):
            continue
        trimmed = item.strip()
        if not trimmed or trimmed in seen:
            continue
        if len(trimmed) > 20:
            trimmed = trimmed[:20]
        seen.add(trimmed)
        result.append(trimmed)
    if not result:
        raise LLMGenerationError("LLM 未返回有效知识点标签")
    return result[:6]


async def generate_question_bank_via_llm(
    source: LearningCoachSource,
    question_count: int,
    *,
    mode: str,
    provider_chain: Sequence[LLMProvider],
) -> list[QuestionTuple]:
    """调 LLM 生成题库，格式与 _question_bank() 一致。

    失败抛 `LLMGenerationError` 由上层降级到本地题库。
    """
    if question_count <= 0:
        raise LLMGenerationError("question_count 必须大于 0")
    prompt = _build_question_prompt(source, question_count, mode=mode)
    raw = await _call_with_failover(prompt, provider_chain)
    try:
        payload = json.loads(_extract_json_text(raw))
    except json.JSONDecodeError as error:
        raise LLMGenerationError(f"LLM JSON 解析失败：{error}") from error
    return _parse_questions(payload, question_count)


async def generate_learning_path_via_llm(
    source: LearningCoachSource,
    goal: str,
    cycle_days: int,
    *,
    provider_chain: Sequence[LLMProvider],
) -> tuple[str, str, list[PathStageDict]]:
    prompt = _build_path_prompt(source, goal, cycle_days)
    raw = await _call_with_failover(prompt, provider_chain)
    try:
        payload = json.loads(_extract_json_text(raw))
    except json.JSONDecodeError as error:
        raise LLMGenerationError(f"LLM JSON 解析失败：{error}") from error
    return _parse_path(payload)


async def extract_knowledge_points_via_llm(
    source: LearningCoachSource,
    *,
    provider_chain: Sequence[LLMProvider],
) -> list[str]:
    prompt = _build_knowledge_points_prompt(source)
    raw = await _call_with_failover(prompt, provider_chain)
    try:
        payload = json.loads(_extract_json_text(raw))
    except json.JSONDecodeError as error:
        raise LLMGenerationError(f"LLM JSON 解析失败：{error}") from error
    return _parse_knowledge_points(payload)
