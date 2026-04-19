"""伴学会话业务服务。"""

from __future__ import annotations

import logging
import uuid
from typing import TYPE_CHECKING, Any

from pydantic import ValidationError

from app.core.errors import IntegrationError
from app.features.companion.schemas import CompanionBootstrapResponse
from app.shared.long_term_records import (
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    SessionReplaySnapshot,
    companion_turn_from_ruoyi_data,
    companion_turn_to_ruoyi_payload,
    session_replay_from_ruoyi_data,
)
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_service_mixin import RuoYiServiceMixin

if TYPE_CHECKING:
    from app.core.security import AccessContext


class CompanionService(RuoYiServiceMixin):
    """伴学会话业务服务，与 RuoYi 持久化交互。"""
    _RESOURCE = "companion-turn"

    def __init__(self, client_factory=None) -> None:
        """初始化伴学服务。"""
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> CompanionBootstrapResponse:
        """返回伴学功能域 bootstrap 状态。"""
        return CompanionBootstrapResponse()

    async def persist_turn(
        self,
        request: CompanionTurnCreateRequest,
        *,
        access_context: "AccessContext | None" = None,
    ) -> CompanionTurnSnapshot:
        """持久化伴学对话轮次到 RuoYi。

        Args:
            request: 对话轮次创建请求。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
        """
        async with self._resolve_authenticated_factory(access_context)() as client:
            result = await client.post_single(
                "/internal/xiaomai/companion/turns",
                resource=self._RESOURCE,
                operation="persist",
                json_body=companion_turn_to_ruoyi_payload(request)
            )
        return self._parse_companion_turn(result.data, operation="persist", endpoint="/internal/xiaomai/companion/turns")

    async def get_turn(
        self,
        turn_id: str,
        *,
        access_context: "AccessContext | None" = None,
    ) -> CompanionTurnSnapshot | None:
        """按 ID 查询伴学对话轮次。

        Args:
            turn_id: 轮次唯一标识。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
        """
        try:
            async with self._resolve_authenticated_factory(access_context)() as client:
                result = await client.get_single(
                    f"/internal/xiaomai/companion/turns/{turn_id}",
                    resource=self._RESOURCE,
                    operation="get"
                )
        except IntegrationError as exc:
            if exc.code == "RUOYI_NOT_FOUND":
                return None
            raise
        return self._parse_companion_turn(
            result.data,
            operation="get",
            endpoint=f"/internal/xiaomai/companion/turns/{turn_id}"
        )

    async def replay_session(
        self,
        session_id: str,
        *,
        access_context: "AccessContext | None" = None,
    ) -> SessionReplaySnapshot:
        """回放指定会话的伴学对话记录。

        Args:
            session_id: 会话唯一标识。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
        """
        async with self._resolve_authenticated_factory(access_context)() as client:
            result = await client.get_single(
                f"/internal/xiaomai/companion/sessions/{session_id}/replay",
                resource=self._RESOURCE,
                operation="replay"
            )
        return self._parse_session_replay(
            result.data,
            operation="replay",
            endpoint=f"/internal/xiaomai/companion/sessions/{session_id}/replay"
        )

    def _parse_companion_turn(
        self,
        payload: dict[str, object],
        *,
        operation: str,
        endpoint: str
    ) -> CompanionTurnSnapshot:
        try:
            return companion_turn_from_ruoyi_data(payload)
        except (KeyError, TypeError, ValueError, ValidationError) as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc

    def _parse_session_replay(
        self,
        payload: dict[str, object],
        *,
        operation: str,
        endpoint: str
    ) -> SessionReplaySnapshot:
        try:
            return session_replay_from_ruoyi_data(payload)
        except (KeyError, TypeError, ValueError, ValidationError) as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc


logger = logging.getLogger(__name__)


class CompanionAskService:
    """伴学 Ask API 业务服务：获取上下文 → 调用 LLM → 回答 → 持久化。"""

    def __init__(
        self,
        *,
        context_adapter_factory: Any | None = None,
        companion_service_factory: Any | None = None,
    ) -> None:
        self._context_adapter_factory = context_adapter_factory
        self._companion_service_factory = companion_service_factory or CompanionService

    async def ask(
        self,
        request: "AskRequest",
        *,
        access_context: "AccessContext | None" = None,
    ) -> "AskResponse":
        """处理伴学提问：获取上下文、调用 LLM 生成回答、持久化。"""
        from app.features.companion.schemas import (
            AskResponse,
            CompanionContextSource,
        )
        from app.shared.long_term.models import (
            CompanionTurnCreateRequest,
            ContextType,
            PersistenceStatus,
        )

        task_id, seconds = self._parse_anchor(request.anchor.anchor_ref)
        turn_id = str(uuid.uuid4())

        # 1. 获取上下文
        context = await self._get_context(task_id, seconds)

        # 2. 调用 LLM 生成回答
        try:
            answer_text = await self._generate_answer(request.question_text, context)
            persistence_status = PersistenceStatus.COMPLETE_SUCCESS
        except Exception:
            logger.warning("LLM answer generation failed  session=%s", request.session_id, exc_info=True)
            answer_text = "暂时无法生成回答，请稍后再试。"
            persistence_status = PersistenceStatus.OVERALL_FAILURE

        # 3. 构建响应
        response = AskResponse(
            turn_id=turn_id,
            answer_text=answer_text,
            anchor=request.anchor,
            persistence_status=persistence_status,
            context_source_hit=context.context_source_hit,
        )

        # 4. 持久化
        try:
            turn_request = CompanionTurnCreateRequest(
                user_id=getattr(access_context, "user_id", "anonymous"),
                session_id=request.session_id,
                context_type=ContextType.VIDEO,
                anchor=request.anchor,
                question_text=request.question_text,
                answer_summary=answer_text[:500],
                overall_failed=persistence_status == PersistenceStatus.OVERALL_FAILURE,
            )
            service = self._companion_service_factory()
            await service.persist_turn(turn_request, access_context=access_context)
        except Exception:
            logger.warning("persist_turn failed  session=%s", request.session_id, exc_info=True)

        return response

    async def _get_context(self, task_id: str, seconds: int) -> Any:
        """获取视频上下文。"""
        from app.features.companion.schemas import CompanionContext

        if self._context_adapter_factory is not None:
            adapter = self._context_adapter_factory()
            return await adapter.get_context(task_id, seconds)
        return CompanionContext(task_id=task_id)

    async def _generate_answer(self, question: str, context: Any) -> str:
        """调用 LLM Provider 生成回答。"""
        # TODO: Story 6.4 后续集成 LLM Provider
        # 当前返回基于上下文的占位回答
        summary = getattr(context, "topic_summary", "") or ""
        section = getattr(context, "current_section", None)
        section_title = getattr(section, "title", "") if section else ""
        if section_title:
            return f"关于「{section_title}」：这个问题涉及当前视频段落的核心内容，{summary[:100]}"
        if summary:
            return f"根据视频内容分析：{summary[:150]}"
        return "请稍等，我正在获取视频上下文信息。"

    @staticmethod
    def _parse_anchor(anchor_ref: str) -> tuple[str, int]:
        """解析 anchor_ref '{task_id}@{seconds}'。"""
        parts = anchor_ref.split("@")
        task_id = parts[0] if parts else anchor_ref
        seconds = 0
        if len(parts) > 1:
            try:
                seconds = max(0, int(parts[1]))
            except (ValueError, TypeError):
                pass
        return task_id, seconds
