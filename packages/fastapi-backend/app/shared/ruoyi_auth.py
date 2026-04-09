"""RuoYi 请求鉴权数据结构。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.security import AccessContext


@dataclass(slots=True, frozen=True)
class RuoYiRequestAuth:
    """一次 RuoYi 请求所需的 Bearer token 与 Clientid。"""

    access_token: str
    client_id: str | None = None

    @classmethod
    def from_access_context(cls, access_context: "AccessContext") -> "RuoYiRequestAuth":
        """从认证通过的用户上下文构造请求鉴权。"""

        return cls(
            access_token=access_context.token,
            client_id=access_context.client_id,
        )
