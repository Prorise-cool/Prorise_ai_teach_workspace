"""课堂功能域 LLM 适配层。

封装 ``app.providers.runtime_config_service.ProviderRuntimeResolver`` 的
``module_code='classroom'`` 解析路径，对外提供 ``call_llm`` /
``stream_llm`` 简洁接口供生成管道使用。

Wave 1 重构要点：
- ``module_code`` 从 ``openmaic`` 改名为 ``classroom``，与 SQL bindings 对齐。
- 移除 ``quiz_grade`` stage（由 ``learning_coach`` 接管）。
- 新增 ``tts`` stage 供 SpeechAction 预合成查询 TTS provider。
"""
from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass

from app.core.config import get_settings
from app.providers.factory import get_provider_factory
from app.providers.protocols import LLMProvider, ProviderError
from app.providers.runtime_config_service import ProviderRuntimeResolver

logger = logging.getLogger(__name__)

# Stage codes 必须与 SQL bindings 中 module_code='classroom' 的 stage_code 一致
CLASSROOM_LLM_STAGE_CODES = {
    "outline",
    "scene_content",
    "scene_actions",
    "agent_profiles",
    "director",
}


@dataclass
class LLMCallParams:
    """LLM 调用参数。"""

    system: str
    prompt: str
    temperature: float | None = None
    max_tokens: int | None = None


async def call_llm(
    params: LLMCallParams,
    provider_chain: Sequence[LLMProvider],
) -> str:
    """通过 provider chain 一次性生成（带 failover）。"""
    combined = (
        f"{params.system}\n\n---\n\n{params.prompt}" if params.system else params.prompt
    )
    last_error: Exception | None = None

    for provider in provider_chain:
        try:
            result = await provider.generate(combined)
            return result.content
        except ProviderError as exc:
            logger.warning(
                "classroom.llm_adapter.provider_failed",
                extra={
                    "provider_id": getattr(provider, "provider_id", "unknown"),
                    "error": str(exc),
                },
            )
            last_error = exc
            continue
        except Exception as exc:  # noqa: BLE001 - guard against provider implementation bugs
            logger.error(
                "classroom.llm_adapter.unexpected_error",
                extra={
                    "provider_id": getattr(provider, "provider_id", "unknown"),
                    "error": str(exc),
                },
            )
            last_error = exc
            continue

    raise last_error or ProviderError("No LLM providers configured for classroom")


async def stream_llm(
    params: LLMCallParams,
    provider_chain: Sequence[LLMProvider],
) -> AsyncIterator[str]:
    """流式生成；P0 整段返回，P1 切到 provider 真实流。"""
    text = await call_llm(params, provider_chain)
    yield text


async def resolve_classroom_providers(
    stage_code: str,
    access_token: str | None = None,
    client_id: str | None = None,
) -> tuple[LLMProvider, ...]:
    """从 ``xm_ai_module_binding`` 解析课堂某 stage 的 LLM provider chain。"""
    if stage_code not in CLASSROOM_LLM_STAGE_CODES:
        raise ValueError(f"Unknown classroom LLM stage code: {stage_code!r}")

    try:
        resolver = ProviderRuntimeResolver(
            settings=get_settings(),
            provider_factory=get_provider_factory(),
        )
        assembly = await resolver.resolve_by_module_code(
            module_code="classroom",
            stage_code=stage_code,
            access_token=access_token,
            client_id=client_id,
        )
        chain = assembly.llm
        if chain:
            logger.info(
                "classroom.llm_adapter.chain_resolved stage=%s source=%s length=%d",
                stage_code, assembly.source, len(chain),
            )
            return chain
    except Exception as exc:  # noqa: BLE001 - resolver层下游可能抛多种异常
        logger.warning(
            "classroom.llm_adapter.resolver_failed stage=%s error=%s",
            stage_code, exc,
        )

    factory = get_provider_factory()
    try:
        default_provider = factory.get_llm_provider(get_settings().default_llm_provider)
        logger.warning(
            "classroom.llm_adapter.falling_back_to_default_provider stage=%s provider=%s",
            stage_code, get_settings().default_llm_provider,
        )
        return (default_provider,)
    except Exception as exc:  # noqa: BLE001
        logger.error("classroom.llm_adapter.default_provider_failed error=%s", exc)
        return ()


def resolve_classroom_tts_provider():
    """获取课堂 SpeechAction 预合成所需的 TTS provider 链。

    ``ProviderRuntimeResolver.resolve_by_module_code`` 当前只装配 LLM
    capability，TTS 暂直接走 ``ProviderFactory.assemble_from_settings``
    取 ``FASTAPI_DEFAULT_TTS_PROVIDER`` 默认链（含 Edge TTS 实例）。

    DB 级 ``stage_code='tts'`` 绑定留待 Wave 1.5 在 resolver 中开放
    TTS capability 后再切换。当前管道无 TTS 时返回空 tuple，调用方
    应把 ``audio_url`` 留空让前端回退到 speechSynthesis。
    """
    try:
        factory = get_provider_factory()
        assembly = factory.assemble_from_settings(get_settings())
        chain = assembly.tts
        if chain:
            logger.info(
                "classroom.llm_adapter.tts_chain_resolved source=settings length=%d",
                len(chain),
            )
            return chain
    except Exception as exc:  # noqa: BLE001
        logger.warning("classroom.llm_adapter.tts_resolver_failed error=%s", exc)

    return ()
