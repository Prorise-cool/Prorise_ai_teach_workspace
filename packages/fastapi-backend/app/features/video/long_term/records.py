"""视频公开作品与 SessionArtifact 长期记录映射。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Mapping

from pydantic import BaseModel, Field

from app.features.video.pipeline.models import ArtifactType, VideoArtifactGraph
from app.shared.ruoyi.mapper import RUOYI_DATETIME_FORMAT

VIDEO_PUBLICATION_TABLE = "xm_user_work"
SESSION_ARTIFACT_TABLE = "xm_session_artifact"
VIDEO_PUBLICATION_TITLE_MAX_LEN = 200
VIDEO_PUBLICATION_DESCRIPTION_MAX_LEN = 500

_ARTIFACT_TITLES: dict[ArtifactType, str] = {
    ArtifactType.TIMELINE: "视频时间轴",
    ArtifactType.STORYBOARD: "完整分镜",
    ArtifactType.NARRATION: "旁白脚本",
    ArtifactType.KNOWLEDGE_POINTS: "知识点摘要",
    ArtifactType.SOLUTION_STEPS: "解题步骤",
    ArtifactType.MANIM_CODE: "Manim 代码",
}


def _first_present(payload: Mapping[str, Any], *keys: str, default=None):
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return default


def _parse_datetime(value: Any) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.strptime(value, RUOYI_DATETIME_FORMAT)
        except ValueError:
            normalized_value = value.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized_value)
    raise ValueError(f"unsupported datetime value: {value!r}")


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes"}:
            return True
        if normalized in {"0", "false", "no", ""}:
            return False
    return bool(value)


def _format_iso_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    normalized = value.astimezone(timezone.utc) if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
    return normalized.isoformat().replace("+00:00", "Z")


class VideoPublicationSyncRequest(BaseModel):
    """视频公开作品同步请求。"""
    user_id: str = Field(min_length=1)
    task_ref_id: str = Field(min_length=1)
    title: str | None = None
    description: str | None = None
    cover_url: str | None = None
    is_public: bool
    work_type: str = "video"
    status: str | None = None


class VideoPublicationSnapshot(BaseModel):
    """视频公开作品远端快照。"""

    table_name: str = VIDEO_PUBLICATION_TABLE
    work_id: int
    work_type: str
    task_ref_id: str
    user_id: str
    title: str = ""
    description: str | None = None
    cover_url: str | None = None
    is_public: bool
    status: str
    published_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    version: int = 0


class VideoPublicationPage(BaseModel):
    """视频公开作品分页结果。"""

    rows: list[VideoPublicationSnapshot]
    total: int = Field(ge=0)


class VideoSessionArtifactItem(BaseModel):
    """单条会话产物项。"""

    artifact_type: str
    anchor_type: str | None = None
    anchor_key: str | None = None
    sequence_no: int = Field(ge=0)
    title: str | None = None
    summary: str | None = None
    object_key: str | None = None
    payload_ref: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime


class VideoSessionArtifactBatchCreateRequest(BaseModel):
    """会话产物批量创建请求。"""
    session_type: str = "video"
    session_ref_id: str = Field(min_length=1)
    object_key: str | None = None
    payload_ref: str | None = None
    occurred_at: datetime
    artifacts: list[VideoSessionArtifactItem] = Field(default_factory=list)


class VideoSessionArtifactItemSnapshot(VideoSessionArtifactItem):
    """会话产物项远端快照。"""
    table_name: str = SESSION_ARTIFACT_TABLE


class VideoSessionArtifactBatchSnapshot(BaseModel):
    """会话产物批量同步远端快照。"""
    table_name: str = SESSION_ARTIFACT_TABLE
    session_type: str
    session_ref_id: str
    payload_ref: str | None = None
    synced_count: int = Field(ge=0)
    artifacts: list[VideoSessionArtifactItemSnapshot] = Field(default_factory=list)


def video_publication_to_ruoyi_payload(
    request: VideoPublicationSyncRequest | VideoPublicationSnapshot,
) -> dict[str, Any]:
    """将发布请求转为 RuoYi 接口 payload。"""
    title = request.title
    if isinstance(title, str) and len(title) > VIDEO_PUBLICATION_TITLE_MAX_LEN:
        title = title[:VIDEO_PUBLICATION_TITLE_MAX_LEN]

    description = request.description
    if isinstance(description, str) and len(description) > VIDEO_PUBLICATION_DESCRIPTION_MAX_LEN:
        description = description[:VIDEO_PUBLICATION_DESCRIPTION_MAX_LEN]

    return {
        "userId": request.user_id,
        "taskRefId": request.task_ref_id,
        "title": title,
        "description": description,
        "coverUrl": request.cover_url,
        "isPublic": request.is_public,
        "workType": request.work_type,
        "status": request.status,
    }


def video_publication_from_ruoyi_data(payload: Mapping[str, Any]) -> VideoPublicationSnapshot:
    """将 RuoYi 返回数据解析为发布快照。"""
    is_public = _parse_bool(_first_present(payload, "isPublic", "is_public", default=False))
    published_at = _parse_datetime(_first_present(payload, "publishedAt", "published_at"))
    created_at = _parse_datetime(_first_present(payload, "createdAt", "created_at"))
    updated_at = _parse_datetime(_first_present(payload, "updatedAt", "updated_at"))
    if is_public and published_at is None:
        published_at = updated_at or created_at
    return VideoPublicationSnapshot.model_validate(
        {
            "table_name": _first_present(payload, "tableName", "table_name", default=VIDEO_PUBLICATION_TABLE),
            "work_id": _first_present(payload, "workId", "work_id", "id"),
            "work_type": _first_present(payload, "workType", "work_type", default="video"),
            "task_ref_id": _first_present(payload, "taskRefId", "task_ref_id"),
            "user_id": str(_first_present(payload, "userId", "user_id")),
            "title": _first_present(payload, "title", default=""),
            "description": _first_present(payload, "description"),
            "cover_url": _first_present(payload, "coverUrl", "cover_url"),
            "is_public": is_public,
            "status": _first_present(payload, "status", default="normal"),
            "published_at": published_at,
            "created_at": created_at,
            "updated_at": updated_at,
            "version": _first_present(payload, "version", default=0),
        }
    )


def video_session_artifact_batch_to_ruoyi_payload(request: VideoSessionArtifactBatchCreateRequest) -> dict[str, Any]:
    """将会话产物批量请求转为 RuoYi 接口 payload。"""
    return {
        "sessionType": request.session_type,
        "sessionRefId": request.session_ref_id,
        "objectKey": request.object_key,
        "payloadRef": request.payload_ref,
        "occurredAt": _format_iso_datetime(request.occurred_at),
        "artifacts": [
            {
                "artifactType": artifact.artifact_type,
                "anchorType": artifact.anchor_type,
                "anchorKey": artifact.anchor_key,
                "sequenceNo": artifact.sequence_no,
                "title": artifact.title,
                "summary": artifact.summary,
                "objectKey": artifact.object_key,
                "payloadRef": artifact.payload_ref,
                "metadata": artifact.metadata,
                "occurredAt": _format_iso_datetime(artifact.occurred_at),
            }
            for artifact in request.artifacts
        ],
    }


def video_session_artifact_batch_from_ruoyi_data(payload: Mapping[str, Any]) -> VideoSessionArtifactBatchSnapshot:
    """将 RuoYi 返回数据解析为会话产物批量快照。"""
    artifacts = []
    for item in _first_present(payload, "artifacts", default=[]):
        artifacts.append(
            VideoSessionArtifactItemSnapshot.model_validate(
                {
                    "table_name": _first_present(item, "tableName", "table_name", default=SESSION_ARTIFACT_TABLE),
                    "artifact_type": _first_present(item, "artifactType", "artifact_type"),
                    "anchor_type": _first_present(item, "anchorType", "anchor_type"),
                    "anchor_key": _first_present(item, "anchorKey", "anchor_key"),
                    "sequence_no": _first_present(item, "sequenceNo", "sequence_no"),
                    "title": _first_present(item, "title"),
                    "summary": _first_present(item, "summary"),
                    "object_key": _first_present(item, "objectKey", "object_key"),
                    "payload_ref": _first_present(item, "payloadRef", "payload_ref"),
                    "metadata": _first_present(item, "metadata", default={}),
                    "occurred_at": _parse_datetime(_first_present(item, "occurredAt", "occurred_at")),
                }
            )
        )

    return VideoSessionArtifactBatchSnapshot.model_validate(
        {
            "table_name": _first_present(payload, "tableName", "table_name", default=SESSION_ARTIFACT_TABLE),
            "session_type": _first_present(payload, "sessionType", "session_type", default="video"),
            "session_ref_id": _first_present(payload, "sessionRefId", "session_ref_id"),
            "payload_ref": _first_present(payload, "payloadRef", "payload_ref"),
            "synced_count": _first_present(payload, "syncedCount", "synced_count", default=len(artifacts)),
            "artifacts": artifacts,
        }
    )


def build_session_artifact_batch_request(
    graph: VideoArtifactGraph,
    *,
    object_key: str,
    payload_ref: str,
) -> VideoSessionArtifactBatchCreateRequest:
    """根据产物图谱构建会话产物批量创建请求。"""
    occurred_at = _parse_datetime(graph.created_at) or datetime.now(timezone.utc)
    artifacts = [
        VideoSessionArtifactItem(
            artifact_type=artifact.artifact_type.value,
            anchor_type="artifact_type",
            anchor_key=artifact.artifact_type.value,
            sequence_no=index,
            title=_ARTIFACT_TITLES[artifact.artifact_type],
            summary=_build_artifact_summary(artifact.artifact_type, artifact.data),
            object_key=object_key,
            payload_ref=payload_ref,
            metadata=_build_artifact_metadata(artifact.artifact_type, artifact.data, artifact.version, artifact.created_at),
            occurred_at=occurred_at,
        )
        for index, artifact in enumerate(graph.artifacts, start=1)
    ]
    return VideoSessionArtifactBatchCreateRequest(
        session_type=graph.session_type,
        session_ref_id=graph.session_id,
        object_key=object_key,
        payload_ref=payload_ref,
        occurred_at=occurred_at,
        artifacts=artifacts,
    )


def _build_artifact_summary(artifact_type: ArtifactType, data: Mapping[str, Any]) -> str:
    if artifact_type is ArtifactType.TIMELINE:
        return f"{len(data.get('scenes', []))} 个场景时间片"
    if artifact_type is ArtifactType.STORYBOARD:
        scenes = data.get("scenes", [])
        total_duration = data.get("totalDuration") or data.get("total_duration")
        return f"{len(scenes)} 个分镜，总时长 {total_duration} 秒"
    if artifact_type is ArtifactType.NARRATION:
        return f"{len(data.get('segments', []))} 段旁白文本"
    if artifact_type is ArtifactType.KNOWLEDGE_POINTS:
        return f"{len(data.get('knowledgePoints', []))} 个知识点"
    if artifact_type is ArtifactType.SOLUTION_STEPS:
        return f"{len(data.get('solutionSteps', []))} 个解题步骤"
    if artifact_type is ArtifactType.MANIM_CODE:
        line_count = len(str(data.get("scriptContent", "")).splitlines())
        return f"最终 Manim 脚本，共 {line_count} 行"
    return artifact_type.value


def _build_artifact_metadata(
    artifact_type: ArtifactType,
    data: Mapping[str, Any],
    version: str,
    created_at: str,
) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "artifactType": artifact_type.value,
        "version": version,
        "createdAt": created_at,
    }
    if artifact_type is ArtifactType.TIMELINE:
        scenes = data.get("scenes", [])
        metadata["sceneCount"] = len(scenes)
        metadata["sceneIds"] = [item.get("sceneId") for item in scenes if isinstance(item, Mapping)]
    elif artifact_type is ArtifactType.STORYBOARD:
        scenes = data.get("scenes", [])
        metadata["sceneCount"] = len(scenes)
        metadata["totalDuration"] = data.get("totalDuration") or data.get("total_duration")
        metadata["targetDuration"] = data.get("targetDuration") or data.get("target_duration")
    elif artifact_type is ArtifactType.NARRATION:
        segments = data.get("segments", [])
        metadata["segmentCount"] = len(segments)
        metadata["sceneIds"] = [item.get("sceneId") for item in segments if isinstance(item, Mapping)]
    elif artifact_type is ArtifactType.KNOWLEDGE_POINTS:
        points = data.get("knowledgePoints", [])
        metadata["count"] = len(points)
        metadata["items"] = list(points)
    elif artifact_type is ArtifactType.SOLUTION_STEPS:
        steps = data.get("solutionSteps", [])
        metadata["count"] = len(steps)
        metadata["stepIds"] = [item.get("stepId") for item in steps if isinstance(item, Mapping)]
    elif artifact_type is ArtifactType.MANIM_CODE:
        metadata["lineCount"] = len(str(data.get("scriptContent", "")).splitlines())
    return metadata
