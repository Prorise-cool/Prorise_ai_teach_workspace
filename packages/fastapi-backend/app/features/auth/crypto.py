"""RuoYi 认证接口加解密辅助。

student-web 现在把登录/注册入口统一打到 FastAPI，
由本模块负责把明文 JSON 转换成 RuoYi ``@ApiEncrypt`` 所需的协议，
并把上游加密响应解回标准 JSON。
"""

from __future__ import annotations

import base64
import json
import secrets
import string
from functools import cached_property

from cryptography.hazmat.primitives import padding, serialization
from cryptography.hazmat.primitives.asymmetric import padding as asym_padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from app.core.config import Settings
from app.core.errors import AppError

_AES_KEY_ALPHABET = string.ascii_letters + string.digits


def _generate_aes_key(length: int = 32) -> bytes:
    return "".join(secrets.choice(_AES_KEY_ALPHABET) for _ in range(length)).encode("utf-8")


def _load_public_key(raw_key: str):
    key_text = raw_key.strip()
    try:
        if "BEGIN PUBLIC KEY" in key_text:
            return serialization.load_pem_public_key(key_text.encode("utf-8"))
        return serialization.load_der_public_key(base64.b64decode(key_text))
    except ValueError as exc:
        raise AppError(
            code="RUOYI_AUTH_CRYPTO_MISCONFIGURED",
            message="FastAPI 缺少可用的 RuoYi 公钥配置",
            status_code=500,
        ) from exc


def _load_private_key(raw_key: str):
    key_text = raw_key.strip()
    try:
        if "BEGIN PRIVATE KEY" in key_text or "BEGIN RSA PRIVATE KEY" in key_text:
            return serialization.load_pem_private_key(key_text.encode("utf-8"), password=None)
        return serialization.load_der_private_key(base64.b64decode(key_text), password=None)
    except ValueError as exc:
        raise AppError(
            code="RUOYI_AUTH_CRYPTO_MISCONFIGURED",
            message="FastAPI 缺少可用的 RuoYi 私钥配置",
            status_code=500,
        ) from exc


def _encrypt_with_aes(plain_text: str, aes_key: bytes) -> str:
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    padded = padder.update(plain_text.encode("utf-8")) + padder.finalize()
    cipher = Cipher(algorithms.AES(aes_key), modes.ECB())
    encryptor = cipher.encryptor()
    cipher_bytes = encryptor.update(padded) + encryptor.finalize()
    return base64.b64encode(cipher_bytes).decode("utf-8")


def _decrypt_with_aes(cipher_text: str, aes_key: bytes) -> str:
    cipher = Cipher(algorithms.AES(aes_key), modes.ECB())
    decryptor = cipher.decryptor()
    decrypted = decryptor.update(base64.b64decode(cipher_text)) + decryptor.finalize()
    unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
    plain = unpadder.update(decrypted) + unpadder.finalize()
    return plain.decode("utf-8")


class RuoYiAuthCrypto:
    """RuoYi 认证协议的加解密适配器。"""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def header_flag(self) -> str:
        return self._settings.ruoyi_encrypt_header_flag

    @property
    def enabled(self) -> bool:
        return self._settings.ruoyi_encrypt_enabled

    @cached_property
    def _public_key(self):
        if not self.enabled:
            return None
        if not self._settings.ruoyi_encrypt_public_key:
            raise AppError(
                code="RUOYI_AUTH_CRYPTO_MISCONFIGURED",
                message="FastAPI 未配置 RuoYi 认证公钥，无法代理登录或注册",
                status_code=500,
            )
        return _load_public_key(self._settings.ruoyi_encrypt_public_key)

    @cached_property
    def _private_key(self):
        if not self.enabled:
            return None
        if not self._settings.ruoyi_encrypt_private_key:
            raise AppError(
                code="RUOYI_AUTH_CRYPTO_MISCONFIGURED",
                message="FastAPI 未配置 RuoYi 认证私钥，无法解析登录或注册响应",
                status_code=500,
            )
        return _load_private_key(self._settings.ruoyi_encrypt_private_key)

    def build_encrypted_request(
        self,
        payload: dict[str, object],
    ) -> tuple[dict[str, str], str]:
        """把明文 JSON 负载编码成 RuoYi ``@ApiEncrypt`` 协议。"""
        if not self.enabled:
            return {}, json.dumps(payload, ensure_ascii=False)

        aes_key = _generate_aes_key()
        encrypted_key = self._public_key.encrypt(  # type: ignore[union-attr]
            base64.b64encode(aes_key),
            asym_padding.PKCS1v15(),
        )
        return (
            {self.header_flag: base64.b64encode(encrypted_key).decode("utf-8")},
            _encrypt_with_aes(json.dumps(payload, ensure_ascii=False), aes_key),
        )

    def decrypt_response_body(self, encrypted_key: str, cipher_text: str) -> dict[str, object]:
        """解密 RuoYi 返回的加密响应。"""
        if not self.enabled:
            raise AppError(
                code="RUOYI_AUTH_CRYPTO_MISCONFIGURED",
                message="当前未开启 RuoYi 认证加密，不应收到加密响应",
                status_code=500,
            )

        aes_key_b64 = self._private_key.decrypt(  # type: ignore[union-attr]
            base64.b64decode(encrypted_key),
            asym_padding.PKCS1v15(),
        )
        plain_text = _decrypt_with_aes(
            cipher_text,
            base64.b64decode(aes_key_b64),
        )
        payload = json.loads(plain_text)
        if not isinstance(payload, dict):
            raise AppError(
                code="RUOYI_AUTH_PROXY_INVALID_RESPONSE",
                message="RuoYi 认证响应格式异常",
                status_code=502,
            )
        return payload
