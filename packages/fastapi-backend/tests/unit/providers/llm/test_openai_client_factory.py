"""Tests for OpenAI client factory — ManimCat-aligned client creation."""

import pytest
from openai import AsyncOpenAI, OpenAI

from app.features.video.pipeline.engine.gpt_request import ProviderEndpoint
from app.providers.llm.openai_client_factory import (
    client_from_endpoint,
    create_async_client,
    create_sync_client,
)


class TestCreateSyncClient:
    def test_default_timeout(self):
        client = create_sync_client("https://api.example.com/v1", "sk-test")
        assert isinstance(client, OpenAI)
        assert client.timeout == 600.0

    def test_custom_timeout(self):
        client = create_sync_client("https://api.example.com/v1", "sk-test", timeout=300.0)
        assert client.timeout == 300.0

    def test_extra_headers(self):
        client = create_sync_client(
            "https://api.example.com/v1", "sk-test",
            extra_headers={"X-Custom": "value"},
        )
        assert isinstance(client, OpenAI)

    def test_missing_api_key_raises(self):
        with pytest.raises(ValueError, match="api_key"):
            create_sync_client("https://api.example.com/v1", "")

    def test_missing_base_url_raises(self):
        with pytest.raises(ValueError, match="base_url"):
            create_sync_client("", "sk-test")


class TestCreateAsyncClient:
    def test_default_timeout(self):
        client = create_async_client("https://api.example.com/v1", "sk-test")
        assert isinstance(client, AsyncOpenAI)
        assert client.timeout == 600.0

    def test_custom_timeout(self):
        client = create_async_client("https://api.example.com/v1", "sk-test", timeout=120.0)
        assert client.timeout == 120.0

    def test_missing_api_key_raises(self):
        with pytest.raises(ValueError, match="api_key"):
            create_async_client("https://api.example.com/v1", "")


class TestClientFromEndpoint:
    def test_from_provider_endpoint(self):
        ep = ProviderEndpoint(
            base_url="https://api.example.com/v1",
            api_key="sk-test",
            model_name="gpt-4o",
            timeout=300.0,
        )
        client = client_from_endpoint(ep)
        assert isinstance(client, OpenAI)

    def test_minimum_timeout_enforced(self):
        """timeout 至少 600s（照抄 ManimCat）。"""
        ep = ProviderEndpoint(
            base_url="https://api.example.com/v1",
            api_key="sk-test",
            model_name="gpt-4o",
            timeout=60.0,
        )
        client = client_from_endpoint(ep)
        assert client.timeout == 600.0

    def test_endpoint_timeout_above_minimum_passes_through(self):
        ep = ProviderEndpoint(
            base_url="https://api.example.com/v1",
            api_key="sk-test",
            model_name="gpt-4o",
            timeout=900.0,
        )
        client = client_from_endpoint(ep)
        assert client.timeout == 900.0
