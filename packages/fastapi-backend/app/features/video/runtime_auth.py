"""视频任务运行时认证凭据管理。"""
from __future__ import annotations


from collections.abc import Mapping

from app.core.security import AccessContext
from app.infra.redis_client import RuntimeStore
from app.shared.ruoyi_auth import RuoYiRequestAuth
from app.shared.task_framework.key_builder import TASK_RUNTIME_TTL_SECONDS

_VIDEO_RUNTIME_AUTH_KEY_PREFIX = "xm_video_runtime_auth"


def build_video_runtime_auth_key(task_id: str) -> str:
    """构建视频任务运行时认证的 Redis 缓存键。"""
    normalized_task_id = task_id.strip()
    if not normalized_task_id:
        raise ValueError("task_id 不能为空")
    return f"{_VIDEO_RUNTIME_AUTH_KEY_PREFIX}:{normalized_task_id}"


def build_video_runtime_auth_payload(access_context: AccessContext) -> dict[str, str]:
    """从 AccessContext 构建认证缓存 payload。"""
    request_auth = RuoYiRequestAuth.from_access_context(access_context)
    payload = {"accessToken": request_auth.access_token}
    if request_auth.client_id:
        payload["clientId"] = request_auth.client_id
    return payload


def save_video_runtime_auth(
    runtime_store: RuntimeStore,
    *,
    task_id: str,
    access_context: AccessContext,
) -> None:
    """将认证凭据写入 Redis 运行态。"""
    runtime_store.set_runtime_value(
        build_video_runtime_auth_key(task_id),
        build_video_runtime_auth_payload(access_context),
        ttl_seconds=TASK_RUNTIME_TTL_SECONDS,
    )


def load_video_runtime_auth(
    runtime_store: RuntimeStore,
    *,
    task_id: str,
) -> RuoYiRequestAuth | None:
    """从 Redis 运行态加载认证凭据。"""
    return read_video_runtime_auth(
        runtime_store.get_runtime_value(build_video_runtime_auth_key(task_id))
    )


def delete_video_runtime_auth(runtime_store: RuntimeStore, *, task_id: str) -> None:
    """删除 Redis 中的运行时认证凭据。"""
    runtime_store.delete_runtime_value(build_video_runtime_auth_key(task_id))


def read_video_runtime_auth(payload: object) -> RuoYiRequestAuth | None:
    """从 payload 中提取 ``RuoYiRequestAuth``。"""
    if not isinstance(payload, Mapping):
        return None

    access_token = payload.get("accessToken")
    client_id = payload.get("clientId")
    normalized_access_token = access_token.strip() if isinstance(access_token, str) and access_token.strip() else None
    normalized_client_id = client_id.strip() if isinstance(client_id, str) and client_id.strip() else None
    if normalized_access_token is None:
        return None
    return RuoYiRequestAuth(
        access_token=normalized_access_token,
        client_id=normalized_client_id,
    )
