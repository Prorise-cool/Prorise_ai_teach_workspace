"""最小 LLM 调用测试 — 直接调 gpt_request 看返回什么。"""
import asyncio
import json
import logging
import sys

sys.path.insert(0, ".")

logging.basicConfig(level=logging.DEBUG, format="%(name)s %(levelname)s %(message)s")


async def main():
    from app.core.config import get_settings
    from app.providers.factory import get_provider_factory
    from app.providers.runtime_config_service import ProviderRuntimeResolver

    settings = get_settings()
    factory = get_provider_factory()
    resolver = ProviderRuntimeResolver(settings=settings, provider_factory=factory)

    # 从 Redis 取 auth token
    import redis
    r = redis.Redis(host="localhost", port=6379, decode_responses=True)
    auth_raw = r.get("xm_video_runtime_auth:vtask_20260415115707_7aa5ae18")
    if not auth_raw:
        print("No auth in Redis, using admin token from args")
        return

    auth_data = json.loads(auth_raw)
    access_token = auth_data["accessToken"]
    client_id = auth_data.get("clientId")

    # Resolve providers
    assembly = await resolver.resolve_video_pipeline(
        access_token=access_token, client_id=client_id,
    )
    providers = assembly.llm_for("manim_gen")
    if not providers:
        print("No provider for manim_gen!")
        return

    from app.features.video.pipeline.engine.gpt_request import (
        LLMBridge,
        endpoint_from_provider,
    )

    ep = endpoint_from_provider(providers[0])
    print(f"\n=== Provider Endpoint ===")
    print(f"  base_url: {ep.base_url}")
    print(f"  model:    {ep.model_name}")
    print(f"  timeout:  {ep.timeout}")
    print(f"  path:     {ep.request_path}")

    # 调一次最小 LLM 请求
    bridge = LLMBridge()
    bridge.register_stage("manim_gen", ep)
    bridge.set_default(ep)

    api_fn = bridge.text_api("manim_gen")

    # 直接测 stream 解析
    from app.features.video.pipeline.engine.gpt_request import _call_stream_primary
    import httpx

    print(f"\n=== Direct stream test ===")
    headers = {
        "Authorization": f"Bearer {ep.api_key}",
        "Content-Type": "application/json",
        **ep.extra_headers,
    }
    with httpx.Client(base_url=ep.base_url, timeout=ep.timeout, headers=headers) as client:
        payload = {
            "model": ep.model_name,
            "messages": [{"role": "user", "content": "说一个字：好"}],
            "max_tokens": 50,
            "stream": True,
        }
        content, usage = _call_stream_primary(client, ep, payload)
        print(f"Stream content: {content!r}")
        print(f"Stream usage: {usage}")

    # 测 stream 长响应
    print(f"\n=== Stream long response test ===")
    long_msg = """用 Manim 写一个演示二次函数 y = ax^2 性质的动画。创建 MainScene 类，展示 a>0 和 a<0 两种情况。生成完整可运行 Python 代码。"""
    with httpx.Client(base_url=ep.base_url, timeout=ep.timeout, headers=headers) as client:
        payload2 = {
            "model": ep.model_name,
            "messages": [{"role": "user", "content": long_msg}],
            "max_tokens": 2000,
            "stream": True,
        }
        content2, usage2 = _call_stream_primary(client, ep, payload2)
        print(f"Stream content length: {len(content2) if content2 else 'None'}")
        print(f"Stream content first 200: {(content2 or 'None')[:200]}")
    print(f"Result type: {type(result)}")
    print(f"Result: {result}")

    if result is None:
        print("!!! RESULT IS NONE !!!")
    elif isinstance(result, tuple):
        completion, usage = result
        if completion is None:
            print("!!! COMPLETION IS NONE !!!")
            print(f"Usage: {usage}")
        else:
            print(f"Content: {completion.choices[0].message.content[:200] if completion.choices else 'NO CHOICES'}")
            print(f"Usage: {completion.usage}")
    else:
        # Shouldn't happen - text_api returns tuple
        print(f"Unexpected: {result}")


asyncio.run(main())
