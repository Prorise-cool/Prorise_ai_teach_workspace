"""FastAPI 认证代理服务。

职责：
1. 把 student-web 的认证入口统一收口到 FastAPI；
2. 由 FastAPI 负责与 RuoYi 认证接口通信；
3. 登录成功后把在线态写入 FastAPI 运行时，避免再出现 env/token 文件兜底。

Design Note — Direct httpx Client Usage:
    本服务直接创建 ``httpx.AsyncClient`` 而非使用共享的 ``RuoYiClient``。
    这是刻意为之，原因如下：

    1. RuoYi 认证端点要求 ``@ApiEncrypt`` 协议（RSA+AES 混合加密），
       由 ``RuoYiAuthCrypto`` 处理；
    2. 共享的 ``RuoYiClient`` 不支持请求/响应体加解密；
    3. 认证端点有独特的错误处理模式（token 持久化、在线态写入）。

    未来改进方向：将加密支持抽取为 ``RuoYiClient`` 的可选中间件。
"""

from __future__ import annotations

from typing import Any, Mapping

import httpx

from app.core.config import Settings, get_settings
from app.core.errors import AppError, IntegrationError
from app.core.security import extract_access_token_claims, extract_bearer_token
from app.features.auth.crypto import RuoYiAuthCrypto
from app.features.auth.models import AuthLoginRequest, AuthRegisterRequest
from app.infra.redis_client import RuntimeStore
from app.shared.ruoyi.auth import RuoYiRequestAuth


class AuthProxyService:
    """RuoYi 认证代理服务。"""

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        transport: httpx.BaseTransport | httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._transport = transport
        self._crypto = RuoYiAuthCrypto(self._settings)

    def _build_client(self, *, headers: Mapping[str, str] | None = None) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self._settings.ruoyi_base_url,
            timeout=self._settings.ruoyi_timeout_seconds,
            headers=dict(headers or {}),
            transport=self._transport,
        )

    async def login(
        self,
        payload: AuthLoginRequest,
        *,
        runtime_store: RuntimeStore,
    ) -> tuple[int, dict[str, Any]]:
        """代理登录，并在成功后写入 FastAPI 在线态。"""
        status_code, response_payload = await self._request_json(
            "POST",
            "/auth/login",
            json_body=payload.model_dump(by_alias=True, exclude_none=True),
            encrypted=True,
        )
        if status_code == 200:
            self._persist_online_token(
                runtime_store,
                payload=response_payload,
                username=payload.username,
            )
        return status_code, response_payload

    async def register(self, payload: AuthRegisterRequest) -> tuple[int, dict[str, Any]]:
        """代理注册。"""
        return await self._request_json(
            "POST",
            "/auth/register",
            json_body=payload.model_dump(by_alias=True, exclude_none=True),
            encrypted=True,
        )

    async def get_captcha(self) -> tuple[int, dict[str, Any]]:
        """代理验证码接口。"""
        return await self._request_json("GET", "/auth/code")

    async def get_register_enabled(self, tenant_id: str) -> tuple[int, dict[str, Any]]:
        """代理注册开关查询。"""
        return await self._request_json(
            "GET",
            "/auth/register/enabled",
            params={"tenantId": tenant_id},
        )

    async def get_social_binding(
        self,
        source: str,
        *,
        tenant_id: str,
        domain: str,
    ) -> tuple[int, dict[str, Any]]:
        """代理第三方登录绑定入口。"""
        return await self._request_json(
            "GET",
            f"/auth/binding/{source}",
            params={"tenantId": tenant_id, "domain": domain},
        )

    async def logout(
        self,
        *,
        authorization: str | None,
        runtime_store: RuntimeStore,
    ) -> tuple[int, dict[str, Any]]:
        """代理登出，并清理 FastAPI 在线态。"""
        token = extract_bearer_token(authorization)
        if token is None:
            return 200, {"code": 200, "msg": "退出成功", "data": None}

        claims = extract_access_token_claims(token)
        try:
            status_code, response_payload = await self._request_json(
                "POST",
                "/auth/logout",
                headers={"Authorization": f"Bearer {token}"},
            )
        finally:
            runtime_store.delete_online_token_record(token, tenant_id=claims.tenant_id)

        return status_code, response_payload

    async def get_current_user(
        self,
        request_auth: RuoYiRequestAuth,
    ) -> tuple[int, dict[str, Any]]:
        """代理当前用户信息查询。"""
        headers = {"Authorization": f"Bearer {request_auth.access_token}"}
        if request_auth.client_id:
            headers["Clientid"] = request_auth.client_id
        return await self._request_json(
            "GET",
            "/system/user/getInfo",
            headers=headers,
        )

    def build_request_auth(self, authorization: str | None) -> RuoYiRequestAuth:
        """从 Authorization 头构建请求鉴权。"""
        token = extract_bearer_token(authorization)
        if token is None:
            raise AppError(
                code="AUTH_TOKEN_MISSING",
                message="未提供有效认证令牌",
                status_code=401,
            )
        claims = extract_access_token_claims(token)
        return RuoYiRequestAuth(access_token=token, client_id=claims.client_id)

    async def _request_json(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, object] | None = None,
        params: Mapping[str, object] | None = None,
        headers: Mapping[str, str] | None = None,
        encrypted: bool = False,
    ) -> tuple[int, dict[str, Any]]:
        request_headers = dict(headers or {})

        try:
            async with self._build_client(headers=request_headers) as client:
                if encrypted and json_body is not None:
                    encrypted_headers, encrypted_body = self._crypto.build_encrypted_request(json_body)
                    request_headers.update(encrypted_headers)
                    request_headers.setdefault("Content-Type", "application/json")
                    response = await client.request(
                        method,
                        path,
                        params=params,
                        content=encrypted_body,
                        headers=request_headers,
                    )
                else:
                    response = await client.request(
                        method,
                        path,
                        params=params,
                        json=json_body,
                        headers=request_headers,
                    )
        except httpx.TimeoutException as exc:
            raise IntegrationError(
                service="ruoyi",
                resource="auth",
                operation=f"{method.lower()} {path}",
                code="RUOYI_TIMEOUT",
                message="RuoYi 认证请求超时",
                status_code=504,
                retryable=False,
            ) from exc
        except httpx.RequestError as exc:
            raise IntegrationError(
                service="ruoyi",
                resource="auth",
                operation=f"{method.lower()} {path}",
                code="RUOYI_NETWORK_ERROR",
                message="RuoYi 认证网络异常",
                status_code=503,
                retryable=True,
            ) from exc

        payload = self._parse_response_payload(response)
        payload_code = payload.get("code")
        normalized_payload_code = payload_code if isinstance(payload_code, int) else None
        effective_status = response.status_code if response.status_code >= 400 else (normalized_payload_code or 200)
        return effective_status, payload

    def _parse_response_payload(self, response: httpx.Response) -> dict[str, Any]:
        encrypted_key = response.headers.get(self._crypto.header_flag)
        if encrypted_key:
            return self._crypto.decrypt_response_body(encrypted_key, response.text)

        try:
            payload = response.json()
        except ValueError as exc:
            raise AppError(
                code="RUOYI_AUTH_PROXY_INVALID_RESPONSE",
                message="RuoYi 认证响应不是合法 JSON",
                status_code=502,
            ) from exc

        if not isinstance(payload, dict):
            raise AppError(
                code="RUOYI_AUTH_PROXY_INVALID_RESPONSE",
                message="RuoYi 认证响应格式异常",
                status_code=502,
            )
        return payload

    def _persist_online_token(
        self,
        runtime_store: RuntimeStore,
        *,
        payload: Mapping[str, Any],
        username: str | None,
    ) -> None:
        token_payload = payload.get("data")
        if not isinstance(token_payload, Mapping):
            raise AppError(
                code="RUOYI_AUTH_PROXY_INVALID_RESPONSE",
                message="登录响应缺少 token 数据",
                status_code=502,
            )

        access_token = token_payload.get("access_token")
        expire_in = token_payload.get("expire_in")
        client_id = token_payload.get("client_id")
        if not isinstance(access_token, str) or not access_token.strip():
            raise AppError(
                code="RUOYI_AUTH_PROXY_INVALID_RESPONSE",
                message="登录响应缺少 access_token",
                status_code=502,
            )
        if not isinstance(expire_in, int) or expire_in <= 0:
            raise AppError(
                code="RUOYI_AUTH_PROXY_INVALID_RESPONSE",
                message="登录响应缺少有效 expire_in",
                status_code=502,
            )

        claims = extract_access_token_claims(access_token)
        runtime_store.set_online_token_record(
            access_token,
            {
                "tokenId": access_token,
                "userName": username or "",
                "clientKey": client_id if isinstance(client_id, str) else None,
            },
            tenant_id=claims.tenant_id,
            ttl_seconds=expire_in,
        )
