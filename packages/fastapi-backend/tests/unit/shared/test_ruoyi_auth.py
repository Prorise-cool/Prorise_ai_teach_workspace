from __future__ import annotations

import base64
import json
from types import SimpleNamespace

import pytest

from app.core.config import RuoYiServiceAuthMode
from app.core.errors import AppError
from app.shared.ruoyi_auth import load_ruoyi_service_auth


def _build_jwt_like_token(payload: dict[str, object]) -> str:
    encoded_payload = base64.urlsafe_b64encode(
        json.dumps(payload).encode("utf-8")
    ).decode("utf-8").rstrip("=")
    return f"header.{encoded_payload}.signature"


def test_load_ruoyi_service_auth_reads_token_from_file(tmp_path) -> None:
    token_file = tmp_path / "ruoyi-service.token"
    token_file.write_text("service-token", encoding="utf-8")

    auth = load_ruoyi_service_auth(
        SimpleNamespace(
            ruoyi_service_auth_mode=RuoYiServiceAuthMode.TOKEN_FILE,
            ruoyi_service_client_id="service-client-id",
            resolve_ruoyi_service_token_file=lambda: token_file,
        )
    )

    assert auth.access_token == "service-token"
    assert auth.client_id == "service-client-id"


def test_load_ruoyi_service_auth_rejects_disabled_mode() -> None:
    with pytest.raises(AppError, match="未配置 RuoYi 服务级鉴权"):
        load_ruoyi_service_auth(
            SimpleNamespace(
                ruoyi_service_auth_mode=RuoYiServiceAuthMode.DISABLED,
            )
        )


def test_load_ruoyi_service_auth_reads_strict_json_payload(tmp_path) -> None:
    token_file = tmp_path / "ruoyi-service.token"
    token_file.write_text(
        json.dumps(
            {
                "access_token": "service-token",
                "client_id": "service-client-id",
            }
        ),
        encoding="utf-8",
    )

    auth = load_ruoyi_service_auth(
        SimpleNamespace(
            ruoyi_service_auth_mode=RuoYiServiceAuthMode.TOKEN_FILE,
            ruoyi_service_client_id=None,
            resolve_ruoyi_service_token_file=lambda: token_file,
        )
    )

    assert auth.access_token == "service-token"
    assert auth.client_id == "service-client-id"


def test_load_ruoyi_service_auth_infers_client_id_from_jwt_when_json_payload_omits_it(tmp_path) -> None:
    token = _build_jwt_like_token({"clientid": "jwt-client-id"})
    token_file = tmp_path / "ruoyi-service.token"
    token_file.write_text(
        json.dumps({"access_token": token}),
        encoding="utf-8",
    )

    auth = load_ruoyi_service_auth(
        SimpleNamespace(
            ruoyi_service_auth_mode=RuoYiServiceAuthMode.TOKEN_FILE,
            ruoyi_service_client_id=None,
            resolve_ruoyi_service_token_file=lambda: token_file,
        )
    )

    assert auth.access_token == token
    assert auth.client_id == "jwt-client-id"


@pytest.mark.parametrize(
    ("payload", "expected_reason"),
    [
        (
            json.dumps(
                {
                    "code": 200,
                    "msg": "操作成功",
                    "data": {
                        "access_token": "legacy-token",
                        "client_id": "legacy-client-id",
                    },
                }
            ),
            "missing required field: access_token",
        ),
        (json.dumps(["not", "an", "object"]), "token file must contain a JWT string or a JSON object"),
        (json.dumps({"access_token": ""}), "field access_token cannot be empty"),
    ],
)
def test_load_ruoyi_service_auth_rejects_legacy_or_invalid_payloads(
    tmp_path,
    payload: str,
    expected_reason: str,
) -> None:
    token_file = tmp_path / "ruoyi-service.token"
    token_file.write_text(payload, encoding="utf-8")

    with pytest.raises(AppError, match="token 文件格式非法") as exc_info:
        load_ruoyi_service_auth(
            SimpleNamespace(
                ruoyi_service_auth_mode=RuoYiServiceAuthMode.TOKEN_FILE,
                ruoyi_service_client_id=None,
                resolve_ruoyi_service_token_file=lambda: token_file,
            )
        )

    assert exc_info.value.details == {
        "token_file": str(token_file),
        "reason": expected_reason,
    }
