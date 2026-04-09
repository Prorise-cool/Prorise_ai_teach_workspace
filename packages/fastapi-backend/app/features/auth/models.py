"""FastAPI 认证代理模型。

提供 student-web 与 FastAPI 认证代理层共用的请求/响应结构，
由 FastAPI 负责把这些结构转换为 RuoYi 所需的上游契约。
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas._camel import CamelCaseModel


class AuthLoginRequest(CamelCaseModel):
    """登录请求。"""

    username: str | None = None
    password: str | None = None
    tenant_id: str | None = Field(default=None, alias="tenantId")
    client_id: str | None = Field(default=None, alias="clientId")
    grant_type: str | None = Field(default=None, alias="grantType")
    code: str | None = None
    uuid: str | None = None
    source: str | None = None
    social_code: str | None = Field(default=None, alias="socialCode")
    social_state: str | None = Field(default=None, alias="socialState")
    return_to: str | None = Field(default=None, alias="returnTo")


class AuthRegisterRequest(CamelCaseModel):
    """注册请求。"""

    username: str
    password: str
    confirm_password: str = Field(alias="confirmPassword")
    code: str | None = None
    uuid: str | None = None
    tenant_id: str | None = Field(default=None, alias="tenantId")
    client_id: str | None = Field(default=None, alias="clientId")
    grant_type: str | None = Field(default=None, alias="grantType")
    user_type: str | None = Field(default=None, alias="userType")
    return_to: str | None = Field(default=None, alias="returnTo")


class AuthCaptchaPayload(BaseModel):
    """验证码响应负载。"""

    captchaEnabled: bool
    uuid: str | None = None
    img: str | None = None


class AuthLoginTokenPayload(BaseModel):
    """RuoYi 登录 token 响应负载。"""

    access_token: str
    refresh_token: str | None = None
    expire_in: int
    refresh_expire_in: int | None = None
    client_id: str | None = None
    openid: str | None = None
    scope: str | None = None


class AuthUserRolePayload(CamelCaseModel):
    """当前用户角色负载。"""

    role_id: str | int = Field(alias="roleId")
    role_key: str = Field(alias="roleKey")
    role_name: str = Field(alias="roleName")


class AuthUserPayload(CamelCaseModel):
    """当前用户主体负载。"""

    user_id: str | int = Field(alias="userId")
    user_name: str = Field(alias="userName")
    nick_name: str = Field(alias="nickName")
    avatar: str | None = None
    roles: list[AuthUserRolePayload] = Field(default_factory=list)


class AuthCurrentUserPayload(CamelCaseModel):
    """当前用户信息负载。"""

    user: AuthUserPayload | None = None
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)


class AuthLoginResponseEnvelope(BaseModel):
    """登录响应信封。"""

    code: int = Field(default=200)
    msg: str = Field(default="操作成功")
    data: AuthLoginTokenPayload


class AuthCaptchaResponseEnvelope(BaseModel):
    """验证码响应信封。"""

    code: int = Field(default=200)
    msg: str = Field(default="获取成功")
    data: AuthCaptchaPayload


class AuthCurrentUserResponseEnvelope(BaseModel):
    """当前用户响应信封。"""

    code: int = Field(default=200)
    msg: str = Field(default="获取成功")
    data: AuthCurrentUserPayload


class AuthSocialBindingResponseEnvelope(BaseModel):
    """第三方绑定入口响应信封。"""

    code: int = Field(default=200)
    msg: str = Field(default="操作成功")
    data: str


class AuthRegisterEnabledResponseEnvelope(BaseModel):
    """注册开关响应信封。"""

    code: int = Field(default=200)
    msg: str = Field(default="获取成功")
    data: bool


class AuthNullResponseEnvelope(BaseModel):
    """空 data 成功响应信封。"""

    code: int = Field(default=200)
    msg: str = Field(default="操作成功")
    data: None = None
