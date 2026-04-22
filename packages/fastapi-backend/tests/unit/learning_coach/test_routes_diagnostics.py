"""Learning Coach `/learning-coach/_diagnostics` 路由单测。

覆盖点：
- 空 provider chain 返回 chainLength=0；
- 非空 chain 按顺序返回 id / typeName / priority；
- `probe=true` 成功路径返回 ok + latencyMs + content；
- `probe=true` 失败路径返回 ok=false + error；
- 非白名单 / 非超级管理员用户命中 403。
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.security import AccessContext, get_access_context
from app.features.learning_coach import routes as learning_coach_routes
from app.features.learning_coach.service import LearningCoachService
from app.main import create_app
from app.providers.protocols import ProviderResult


# ---------------------------- 测试替身 ----------------------------


class _FakeLLMProvider:
    """轻量 LLM provider 替身，可预置返回内容或抛错。"""

    def __init__(
        self,
        *,
        provider_id: str,
        content: str = "OK",
        priority: int | None = None,
        raise_error: Exception | None = None,
    ) -> None:
        self.provider_id = provider_id
        self.priority = priority
        self._content = content
        self._raise_error = raise_error

    async def generate(self, prompt: str) -> ProviderResult:  # noqa: ARG002
        if self._raise_error is not None:
            raise self._raise_error
        return ProviderResult(provider=self.provider_id, content=self._content)


def _build_context(
    *,
    user_id: str = "1",
    permissions: tuple[str, ...] = ("*:*:*",),
) -> AccessContext:
    return AccessContext(
        user_id=user_id,
        username="diag-user",
        roles=("tester",),
        permissions=permissions,
        token="diag-token",
        client_id=None,
        request_id="diag-req",
        online_ttl_seconds=60,
    )


@contextmanager
def _diagnostics_client(
    *,
    provider_chain: tuple[Any, ...],
    access_context: AccessContext,
) -> Iterator[TestClient]:
    """构造带覆盖依赖的 TestClient：替换 service 的 provider chain 与认证上下文。"""

    service = LearningCoachService.__new__(LearningCoachService)
    service._provider_chain = provider_chain  # type: ignore[attr-defined]

    app = create_app()
    app.dependency_overrides[get_access_context] = lambda: access_context
    app.dependency_overrides[
        learning_coach_routes.get_learning_coach_service
    ] = lambda: service
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


# ---------------------------- fixtures ----------------------------


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> Iterator[None]:
    """保证 settings lru_cache 在每个用例使用新 env。"""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


# ---------------------------- 测试用例 ----------------------------


def test_diagnostics_empty_chain_returns_zero() -> None:
    with _diagnostics_client(
        provider_chain=(),
        access_context=_build_context(),
    ) as client:
        response = client.get("/api/v1/learning-coach/_diagnostics")

    assert response.status_code == 200
    payload = response.json()
    assert payload["chainLength"] == 0
    assert payload["providers"] == []
    assert payload["probe"] is None


def test_diagnostics_non_empty_chain_reports_structure() -> None:
    chain = (
        _FakeLLMProvider(provider_id="openai-compatible", priority=20),
        _FakeLLMProvider(provider_id="stub-llm", priority=100),
    )
    with _diagnostics_client(
        provider_chain=chain,
        access_context=_build_context(),
    ) as client:
        response = client.get("/api/v1/learning-coach/_diagnostics")

    assert response.status_code == 200
    payload = response.json()
    assert payload["chainLength"] == 2
    assert payload["providers"][0]["id"] == "openai-compatible"
    assert payload["providers"][0]["typeName"] == "_FakeLLMProvider"
    assert payload["providers"][0]["priority"] == 20
    assert payload["providers"][1]["id"] == "stub-llm"
    assert payload["probe"] is None


def test_diagnostics_probe_true_success_path() -> None:
    fake_provider = _FakeLLMProvider(
        provider_id="openai-compatible", content="OK-from-llm"
    )
    # 包装成 AsyncMock 以验证确实被调用且只调用一次。
    fake_provider.generate = AsyncMock(  # type: ignore[method-assign]
        return_value=ProviderResult(
            provider="openai-compatible", content="OK-from-llm"
        )
    )
    with _diagnostics_client(
        provider_chain=(fake_provider,),
        access_context=_build_context(),
    ) as client:
        response = client.get(
            "/api/v1/learning-coach/_diagnostics", params={"probe": "true"}
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["chainLength"] == 1
    assert payload["probe"]["ok"] is True
    assert payload["probe"]["content"] == "OK-from-llm"
    assert isinstance(payload["probe"]["latencyMs"], int)
    assert payload["probe"]["latencyMs"] >= 0
    fake_provider.generate.assert_awaited_once()


def test_diagnostics_probe_true_failure_path() -> None:
    fake_provider = _FakeLLMProvider(
        provider_id="openai-compatible",
        raise_error=RuntimeError("upstream 502"),
    )
    with _diagnostics_client(
        provider_chain=(fake_provider,),
        access_context=_build_context(),
    ) as client:
        response = client.get(
            "/api/v1/learning-coach/_diagnostics", params={"probe": "true"}
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["probe"]["ok"] is False
    assert "upstream 502" in payload["probe"]["error"]


def test_diagnostics_non_admin_user_gets_403(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # 清空白名单且用户不是超级管理员 => 必须 403。
    monkeypatch.setenv("FASTAPI_DIAGNOSTICS_ALLOWLIST", "")
    get_settings.cache_clear()

    with _diagnostics_client(
        provider_chain=(),
        access_context=_build_context(
            user_id="99999", permissions=("learning:coach:view",)
        ),
    ) as client:
        response = client.get("/api/v1/learning-coach/_diagnostics")

    assert response.status_code == 403


def test_diagnostics_allowlist_user_allowed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("FASTAPI_DIAGNOSTICS_ALLOWLIST", "42, 99999")
    get_settings.cache_clear()

    with _diagnostics_client(
        provider_chain=(),
        access_context=_build_context(
            user_id="99999", permissions=("learning:coach:view",)
        ),
    ) as client:
        response = client.get("/api/v1/learning-coach/_diagnostics")

    assert response.status_code == 200
    assert response.json()["chainLength"] == 0
