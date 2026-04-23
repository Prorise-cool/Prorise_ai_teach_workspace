"""课堂生成 Dramatiq actor。

Wave 1 重构要点：
- access_token / client_id 不再直接传入 actor signature；改由 worker 通过
  ``load_classroom_runtime_auth`` 从 Redis 取回（对齐 video runtime_auth 模式）。
- 旧 JobStore 仍负责进度/中间结果（Redis），任务终态额外写入 RuoYi
  ``xm_classroom_session``（通过 ``ClassroomService.persist_task``）。
- chat 历史 / 白板动作 / scenes / agents / actions 通过 ``app.shared.long_term``
  仓库与（待 Wave 1.5 接入的）``xm_session_artifact`` 完成长期落库。
- SpeechAction 在生成阶段同步预合成 Edge TTS 音频，写回 ``audio_url``。
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import dramatiq

logger = logging.getLogger(__name__)


def _make_runtime_state_store():
    from app.features.classroom.jobs.job_store import ClassroomRuntimeStateStore
    from app.worker import get_runtime_store
    return ClassroomRuntimeStateStore(get_runtime_store())


def _load_runtime_auth(task_id: str):
    from app.features.classroom.runtime_auth import load_classroom_runtime_auth
    from app.worker import get_runtime_store
    return load_classroom_runtime_auth(get_runtime_store(), task_id=task_id)


def _delete_runtime_auth(task_id: str) -> None:
    from app.features.classroom.runtime_auth import delete_classroom_runtime_auth
    from app.worker import get_runtime_store
    try:
        delete_classroom_runtime_auth(get_runtime_store(), task_id=task_id)
    except Exception:  # noqa: BLE001
        logger.warning("classroom.job_runner: failed to delete runtime_auth task_id=%s", task_id)


@dramatiq.actor(max_retries=0, time_limit=30 * 60 * 1000)
def run_classroom_generation(
    task_id: str,
    requirement: str,
    pdf_text: str | None = None,
    user_id: str | None = None,
) -> None:
    """后台任务：编排完整课堂生成 pipeline。

    流程：
    1. 从 runtime_auth 取回 access_token/client_id
    2. 生成大纲 / agent_profiles
    3. 顺序生成 scene_content + actions（Stage 2）
    4. SpeechAction 预合成 Edge TTS（best-effort）
    5. 持久化：Redis 运行结果 + RuoYi xm_classroom_session 终态
       + LongTerm 仓库 + xm_session_artifact（best-effort）
    """
    asyncio.run(_async_run_classroom_generation(
        task_id, requirement, pdf_text, user_id,
    ))


async def _async_run_classroom_generation(
    task_id: str,
    requirement: str,
    pdf_text: str | None,
    user_id: str | None,
) -> None:
    from app.features.classroom.generation.outline_generator import generate_scene_outlines
    from app.features.classroom.generation.scene_generator import (
        generate_agent_profiles,
        generate_scene_actions,
        generate_scene_content,
    )
    from app.features.classroom.llm_adapter import (
        resolve_classroom_providers,
        resolve_classroom_tts_provider,
    )

    request_auth = _load_runtime_auth(task_id)
    access_token = request_auth.access_token if request_auth else None
    client_id = request_auth.client_id if request_auth else None

    runtime_state = _make_runtime_state_store()

    async def _chain(stage: str):
        return await resolve_classroom_providers(
            stage, access_token=access_token, client_id=client_id,
        )

    try:
        runtime_state.set_status(task_id, "generating_outline", message="生成大纲中…")
        runtime_state.set_progress(task_id, 5)

        # ── Stage 1: 大纲 ─────────────────────────────────────────────────
        outline_chain = await _chain("outline")
        outline_result = await generate_scene_outlines(
            requirement=requirement,
            provider_chain=outline_chain,
            pdf_text=pdf_text,
        )
        language_directive = outline_result.get("languageDirective", "")
        outlines = outline_result.get("outlines", [])
        runtime_state.set_progress(task_id, 20)

        # ── Stage 1.5: 智能体画像 ──────────────────────────────────────────
        profile_chain = await _chain("agent_profiles")
        agents = await generate_agent_profiles(
            stage_name=requirement[:60],
            language_directive=language_directive,
            provider_chain=profile_chain,
            scene_outlines=outlines,
            available_avatars=_default_avatars(),
        )
        runtime_state.set_progress(task_id, 30)
        runtime_state.set_status(task_id, "generating_scenes", message="生成场景中…")

        # ── Stage 2: 场景内容 + 动作 + Speech 预合成 ─────────────────────
        content_chain = await _chain("scene_content")
        actions_chain = await _chain("scene_actions")
        tts_chain = await resolve_classroom_tts_provider(
            access_token=access_token, client_id=client_id,
        )

        scenes: list[dict[str, Any]] = []
        total = len(outlines)
        for idx, outline in enumerate(outlines):
            scene_id = outline.get("id") or f"scene_{idx + 1}"
            content = await generate_scene_content(
                outline=outline,
                provider_chain=content_chain,
                language_directive=language_directive,
                agents=agents,
            )
            actions = await generate_scene_actions(
                outline=outline,
                content=content,
                provider_chain=actions_chain,
                language_directive=language_directive,
                agents=agents,
            )

            # SpeechAction 预合成 audio_url（best-effort）
            await _enrich_speech_actions_with_audio(actions, tts_chain)

            scenes.append({
                "id": scene_id,
                "type": outline.get("type", "slide"),
                "title": outline.get("title", ""),
                "content": content,
                "actions": actions,
                "outline": outline,
            })

            progress = 30 + int(60 * (idx + 1) / max(total, 1))
            runtime_state.set_progress(task_id, progress)

            # 白板动作落 LongTerm 仓库（best-effort，不阻断主流程）
            _persist_scene_whiteboard_actions(
                task_id=task_id, user_id=user_id, scene_index=idx, actions=actions,
            )

        # ── Finalize ──────────────────────────────────────────────────────
        classroom = {
            "id": task_id,
            "name": requirement[:80],
            "requirement": requirement,
            "languageDirective": language_directive,
            "scenes": scenes,
            "agents": agents,
            "generatedAt": int(time.time() * 1000),
        }
        runtime_state.set_result(task_id, classroom)

        # 长期持久化：RuoYi 任务终态 + LongTerm 仓库
        await _persist_task_terminal(
            task_id=task_id,
            user_id=user_id or "",
            request_auth=request_auth,
            status_value="completed",
            summary=requirement[:200],
        )
        _persist_classroom_artifacts(
            task_id=task_id, user_id=user_id, classroom=classroom,
        )
        logger.info(
            "classroom.job_runner.completed task_id=%s scenes=%d", task_id, len(scenes),
        )

    except Exception as exc:  # noqa: BLE001
        logger.error("classroom.job_runner.failed task_id=%s error=%s", task_id, exc)
        runtime_state.set_error(task_id, str(exc))
        try:
            await _persist_task_terminal(
                task_id=task_id,
                user_id=user_id or "",
                request_auth=request_auth,
                status_value="failed",
                summary=str(exc)[:200],
            )
        except Exception:  # noqa: BLE001
            logger.warning(
                "classroom.job_runner.persist_failed_status_failed task_id=%s", task_id,
            )
    finally:
        _delete_runtime_auth(task_id)


# ── helpers ───────────────────────────────────────────────────────────────────

def _default_avatars() -> list[str]:
    return ["teacher_1", "student_1", "student_2", "assistant_1"]


async def _enrich_speech_actions_with_audio(
    actions: list[dict[str, Any]],
    tts_chain,
) -> None:
    """对所有 SpeechAction best-effort 预合成 audio_url。

    失败时把 ``audio_url`` 留空，前端将自动回退到 speechSynthesis。
    """
    if not tts_chain:
        return
    for action in actions:
        if not isinstance(action, dict):
            continue
        if action.get("type") != "speech":
            continue
        text = str(action.get("text") or "").strip()
        if not text:
            continue
        try:
            audio_url = await _synthesize_speech_audio(text, tts_chain)
            if audio_url:
                action["audioUrl"] = audio_url
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "classroom.job_runner.tts_synthesize_failed text_len=%d error=%s",
                len(text), exc,
            )


async def _synthesize_speech_audio(text: str, tts_chain) -> str | None:
    """调用 TTS provider 合成音频并以 data URL 形式返回。

    Wave 1 用 data URL 嵌入 base64 音频，前端可直接 ``<audio src=...>``
    播放，避免引入对象存储依赖。后续如需 OSS 缓存留 Wave 2 处理。
    """
    for provider in tts_chain:
        try:
            result = await provider.synthesize(text)
            metadata = getattr(result, "metadata", None) or {}
            audio_b64 = metadata.get("audioBase64")
            audio_format = metadata.get("audioFormat") or "mp3"
            if isinstance(audio_b64, str) and audio_b64:
                mime = f"audio/{audio_format}"
                return f"data:{mime};base64,{audio_b64}"
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "classroom.job_runner.tts_provider_failed provider=%s error=%s",
                getattr(provider, "provider_id", "unknown"), exc,
            )
            continue
    return None


def _persist_scene_whiteboard_actions(
    *,
    task_id: str,
    user_id: str | None,
    scene_index: int,
    actions: list[dict[str, Any]],
) -> None:
    """把 wb_* 动作作为独立条目落入 LongTermConversationRepository（Wave 1.5）。

    Wave 1 只写了摘要日志；Wave 1.5 新增 ``save_whiteboard_actions`` 后可以
    不依赖 companion turn 成对提交，直接记录课堂 scene 生成过程中的白板动作：

    - ``anchor_context`` 用 ``ContextType.CLASSROOM`` + ``AnchorKind.WHITEBOARD_STEP_ID``，
      ``anchor_ref`` 指向 ``{task_id}:scene_{index}``；
    - ``session_id`` 用 ``task_id``，``turn_id`` 用 ``wb_batch:{task_id}:{index}``
      便于后续回放按 scene 聚合；
    - 内部失败不抛出，best-effort 回退到摘要日志。

    TODO(Wave 2): Java 侧独立 whiteboard-actions/batch 端点上线后，
    repository 切换到 RuoYi 回写即可，本函数签名保持不变。
    """
    from app.shared.long_term.models import (
        AnchorContext,
        AnchorKind,
        ContextType,
        WhiteboardActionRecord,
    )
    from app.shared.long_term.repository import shared_long_term_repository

    wb_actions = [
        a for a in actions
        if isinstance(a, dict) and str(a.get("type") or "").startswith("wb_")
    ]
    if not wb_actions:
        return

    try:
        records = [
            WhiteboardActionRecord(
                action_type=str(a.get("type") or "wb_unknown"),
                payload={k: v for k, v in a.items() if k != "type"},
                object_ref=str(a.get("objectRef")) if a.get("objectRef") else None,
            )
            for a in wb_actions
        ]
        anchor = AnchorContext(
            context_type=ContextType.CLASSROOM,
            anchor_kind=AnchorKind.WHITEBOARD_STEP_ID,
            anchor_ref=f"{task_id}:scene_{scene_index}",
        )
        shared_long_term_repository.save_whiteboard_actions(
            records,
            session_id=task_id,
            user_id=user_id or "",
            anchor_context=anchor,
            turn_id=f"wb_batch:{task_id}:{scene_index}",
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "classroom.job_runner.wb_actions_persist_failed task_id=%s scene_index=%d error=%s",
            task_id, scene_index, exc,
        )

    logger.info(
        "classroom.job_runner.wb_actions_persisted task_id=%s scene_index=%d count=%d types=%s",
        task_id,
        scene_index,
        len(wb_actions),
        sorted({str(a.get("type") or "") for a in wb_actions}),
    )


def _persist_classroom_artifacts(
    *,
    task_id: str,
    user_id: str | None,
    classroom: dict[str, Any],
) -> None:
    """把 scenes / agents / actions 拆条目记录到调试日志。

    Wave 1：``xm_session_artifact`` 表的 RuoYi 端点尚未在 RuoYiClient 中暴露
    （shared.long_term.repository 仅有内存实现），为避免新增 RuoYi schema
    依赖，此处只记录摘要日志，留 Wave 1.5 接入 ``/internal/xiaomai/session-artifact``
    HTTP 端点后再切换到真实写库。
    """
    summary = {
        "taskId": task_id,
        "userId": user_id,
        "scenes": len(classroom.get("scenes", [])),
        "agents": len(classroom.get("agents", [])),
        "totalActions": sum(
            len(scene.get("actions", []))
            for scene in classroom.get("scenes", [])
            if isinstance(scene, dict)
        ),
    }
    logger.info(
        "classroom.job_runner.artifacts_summary %s",
        summary,
    )


async def _persist_task_terminal(
    *,
    task_id: str,
    user_id: str,
    request_auth,
    status_value: str,
    summary: str,
) -> None:
    """把 ``xm_classroom_session`` 任务终态回写 RuoYi。"""
    if request_auth is None:
        logger.info(
            "classroom.job_runner.persist_skip_no_auth task_id=%s status=%s",
            task_id, status_value,
        )
        return

    from app.features.classroom.service import ClassroomService
    from app.shared.task_framework.status import TaskStatus
    from app.shared.task_metadata import TaskMetadataCreateRequest

    try:
        status = TaskStatus(status_value)
    except ValueError:
        status = TaskStatus.COMPLETED

    request = TaskMetadataCreateRequest(
        task_id=task_id,
        user_id=user_id or "anonymous",
        status=status,
        summary=summary or task_id,
    )

    try:
        await ClassroomService().persist_task(request, request_auth=request_auth)
        logger.info(
            "classroom.job_runner.persist_task_terminal task_id=%s status=%s",
            task_id, status.value,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "classroom.job_runner.persist_task_terminal_failed task_id=%s status=%s error=%s",
            task_id, status_value, exc,
        )
