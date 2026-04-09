"""FastAPI 认证代理路由。"""

from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import JSONResponse

from app.features.auth.models import (
    AuthCaptchaResponseEnvelope,
    AuthCurrentUserResponseEnvelope,
    AuthLoginRequest,
    AuthLoginResponseEnvelope,
    AuthNullResponseEnvelope,
    AuthRegisterEnabledResponseEnvelope,
    AuthRegisterRequest,
    AuthSocialBindingResponseEnvelope,
)
from app.features.auth.service import AuthProxyService

router = APIRouter(prefix="/auth", tags=["auth"])


@lru_cache
def get_auth_proxy_service() -> AuthProxyService:
    """获取缓存的认证代理服务。"""
    return AuthProxyService()


@router.post("/login", response_model=AuthLoginResponseEnvelope)
async def login(
    payload: AuthLoginRequest,
    request: Request,
    service: AuthProxyService = Depends(get_auth_proxy_service),
):
    """通过 FastAPI 代理到 RuoYi 登录，并同步写入 FastAPI 在线态。"""
    status_code, response_payload = await service.login(
        payload,
        runtime_store=request.app.state.runtime_store,
    )
    if status_code != 200:
        return JSONResponse(status_code=status_code, content=response_payload)
    return response_payload


@router.post("/register", response_model=AuthNullResponseEnvelope)
async def register(
    payload: AuthRegisterRequest,
    service: AuthProxyService = Depends(get_auth_proxy_service),
):
    """通过 FastAPI 代理到 RuoYi 注册。"""
    status_code, response_payload = await service.register(payload)
    if status_code != 200:
        return JSONResponse(status_code=status_code, content=response_payload)
    return response_payload


@router.get("/code", response_model=AuthCaptchaResponseEnvelope)
async def get_captcha(
    service: AuthProxyService = Depends(get_auth_proxy_service),
):
    """获取验证码。"""
    status_code, response_payload = await service.get_captcha()
    if status_code != 200:
        return JSONResponse(status_code=status_code, content=response_payload)
    return response_payload


@router.get("/register/enabled", response_model=AuthRegisterEnabledResponseEnvelope)
async def get_register_enabled(
    tenant_id: str = Query(..., alias="tenantId"),
    service: AuthProxyService = Depends(get_auth_proxy_service),
):
    """查询租户注册开关。"""
    status_code, response_payload = await service.get_register_enabled(tenant_id)
    if status_code != 200:
        return JSONResponse(status_code=status_code, content=response_payload)
    return response_payload


@router.get("/binding/{source}", response_model=AuthSocialBindingResponseEnvelope)
async def get_social_binding_url(
    source: str,
    tenant_id: str = Query(..., alias="tenantId"),
    domain: str = Query(...),
    service: AuthProxyService = Depends(get_auth_proxy_service),
):
    """获取第三方登录跳转地址。"""
    status_code, response_payload = await service.get_social_binding(
        source,
        tenant_id=tenant_id,
        domain=domain,
    )
    if status_code != 200:
        return JSONResponse(status_code=status_code, content=response_payload)
    return response_payload


@router.post("/logout", response_model=AuthNullResponseEnvelope)
async def logout(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    service: AuthProxyService = Depends(get_auth_proxy_service),
):
    """退出当前登录会话，并回收 FastAPI 在线态。"""
    status_code, response_payload = await service.logout(
        authorization=authorization,
        runtime_store=request.app.state.runtime_store,
    )
    if status_code != 200:
        return JSONResponse(status_code=status_code, content=response_payload)
    return response_payload


@router.get("/me", response_model=AuthCurrentUserResponseEnvelope)
async def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    service: AuthProxyService = Depends(get_auth_proxy_service),
):
    """获取当前登录用户信息。"""
    status_code, response_payload = await service.get_current_user(
        service.build_request_auth(authorization)
    )
    if status_code != 200:
        return JSONResponse(status_code=status_code, content=response_payload)
    return response_payload
