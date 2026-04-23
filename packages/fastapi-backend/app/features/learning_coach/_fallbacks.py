"""Learning Coach LLM 降级文案 / 题库（Wave 1.5 拆分）。

从 ``learning_coach/service.py`` 抽出的降级题库与路径模板：当 LLM 不可用
或调用失败时，服务层用本模块提供的基线内容继续响应前端请求，避免整条
学习路径硬阻断。

所有内容均为中立、通用的元学习 / 自我检查题，不绑定具体学科。
"""

from __future__ import annotations

import random

from app.core.errors import AppError
from app.features.learning_coach._helpers import _AnswerKeyItem, _hash_seed
from app.features.learning_coach.llm_generator import QuestionTuple
from app.features.learning_coach.schemas import (
    LearningCoachOption,
    LearningCoachQuestion,
    LearningCoachSource,
)


def _fallback_question_bank(topic_hint: str | None) -> list[QuestionTuple]:
    """本地降级题库：LLM 不可用时退到通用『元学习/自我检查』题。

    这些题不绑定具体学科，避免像旧版那样把用户拉到无关的知识领域。
    若提供了 topic_hint，则在题干前加一句自然引导；题目本身保持通用。

    每题格式：(question_id, tag, stem, options[(id,text)], recommended_option_id, explanation)
    其中 recommended_option_id 代表『教学上推荐的做法』，并非唯一正确答案。
    """
    topic_prefix = (
        f"针对「{topic_hint.strip()}」这段学习，"
        if topic_hint and topic_hint.strip()
        else ""
    )
    return [
        (
            "q1",
            "核心概念",
            f"{topic_prefix}刚才这段学习里，最核心的概念或方法是什么？请选择你此刻最贴近的状态。",
            [
                ("A", "能用一句话清楚说出核心概念"),
                ("B", "大致知道，但表达还不够凝练"),
                ("C", "只记得名词，说不清含义"),
                ("D", "暂时还抓不到重点"),
            ],
            "A",
            "能用一句话复述核心概念，是判断『真的理解』最可靠的信号；没到这一步说明还需要再过一遍。",
        ),
        (
            "q2",
            "巩固策略",
            f"{topic_prefix}下面哪种做法最能帮助你巩固刚才的内容？",
            [
                ("A", "合上资料，主动复述或默写一遍关键步骤"),
                ("B", "再把笔记从头到尾读一遍"),
                ("C", "先收藏起来，之后有空再看"),
                ("D", "直接去看下一段内容"),
            ],
            "A",
            "主动回忆（active recall）是被研究反复验证的最有效巩固方式，比被动重读效果高出数倍。",
        ),
        (
            "q3",
            "不确定点处理",
            f"{topic_prefix}遇到不太确定的知识点时，你倾向先做什么？",
            [
                ("A", "先标记出疑点，带着问题回到原文／例题验证"),
                ("B", "跳过它，先把后面学完再说"),
                ("C", "直接搜一个现成答案抄下来"),
                ("D", "先放一放，等感觉来了再处理"),
            ],
            "A",
            "把模糊点显性化并带着问题回到材料，是把『以为懂了』变成『真的懂了』的关键动作。",
        ),
        (
            "q4",
            "自测卡点",
            f"{topic_prefix}如果让你完整复现一次刚才学的推导或步骤，你最可能卡在？",
            [
                ("A", "起手那一步：不确定该从哪个定义／条件切入"),
                ("B", "中间某一步的变形或选择依据"),
                ("C", "结尾的结论如何回到最初的问题"),
                ("D", "暂时每一步都能顺下来"),
            ],
            "B",
            "多数学习者真正的卡点在中段的『为什么这样变形』，识别出具体卡点比笼统说『不会』更利于后续补强。",
        ),
        (
            "q5",
            "费曼检验",
            f"{topic_prefix}如果让你用一句话教别人刚学的内容，你会先讲什么？",
            [
                ("A", "先讲这个内容解决的问题是什么，再讲方法"),
                ("B", "先把公式／定义抄给对方"),
                ("C", "直接举一个例题让对方模仿"),
                ("D", "还说不出来一个合适的起点"),
            ],
            "A",
            "从『要解决什么问题』切入符合费曼学习法，能快速暴露自己理解上的断点；只抛公式或例题往往只是记忆复述。",
        ),
    ]


def _fallback_path_payload(
    goal: str, cycle_days: int
) -> tuple[str, str, list[dict[str, object]]]:
    """LLM 路径规划失败时的降级文案。"""
    days = max(1, int(cycle_days))
    title = f"{days} 天学习路径：{goal}"
    summary = "LLM 暂不可用，已使用基线模板：分阶段拆解目标并提供可执行的行动项与复盘建议。"
    stages: list[dict[str, object]] = [
        {
            "title": "第一阶段：打基础",
            "goal": "把核心概念与方法串起来，能在典型题上稳定输出。",
            "steps": [
                {"title": "概念回顾", "action": "回看 1 个例题并手写推导过程", "estimatedMinutes": 30},
                {"title": "基础训练", "action": "完成 10 道基础题并整理错因", "estimatedMinutes": 45},
            ],
        },
        {
            "title": "第二阶段：做变式",
            "goal": "覆盖常见变式与陷阱点，提升解题稳定性。",
            "steps": [
                {"title": "陷阱清单", "action": "总结 5 类常见错误并对照修正", "estimatedMinutes": 35},
                {"title": "小测巩固", "action": "做 1 套 5 题小测并复盘", "estimatedMinutes": 40},
            ],
        },
        {
            "title": "第三阶段：复盘强化",
            "goal": "用错题本做 targeted drill，确保薄弱点被补齐。",
            "steps": [
                {"title": "错题复盘", "action": "回看错题并重做 2 轮", "estimatedMinutes": 45},
                {"title": "最终自测", "action": "完成一次正式 quiz 并达到 90 分", "estimatedMinutes": 35},
            ],
        },
    ]
    return title, summary, stages


def _build_questions_from_bank(
    bank: list[QuestionTuple],
    *,
    source: LearningCoachSource,
    question_total: int,
    seed_namespace: str,
) -> tuple[list[LearningCoachQuestion], dict[str, _AnswerKeyItem]]:
    """从题库 bank 中按种子取样并装配为 Question 与 answer_key。

    LLM 返回的 bank 已经是目标数量，直接使用；降级 bank 可能不足，按种子循环补齐。
    """
    if not bank:
        raise AppError(code="LEARNING_BANK_EMPTY", message="题库为空", status_code=500)
    seed = _hash_seed(
        seed_namespace,
        source.source_type.value if hasattr(source.source_type, "value") else str(source.source_type),
        source.source_session_id,
        source.topic_hint or "",
    )
    rng = random.Random(seed)
    picked = bank.copy()
    if len(picked) >= question_total:
        rng.shuffle(picked)
        picked = picked[:question_total]
    else:
        # 仅降级路径会走到（LLM 已校验数量充足）
        rng.shuffle(picked)
        picked = (picked * ((question_total + len(picked) - 1) // len(picked)))[:question_total]

    questions: list[LearningCoachQuestion] = []
    answer_key: dict[str, _AnswerKeyItem] = {}
    # 为了避免降级路径里同一题 id 冲突，按序号重排 question_id
    for index, (original_id, tag, stem, options, correct_option_id, explanation) in enumerate(picked, start=1):
        question_id = original_id if index == 1 and original_id not in answer_key else f"q{index}"
        if question_id in answer_key:
            question_id = f"q{index}-{rng.randint(1000, 9999)}"
        questions.append(
            LearningCoachQuestion(
                question_id=question_id,
                tag=tag,
                stem=stem,
                options=[
                    LearningCoachOption(option_id=opt_id, label=opt_id, text=opt_text)
                    for opt_id, opt_text in options
                ],
            )
        )
        answer_key[question_id] = _AnswerKeyItem(
            correct_option_id=correct_option_id,
            explanation=explanation,
            tag=tag,
            stem=stem,
            options=tuple((opt_id, opt_id, opt_text) for opt_id, opt_text in options),
        )

    return questions, answer_key
