"""学习路径列表/详情读取器：走 RuoYi `/xiaomai/learning-center/history?resultType=path`。

Epic 8 Learning Center 闭环：`xm_learning_path` 仅由 FastAPI 写入（plan_path
→ save_path → /internal/xiaomai/learning/results）。消费端之前只有 summary 拿最新 1 条，
没有独立的 list/detail，导致前端 sidebar 卡点击后无落地页。

实现思路：直接复用 RuoYi 已有的 `/xiaomai/learning-center/history` 控制器（需登录态，
走用户 access_token 转发），按 `resultType=path` 过滤，再把 LearningCenterRecordVo 映射为
`LearningPathSnapshot`。避免在 Java 侧再起一个 list/detail controller（减少 Java 重启）。
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Mapping, TYPE_CHECKING

from app.core.errors import IntegrationError
from app.features.learning_coach.schemas import LearningPathSnapshot
from app.shared.ruoyi.client import RuoYiClient
from app.shared.ruoyi.service_mixin import RuoYiServiceMixin

if TYPE_CHECKING:
    from app.core.security import AccessContext

logger = logging.getLogger(__name__)

LEARNING_CENTER_HISTORY_PATH = "/xiaomai/learning-center/history"
PATH_RESOURCE_LABEL = "learning-path"
PATH_LIST_OPERATION = "list"
PATH_DETAIL_OPERATION = "detail"

# RuoYi LearningCenterRecordVo 里 recordId 形如 "xm_learning_path:{path_id}"
# （见 LearningResultMapper.xml line 322: CONCAT('xm_learning_path:', ...)）。
# source_result_id 就是 plan_path 生成的 path_id（save_path 写入 xm_learning_path.source_result_id）。
RECORD_ID_PREFIX = "xm_learning_path:"


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            # RuoYi 返回 ISO 或 "yyyy-MM-dd HH:mm:ss"
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            try:
                return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return None
    return None


def _row_to_snapshot(row: Mapping[str, Any]) -> LearningPathSnapshot | None:
    """把 LearningCenterRecordVo（camelCase）行映射成 LearningPathSnapshot。

    找不到 path_id（sourceResultId 为空）直接返回 None，调用方过滤。
    """
    path_id = row.get("sourceResultId") or row.get("source_result_id")
    if not path_id:
        return None
    return LearningPathSnapshot(
        path_id=str(path_id),
        record_id=(str(row.get("recordId")) if row.get("recordId") else None),
        path_title=row.get("displayTitle") or row.get("display_title"),
        path_summary=row.get("summary"),
        source_type=row.get("sourceType") or row.get("source_type"),
        source_session_id=row.get("sourceSessionId") or row.get("source_session_id"),
        status=row.get("status"),
        source_time=_parse_datetime(row.get("sourceTime") or row.get("source_time")),
        favorite=row.get("favorite"),
    )


class LearningPathsReader(RuoYiServiceMixin):
    """只读访问 xm_learning_path —— 通过 RuoYi history controller（带 resultType=path 过滤）。"""

    _RESOURCE = PATH_RESOURCE_LABEL

    def __init__(self, client_factory=None) -> None:
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def list_paths(
        self,
        *,
        user_id: str,
        page_num: int,
        page_size: int,
        access_context: "AccessContext | None" = None,
    ) -> tuple[int, list[LearningPathSnapshot]]:
        """返回 (total, rows)。

        RuoYi 的 history 控制器本身从 LoginHelper.getUserId() 取用户，user_id 参数
        仅用于日志/未来扩展。
        """
        params: dict[str, Any] = {
            "resultType": "path",
            "pageNum": page_num,
            "pageSize": page_size,
        }
        try:
            async with self._resolve_authenticated_factory(access_context)() as client:
                result = await client.get_page(
                    LEARNING_CENTER_HISTORY_PATH,
                    resource=PATH_RESOURCE_LABEL,
                    operation=PATH_LIST_OPERATION,
                    params=params,
                )
        except IntegrationError:
            raise
        rows: list[LearningPathSnapshot] = []
        for raw in result.rows or []:
            if not isinstance(raw, Mapping):
                continue
            snap = _row_to_snapshot(raw)
            if snap is not None:
                rows.append(snap)
        logger.info(
            "learning_coach.paths.list",
            extra={"user_id": user_id, "total": result.total, "returned": len(rows)},
        )
        return result.total, rows

    async def get_path(
        self,
        *,
        path_id: str,
        user_id: str,
        access_context: "AccessContext | None" = None,
    ) -> LearningPathSnapshot | None:
        """拉取单条 path 快照。

        history controller 没有按 source_result_id 精确查询的入口，先走 list（size=100）
        再按 path_id 过滤；单用户的 path 数量通常 <= 几十，够用。
        """
        # RuoYi history 页面默认大小 10，取 100 足够覆盖绝大多数用户。
        _, rows = await self.list_paths(
            user_id=user_id,
            page_num=1,
            page_size=100,
            access_context=access_context,
        )
        for snap in rows:
            if snap.path_id == path_id:
                return snap
        return None
