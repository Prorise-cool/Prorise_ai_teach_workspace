from __future__ import annotations

import asyncio
import json

from app.features.video.pipeline.engine.render_failure import RenderFailureStore


class SyncRedisStub:
    def __init__(self) -> None:
        self.storage: dict[str, list[str]] = {}
        self.ttl: dict[str, int] = {}

    def rpush(self, key: str, value: str) -> int:
        bucket = self.storage.setdefault(key, [])
        bucket.append(value)
        return len(bucket)

    def ltrim(self, key: str, start: int, end: int) -> bool:
        bucket = self.storage.get(key, [])
        length = len(bucket)
        normalized_start = max(length + start, 0) if start < 0 else start
        normalized_end = length + end if end < 0 else end
        self.storage[key] = bucket[normalized_start : normalized_end + 1]
        return True

    def expire(self, key: str, seconds: int) -> bool:
        self.ttl[key] = seconds
        return True

    def lrange(self, key: str, start: int, end: int) -> list[str]:
        bucket = self.storage.get(key, [])
        length = len(bucket)
        normalized_start = max(length + start, 0) if start < 0 else start
        normalized_end = length + end if end < 0 else end
        return bucket[normalized_start : normalized_end + 1]


def test_render_failure_store_supports_sync_redis_client() -> None:
    redis_stub = SyncRedisStub()
    store = RenderFailureStore(redis_client=redis_stub)

    record = asyncio.run(
        store.record_failure(
            task_id="task-1",
            section_id="section-1",
            error_type="TypeError",
            sanitized_message="unexpected keyword argument 'buf'",
            code_snippet="obj.next_to(other, RIGHT, buf=0.2)",
            attempt=2,
        )
    )

    history = asyncio.run(store.get_failure_history("task-1", "section-1"))

    assert record.error_signature
    assert len(history) == 1
    assert history[0].sanitized_message == "unexpected keyword argument 'buf'"
    assert history[0].attempt == 2
    assert json.loads(redis_stub.storage["video:render_failure:task-1:section-1"][0])["section_id"] == "section-1"
    assert redis_stub.ttl["video:render_failure:task-1:section-1"] == 86400
