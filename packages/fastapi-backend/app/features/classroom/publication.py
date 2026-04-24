"""课堂公开发布 —— 复用 xm_user_work 表与视频侧 RuoYi 防腐层。

设计要点：
- 复用 ``VideoPublicationService``（xm_user_work 表是通用的多 work_type 表，
  RuoYi 端 VideoPublicationQueryBo.workType 天生支持任意 work_type 值）
- 课堂的 publish/unpublish 走 ``sync_publication(work_type="classroom")``
- 列出公开课堂：``list_publications(work_type="classroom")``
- 无视频侧的 asset_store / detail_ref / cover_url 写回（课堂数据在 Redis KV，
  不需要本地文件更新）
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from app.core.errors import AppError
from app.core.logging import get_logger
from app.features.video.long_term.records import VideoPublicationSyncRequest
from app.features.video.long_term.service import VideoPublicationService
from app.shared.task_framework.status import TaskStatus

if TYPE_CHECKING:
    from app.core.security import AccessContext
    from app.features.classroom.service import ClassroomService

logger = get_logger("app.features.classroom.publication")

WORK_TYPE_CLASSROOM = "classroom"


class PublishedClassroomCard(BaseModel):
    """已公开课堂卡片，面向前端发现区渲染。"""
    task_id: str = Field(alias="taskId")
    title: str = ""
    description: str | None = None
    author_id: str | None = Field(default=None, alias="authorId")
    published_at: datetime | None = Field(default=None, alias="publishedAt")
    cover_url: str | None = Field(default=None, alias="coverUrl")

    model_config = {"populate_by_name": True}


class PublishedClassroomCardPage(BaseModel):
    """公开课堂分页结果。"""
    rows: list[PublishedClassroomCard]
    total: int = Field(ge=0)


class ClassroomPublishResult(BaseModel):
    """课堂 publish / unpublish 响应。"""
    task_id: str = Field(alias="taskId")
    published: bool
    published_at: datetime | None = Field(default=None, alias="publishedAt")

    model_config = {"populate_by_name": True}


def _default_publication_service() -> VideoPublicationService:
    return VideoPublicationService()


async def publish_classroom_task(
    classroom_service: "ClassroomService",
    task_id: str,
    *,
    access_context: "AccessContext",
    publication_service: VideoPublicationService | None = None,
) -> ClassroomPublishResult:
    """将已完成的课堂任务公开发布。

    仅创建者可发布；仅 COMPLETED 任务可发布。
    """
    snapshot = await classroom_service.get_task(task_id, access_context=access_context)
    if snapshot is None:
        raise AppError(
            code="COMMON_NOT_FOUND",
            message="课堂任务不存在",
            status_code=404,
            task_id=task_id,
        )
    if snapshot.user_id != access_context.user_id:
        raise AppError(
            code="AUTH_PERMISSION_DENIED",
            message="仅创建者可公开课堂",
            status_code=403,
            task_id=task_id,
        )
    if snapshot.status != TaskStatus.COMPLETED:
        raise AppError(
            code="TASK_INVALID_INPUT",
            message="仅已完成的课堂可公开",
            status_code=400,
            task_id=task_id,
        )

    pub_service = publication_service or _default_publication_service()
    publication = await pub_service.sync_publication(
        VideoPublicationSyncRequest(
            user_id=snapshot.user_id,
            task_ref_id=task_id,
            title=(snapshot.summary or task_id)[:200],
            description=None,
            cover_url=None,
            is_public=True,
            work_type=WORK_TYPE_CLASSROOM,
        ),
        access_context=access_context,
    )
    logger.info(
        "classroom.publish.ok task_id=%s user_id=%s", task_id, snapshot.user_id,
    )
    return ClassroomPublishResult(
        task_id=task_id,
        published=publication.is_public,
        published_at=publication.published_at,
    )


async def unpublish_classroom_task(
    classroom_service: "ClassroomService",
    task_id: str,
    *,
    access_context: "AccessContext",
    publication_service: VideoPublicationService | None = None,
) -> ClassroomPublishResult:
    """取消已公开的课堂。"""
    snapshot = await classroom_service.get_task(task_id, access_context=access_context)
    if snapshot is None:
        raise AppError(
            code="COMMON_NOT_FOUND",
            message="课堂任务不存在",
            status_code=404,
            task_id=task_id,
        )
    if snapshot.user_id != access_context.user_id:
        raise AppError(
            code="AUTH_PERMISSION_DENIED",
            message="仅创建者可取消公开",
            status_code=403,
            task_id=task_id,
        )

    pub_service = publication_service or _default_publication_service()
    await pub_service.sync_publication(
        VideoPublicationSyncRequest(
            user_id=snapshot.user_id,
            task_ref_id=task_id,
            title=(snapshot.summary or task_id)[:200],
            description=None,
            cover_url=None,
            is_public=False,
            work_type=WORK_TYPE_CLASSROOM,
        ),
        access_context=access_context,
    )
    logger.info(
        "classroom.unpublish.ok task_id=%s user_id=%s", task_id, snapshot.user_id,
    )
    return ClassroomPublishResult(task_id=task_id, published=False, published_at=None)


async def get_classroom_publication_state(
    classroom_service: "ClassroomService",
    task_id: str,
    *,
    access_context: "AccessContext",
    publication_service: VideoPublicationService | None = None,
) -> ClassroomPublishResult:
    """读当前课堂的公开状态（给前端 PublishToggle 挂载时查询初始态）。

    无记录（从未发布过）→ published=False。
    """
    # 归属校验：按任务所属用户读；匿名 / 他人无权读取详细 snapshot
    snapshot = await classroom_service.get_task(task_id, access_context=access_context)
    if snapshot is None:
        raise AppError(
            code="COMMON_NOT_FOUND",
            message="课堂任务不存在",
            status_code=404,
            task_id=task_id,
        )

    pub_service = publication_service or _default_publication_service()
    publication = await pub_service.get_publication(
        task_id,
        work_type=WORK_TYPE_CLASSROOM,
        access_context=access_context,
    )
    if publication is None:
        return ClassroomPublishResult(task_id=task_id, published=False, published_at=None)
    return ClassroomPublishResult(
        task_id=task_id,
        published=publication.is_public,
        published_at=publication.published_at,
    )


async def list_published_classrooms(
    *,
    page: int = 1,
    page_size: int = 12,
    access_context: "AccessContext | None" = None,
    publication_service: VideoPublicationService | None = None,
) -> PublishedClassroomCardPage:
    """分页查询所有已公开的课堂卡片。"""
    pub_service = publication_service or _default_publication_service()
    publication_page = await pub_service.list_publications(
        page=page,
        page_size=page_size,
        work_type=WORK_TYPE_CLASSROOM,
        access_context=access_context,
    )
    rows = [
        PublishedClassroomCard(
            task_id=item.task_ref_id,
            title=item.title,
            description=item.description,
            author_id=item.user_id,
            published_at=item.published_at,
            cover_url=item.cover_url,
        )
        for item in publication_page.rows
    ]
    return PublishedClassroomCardPage(rows=rows, total=publication_page.total)
