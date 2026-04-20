"""Learning Coach API routes（Epic 8）。"""

from functools import lru_cache

from fastapi import APIRouter, Depends

from app.core.security import AccessContext, get_access_context
from app.features.learning_coach.schemas import (
    CheckpointGenerateEnvelope,
    CheckpointGenerateRequest,
    CheckpointSubmitEnvelope,
    CheckpointSubmitRequest,
    LearningCoachEntryEnvelope,
    LearningCoachSource,
    LearningPathPlanEnvelope,
    LearningPathPlanRequest,
    LearningPathSaveEnvelope,
    LearningPathSaveRequest,
    QuizGenerateEnvelope,
    QuizGenerateRequest,
    QuizSubmitEnvelope,
    QuizSubmitRequest,
)
from app.features.learning_coach.service import LearningCoachService
from app.worker import get_runtime_store

router = APIRouter(prefix="/learning-coach", tags=["learning-coach"])


@lru_cache
def get_learning_coach_service() -> LearningCoachService:
    return LearningCoachService(runtime_store=get_runtime_store())


@router.get("/entry", response_model=LearningCoachEntryEnvelope)
async def learning_coach_entry(
    source_type: str,
    source_session_id: str,
    source_task_id: str | None = None,
    source_result_id: str | None = None,
    return_to: str | None = None,
    topic_hint: str | None = None,
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


@router.post("/checkpoint/generate", response_model=CheckpointGenerateEnvelope)
async def learning_checkpoint_generate(
    request: CheckpointGenerateRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> CheckpointGenerateEnvelope:
    payload = service.generate_checkpoint(
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


@router.post("/quiz/generate", response_model=QuizGenerateEnvelope)
async def learning_quiz_generate(
    request: QuizGenerateRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> QuizGenerateEnvelope:
    payload = service.generate_quiz(
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


@router.post("/path/plan", response_model=LearningPathPlanEnvelope)
async def learning_path_plan(
    request: LearningPathPlanRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: LearningCoachService = Depends(get_learning_coach_service),
) -> LearningPathPlanEnvelope:
    payload = service.plan_path(
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

