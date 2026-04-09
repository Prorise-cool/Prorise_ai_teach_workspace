from __future__ import annotations

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import Settings
from app.features.auth.crypto import RuoYiAuthCrypto


def test_ruoyi_auth_crypto_encrypts_request_and_decrypts_response_roundtrip() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    settings = Settings.model_construct(
        ruoyi_encrypt_enabled=True,
        ruoyi_encrypt_header_flag="encrypt-key",
        ruoyi_encrypt_public_key=base64.b64encode(
            public_key.public_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )
        ).decode("utf-8"),
        ruoyi_encrypt_private_key=base64.b64encode(
            private_key.private_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
        ).decode("utf-8"),
    )
    crypto = RuoYiAuthCrypto(settings)
    request_headers, cipher_text = crypto.build_encrypted_request(
        {"username": "admin", "password": "admin123"}
    )

    payload = crypto.decrypt_response_body(
        request_headers["encrypt-key"],
        cipher_text,
    )

    assert payload == {"username": "admin", "password": "admin123"}
