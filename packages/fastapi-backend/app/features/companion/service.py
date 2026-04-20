"""伴学会话业务服务。"""

from __future__ import annotations

import logging
import uuid
from typing import TYPE_CHECKING, Any

from pydantic import ValidationError

from app.core.errors import IntegrationError
from app.features.companion.schemas import CompanionBootstrapData, CompanionBootstrapResponse, CompanionContextSource
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
    from app.features.companion.context_window import ContextWindow
    from app.providers.factory import ProviderFactory


class CompanionService(RuoYiServiceMixin):
    """伴学会话业务服务，与 RuoYi 持久化交互。"""
    _RESOURCE = "companion-turn"

    def __init__(self, client_factory=None) -> None:
        """初始化伴学服务。"""
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(
        self,
        task_id: str = "",
    ) -> CompanionBootstrapData:
        """返回伴学功能域 bootstrap 状态。"""
        session_id = f"comp_sess_{task_id}" if task_id else ""
        if not task_id:
            return CompanionBootstrapData(task_id="", session_id="")

        try:
            from app.features.companion.context_adapter.video_adapter import VideoContextAdapter
            from app.features.video.pipeline.orchestration.assets import LocalAssetStore
            from app.worker import get_runtime_store

            adapter = VideoContextAdapter(
                runtime_store=get_runtime_store(),
                asset_store=LocalAssetStore.from_settings(),
            )
            context = await adapter.get_context(task_id, 0)
            return CompanionBootstrapData(
                task_id=task_id,
                session_id=session_id,
                context_source=context.context_source_hit,
                knowledge_points=list(context.knowledge_points),
                topic_summary=context.topic_summary,
            )
        except Exception:
            return CompanionBootstrapData(
                task_id=task_id,
                session_id=session_id,
                context_source=CompanionContextSource.DEGRADED,
            )

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
        context_window: "ContextWindow | None" = None,
        provider_factory: "ProviderFactory | None" = None,
    ) -> None:
        self._context_adapter_factory = context_adapter_factory
        self._companion_service_factory = companion_service_factory or CompanionService
        self._context_window = context_window
        self._provider_factory = provider_factory
        self._runtime_config: Any | None = None

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
        session_id = request.session_id

        # 1. 获取上下文
        context = await self._get_context(task_id, seconds)

        # 2. 构建含历史追问的 prompt
        prompt = self._build_prompt(
            question=request.question_text,
            context=context,
            session_id=session_id,
        )

        # 3. 调用 LLM 生成回答
        try:
            answer_text = await self._generate_answer(prompt, access_context=access_context)
            persistence_status = PersistenceStatus.COMPLETE_SUCCESS
        except Exception:
            logger.warning("LLM answer generation failed  session=%s", session_id, exc_info=True)
            answer_text = "暂时无法生成回答，请稍后再试。"
            persistence_status = PersistenceStatus.OVERALL_FAILURE

        # 4. 构建响应
        response = AskResponse(
            turn_id=turn_id,
            answer_text=answer_text,
            anchor=request.anchor,
            persistence_status=persistence_status,
            context_source_hit=context.context_source_hit,
        )

        # 5. 写入 Redis 上下文窗口
        if self._context_window is not None:
            try:
                self._context_window.append_turn(
                    session_id,
                    turn_id=turn_id,
                    question_text=request.question_text,
                    answer_summary=answer_text[:200],
                    anchor_ref=request.anchor.anchor_ref,
                )
            except Exception:
                logger.debug("Context window append failed  session=%s", session_id, exc_info=True)

        # 6. 持久化到 RuoYi
        try:
            turn_request = CompanionTurnCreateRequest(
                user_id=getattr(access_context, "user_id", "anonymous"),
                session_id=session_id,
                context_type=ContextType.VIDEO,
                anchor=request.anchor,
                question_text=request.question_text,
                answer_summary=answer_text[:500],
                overall_failed=persistence_status == PersistenceStatus.OVERALL_FAILURE,
            )
            service = self._companion_service_factory()
            await service.persist_turn(turn_request, access_context=access_context)
        except Exception:
            logger.warning("persist_turn failed  session=%s", session_id, exc_info=True)

        return response

    async def _get_context(self, task_id: str, seconds: int) -> Any:
        """获取视频上下文。"""
        from app.features.companion.schemas import CompanionContext

        if self._context_adapter_factory is not None:
            adapter = self._context_adapter_factory()
            return await adapter.get_context(task_id, seconds)
        return CompanionContext(task_id=task_id)

    def _build_prompt(
        self,
        *,
        question: str,
        context: Any,
        session_id: str,
    ) -> str:
        """构建 LLM prompt，注入上下文和历史追问。"""
        parts: list[str] = []

        section = getattr(context, "current_section", None)
        if section and getattr(section, "title", None):
            parts.append(f"当前视频段落：{section.title}")
            narration = getattr(section, "narration_text", "")
            if narration:
                parts.append(f"旁白内容：{narration}")

        knowledge_points = getattr(context, "knowledge_points", [])
        if knowledge_points:
            parts.append(f"知识点：{', '.join(knowledge_points)}")

        solution_steps = getattr(context, "solution_steps", [])
        if solution_steps:
            steps_text = "; ".join(
                str(s.get("title", s)) if isinstance(s, dict) else str(s)
                for s in solution_steps
            )
            parts.append(f"解题步骤：{steps_text}")

        topic_summary = getattr(context, "topic_summary", "")
        if topic_summary:
            parts.append(f"主题摘要：{topic_summary}")

        # 注入历史追问上下文
        if self._context_window is not None:
            history = self._context_window.build_prompt_context(session_id)
            if history:
                parts.append("历史对话：")
                for entry in history:
                    role_label = "用户" if entry["role"] == "user" else "AI"
                    parts.append(f"  {role_label}：{entry['content']}")

        parts.append(f"学生提问：{question}")
        parts.append("请基于以上视频上下文，用清晰易懂的语言回答学生的提问。如果信息不足，请如实说明并给出引导。")

        return "\n".join(parts)

    async def _ensure_runtime_config(
        self,
        access_context: "AccessContext | None" = None,
    ) -> Any:
        """懒加载伴学模块运行时配置（从数据库读取 Provider 链和窗口参数）。"""
        if self._runtime_config is not None:
            return self._runtime_config

        from app.core.config import get_settings
        from app.providers.factory import get_provider_factory
        from app.providers.runtime_config_service import ProviderRuntimeResolver

        factory = self._provider_factory or get_provider_factory()
        resolver = ProviderRuntimeResolver(
            settings=get_settings(),
            provider_factory=factory,
        )
        access_token = getattr(access_context, "token", None)
        client_id = getattr(access_context, "client_id", None)
        config = await resolver.resolve_companion(
            access_token=access_token,
            client_id=client_id,
        )

        if self._context_window is not None:
            self._context_window.context_ttl_seconds = config.context_ttl_seconds
            self._context_window.max_rounds = config.max_rounds
            self._context_window.recent_rounds_to_keep = config.recent_rounds_to_keep

        self._runtime_config = config
        return config

    async def _generate_answer(self, prompt: str, *, access_context: "AccessContext | None" = None) -> str:
        """调用 LLM Provider 生成回答（使用数据库解析的 Provider 链）。"""
        from app.providers.factory import get_provider_factory

        config = await self._ensure_runtime_config(access_context=access_context)
        factory = self._provider_factory or get_provider_factory()
        failover = factory.create_failover_service()
        result = await failover.generate(config.llm, prompt)
        return result.content

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
