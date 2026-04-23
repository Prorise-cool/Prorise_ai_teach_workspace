"""Learning Coach API routes（Epic 8）。"""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import get_settings
from app.core.security import AccessContext, get_access_context
from app.features.learning_coach.schemas import (
    CheckpointGenerateEnvelope,
    CheckpointGenerateRequest,
    CheckpointSubmitEnvelope,
    CheckpointSubmitRequest,
    CoachAskEnvelope,
    CoachAskPayload,
    CoachAskRequest,
    LearningCoachEntryEnvelope,
    LearningCoachSource,
    LearningPathPlanEnvelope,
    LearningPathPlanRequest,
    LearningPathSaveEnvelope,
    LearningPathSaveRequest,
    QuizGenerateEnvelope,
    QuizGenerateRequest,
    QuizHistoryEnvelope,
    QuizSubmitEnvelope,
    QuizSubmitRequest,
)
from app.features.learning_coach.rate_limit import enforce_rate_limit
from app.features.learning_coach.service import LearningCoachService
from app.providers.factory import get_provider_factory
from app.providers.runtime_config_service import ProviderRuntimeResolver
from app.worker import get_runtime_store

# 限流阈值按 LLM 成本递增收紧：
# - checkpoint 单次 <= 3 题、轻量热身，允许 20/min；
# - quiz 单次最多 50 题，每次消耗 LLM 较多，10/min；
# - path 规划消耗最大，3/min。
RATE_LIMIT_CHECKPOINT_PER_MINUTE = 20
RATE_LIMIT_QUIZ_PER_MINUTE = 10
RATE_LIMIT_PATH_PLAN_PER_MINUTE = 3
# Coach 对话每次消耗中等 token（prompt + history），按每分钟 30 次控制。
RATE_LIMIT_COACH_ASK_PER_MINUTE = 30

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learning-coach", tags=["learning-coach"])


async def get_learning_coach_service(
    access_context: AccessContext = Depends(get_access_context),
) -> LearningCoachService:
    """按请求解析 LLM chain —— 复用 RuoYi module binding resolver，避免 stub-llm 假跑。

    走 ProviderRuntimeResolver.resolve_learning_coach() 拿到真实 chain；
    任何阶段失败都会在 resolver 内部降级到 settings 默认链路，不会炸请求。
    """
    try:
        resolver = ProviderRuntimeResolver(
            settings=get_settings(),
            provider_factory=get_provider_factory(),
        )
        assembly = await resolver.resolve_learning_coach(
            access_token=getattr(access_context, "token", None),
            client_id=getattr(access_context, "client_id", None),
        )
        provider_chain = assembly.llm
    except Exception as error:  # pragma: no cover - resolver 自身兜底，保险起见再包一层
        logger.warning(
            "learning_coach.provider_chain.unavailable",
            extra={"error": str(error)},
        )
        provider_chain = tuple()

    return LearningCoachService(
        runtime_store=get_runtime_store(),
        provider_chain=provider_chain,
    )


@router.get("/entry", response_model=LearningCoachEntryEnvelope)
async def learning_coach_entry(
    source_type: str = Query(..., alias="sourceType"),
    source_session_id: str = Query(..., alias="sourceSessionId"),
    source_task_id: str | None = Query(default=None, alias="sourceTaskId"),
    source_result_id: str | None = Query(default=None, alias="sourceResultId"),
    return_to: str | None = Query(default=None, alias="returnTo"),
    topic_hint: str | None = Query(default=None, alias="topicHint"),
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> LearningCoachEntryEnvelope:
    source = LearningCoachSource(
        source_type=source_type,
        source_session_id=source_session_id,
        source_task_id=source_task_id,
        source_result_id=source_result_id,
        return_to=return_to,
        topic_hint=topic_hint,
    )
    payload = await service.build_entry(source)
    return LearningCoachEntryEnvelope(data=payload)


@router.post(
    "/checkpoint/generate",
    response_model=CheckpointGenerateEnvelope,
    dependencies=[
        Depends(
            enforce_rate_limit(
                "checkpoint_generate", RATE_LIMIT_CHECKPOINT_PER_MINUTE
            )
        )
    ],
)
async def learning_checkpoint_generate(
    request: CheckpointGenerateRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> CheckpointGenerateEnvelope:
    payload = await service.generate_checkpoint(
        source=request.source,
        question_count=request.question_count,
    )
    return CheckpointGenerateEnvelope(data=payload)


@router.post("/checkpoint/submit", response_model=CheckpointSubmitEnvelope)
async def learning_checkpoint_submit(
    request: CheckpointSubmitRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> CheckpointSubmitEnvelope:
    payload = await service.submit_checkpoint(
        checkpoint_id=request.checkpoint_id,
        answers=[(item.question_id, item.option_id) for item in request.answers],
        user_id=access_context.user_id,
        access_context=access_context,
    )
    return CheckpointSubmitEnvelope(data=payload)


@router.post(
    "/quiz/generate",
    response_model=QuizGenerateEnvelope,
    dependencies=[
        Depends(enforce_rate_limit("quiz_generate", RATE_LIMIT_QUIZ_PER_MINUTE))
    ],
)
async def learning_quiz_generate(
    request: QuizGenerateRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> QuizGenerateEnvelope:
    payload = await service.generate_quiz(
        source=request.source,
        question_count=request.question_count,
    )
    return QuizGenerateEnvelope(data=payload)


@router.post("/quiz/submit", response_model=QuizSubmitEnvelope)
async def learning_quiz_submit(
    request: QuizSubmitRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> QuizSubmitEnvelope:
    payload = await service.submit_quiz(
        quiz_id=request.quiz_id,
        answers=[(item.question_id, item.option_id) for item in request.answers],
        user_id=access_context.user_id,
        access_context=access_context,
    )
    return QuizSubmitEnvelope(data=payload)


@router.get("/quiz/history/{quiz_id}", response_model=QuizHistoryEnvelope)
async def learning_quiz_history(
    quiz_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> QuizHistoryEnvelope:
    """只读拉取历史答卷（含题目/用户选项/正确答案/解析）。"""
    payload = await service.fetch_quiz_history(
        quiz_id=quiz_id,
        user_id=access_context.user_id,
        access_context=access_context,
    )
    return QuizHistoryEnvelope(data=payload)


@router.post(
    "/path/plan",
    response_model=LearningPathPlanEnvelope,
    dependencies=[
        Depends(
            enforce_rate_limit("path_plan", RATE_LIMIT_PATH_PLAN_PER_MINUTE)
        )
    ],
)
async def learning_path_plan(
    request: LearningPathPlanRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> LearningPathPlanEnvelope:
    payload = await service.plan_path(
        source=request.source,
        goal=request.goal,
        cycle_days=request.cycle_days,
    )
    return LearningPathPlanEnvelope(data=payload)


@router.post("/path/save", response_model=LearningPathSaveEnvelope)
async def learning_path_save(
    request: LearningPathSaveRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> LearningPathSaveEnvelope:
    payload = await service.save_path(
        path=request.path,
        user_id=access_context.user_id,
        access_context=access_context,
    )
    return LearningPathSaveEnvelope(data=payload)


def _parse_diagnostics_allowlist(raw: str) -> frozenset[str]:
    """把 `FASTAPI_DIAGNOSTICS_ALLOWLIST` 的逗号分隔值解析成 user_id 集合。"""
    if not raw:
        return frozenset()
    return frozenset(part.strip() for part in raw.split(",") if part.strip())


def _ensure_diagnostics_access(access_context: AccessContext) -> None:
    """仅当 user_id 出现在白名单或持有超级管理员权限时放行。"""
    settings = get_settings()
    allowlist = _parse_diagnostics_allowlist(settings.diagnostics_allowlist)
    is_super_admin = any(
        perm.strip() in {"*", "*:*:*"} for perm in access_context.permissions
    )
    if is_super_admin:
        return
    if access_context.user_id and access_context.user_id in allowlist:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="diagnostics endpoint is restricted",
    )


@router.get("/_diagnostics")
async def learning_coach_diagnostics(
    probe: bool = False,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> dict[str, Any]:
    """返回当前 LLM provider 链信息，可选真实 echo 调用验证活性。

    设计意图：避免『跑起来了但其实用的是 stub-llm』的隐蔽降级——
    运维可以一眼看到 chain 长度与每个 provider 的真实类型，
    `probe=true` 触发一次 3-token 级别的活性测试。
    """
    _ensure_diagnostics_access(access_context)

    providers = tuple(getattr(service, "_provider_chain", ()) or ())
    providers_info = [
        {
            "id": getattr(p, "provider_id", None),
            "typeName": type(p).__name__,
            "priority": getattr(p, "priority", None),
        }
        for p in providers
    ]

    probe_result: dict[str, Any] | None = None
    if probe and providers:
        start = time.perf_counter()
        try:
            result = await providers[0].generate("请回复 OK")
            latency_ms = int((time.perf_counter() - start) * 1000)
            content = getattr(result, "content", "") or ""
            probe_result = {
                "ok": True,
                "latencyMs": latency_ms,
                "content": content[:200],
            }
        except Exception as error:  # pragma: no cover - 真实网络异常分支
            probe_result = {"ok": False, "error": str(error)}

    return {
        "chainLength": len(providers),
        "providers": providers_info,
        "probe": probe_result,
    }


@router.post(
    "/coach-ask",
    response_model=CoachAskEnvelope,
    dependencies=[
        Depends(enforce_rate_limit("coach_ask", RATE_LIMIT_COACH_ASK_PER_MINUTE))
    ],
)
async def learning_coach_ask(
    request: CoachAskRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> CoachAskEnvelope:
    """quiz 侧栏 AI 辅导对话：基于当前题目 + 历史对话生成自由文本回复。"""
    reply, source = await service.coach_ask(
        question_stem=request.question_stem,
        question_options=list(request.question_options or []),
        user_message=request.user_message,
        history=[
            {"role": m.role, "content": m.content}
            for m in (request.history or [])
        ],
    )
    return CoachAskEnvelope(
        data=CoachAskPayload(reply=reply, generation_source=source)
    )
