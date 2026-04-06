"""Story 3.4: 视频任务创建接口单元测试。

覆盖 AC 1-7:
- 请求校验
- task ID 生成
- 幂等处理
- Redis 运行态写入
- Dramatiq 消息分发
- 错误响应结构
- 契约一致性
"""

from __future__ import annotations

import json
import re
import time
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.features.video.schemas.video_task import (
    CreateVideoTaskRequest,
    CreateVideoTaskResponse,
    CreateVideoTaskResponseEnvelope,
    IdempotentConflictResponse,
    IdempotentConflictResponseEnvelope,
    VideoErrorCode,
    VideoInputType,
)
from app.features.video.services.create_task import (
    IDEMPOTENT_KEY_PREFIX,
    IDEMPOTENT_TTL_SECONDS,
    VIDEO_TASK_TYPE,
    _build_idempotent_key,
    _generate_video_task_id,
    check_idempotency,
    create_video_task,
    dispatch_to_dramatiq,
    init_task_runtime_state,
    save_idempotency,
)
from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.key_builder import build_task_runtime_key
from app.shared.task_framework.scheduler import TaskScheduler, TaskDispatchReceipt
from app.shared.task_framework.status import TaskStatus


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def memory_runtime_store() -> RuntimeStore:
    """创建内存运行态存储。"""
    return RuntimeStore(backend="memory-test", redis_url="redis://test")


@pytest.fixture
def mock_scheduler() -> MagicMock:
    """创建 mock 任务调度器。"""
    scheduler = MagicMock(spec=TaskScheduler)
    scheduler.enqueue_task.return_value = TaskDispatchReceipt(
        task_id="vtask_test",
        task_type="video",
        message_id="msg_test_123",
        status=TaskStatus.PENDING,
    )
    return scheduler


@pytest.fixture
def sample_request() -> CreateVideoTaskRequest:
    """创建示例请求。"""
    return CreateVideoTaskRequest(
        input_type=VideoInputType.TEXT,
        source_payload="什么是量子力学？请用简单的语言解释。",
        client_request_id="cr_test_001",
        user_profile={"level": "beginner", "language": "zh-CN"},
        summary="量子力学入门讲解",
    )


@pytest.fixture
def sample_image_request() -> CreateVideoTaskRequest:
    """创建图片输入示例请求。"""
    return CreateVideoTaskRequest(
        input_type=VideoInputType.IMAGE,
        source_payload="https://example.com/math-problem.png",
    )


# ---------------------------------------------------------------------------
# AC 1: 请求校验与 taskId 生成
# ---------------------------------------------------------------------------

class TestTaskIdGeneration:
    """task ID 生成测试。"""

    def test_task_id_format(self) -> None:
        """task ID 应遵循 vtask_<timestamp>_<short_uuid> 格式。"""
        task_id = _generate_video_task_id()
        assert task_id.startswith("vtask_")
        parts = task_id.split("_")
        assert len(parts) == 3
        # 时间戳部分为 14 位数字
        assert len(parts[1]) == 14
        assert parts[1].isdigit()
        # UUID 部分为 12 位十六进制
        assert len(parts[2]) == 12

    def test_task_id_uniqueness(self) -> None:
        """连续生成的 task ID 应唯一。"""
        ids = {_generate_video_task_id() for _ in range(100)}
        assert len(ids) == 100


class TestRequestValidation:
    """请求体校验测试。"""

    def test_valid_text_request(self, sample_request: CreateVideoTaskRequest) -> None:
        assert sample_request.input_type == VideoInputType.TEXT
        assert len(sample_request.source_payload) > 0

    def test_valid_image_request(self, sample_image_request: CreateVideoTaskRequest) -> None:
        assert sample_image_request.input_type == VideoInputType.IMAGE

    def test_empty_source_payload_rejected(self) -> None:
        with pytest.raises(Exception):
            CreateVideoTaskRequest(
                input_type=VideoInputType.TEXT,
                source_payload="",
            )

    def test_blank_source_payload_rejected(self) -> None:
        with pytest.raises(Exception):
            CreateVideoTaskRequest(
                input_type=VideoInputType.TEXT,
                source_payload="   ",
            )

    def test_client_request_id_optional(self) -> None:
        req = CreateVideoTaskRequest(
            input_type=VideoInputType.TEXT,
            source_payload="测试内容",
        )
        assert req.client_request_id is None

    def test_camel_case_serialization(self, sample_request: CreateVideoTaskRequest) -> None:
        """序列化应使用 camelCase。"""
        dumped = sample_request.model_dump(mode="json", by_alias=True)
        assert "inputType" in dumped
        assert "sourcePayload" in dumped
        assert "clientRequestId" in dumped
        assert "userProfile" in dumped


# ---------------------------------------------------------------------------
# AC 6: 幂等处理
# ---------------------------------------------------------------------------

class TestIdempotency:
    """clientRequestId 幂等处理测试。"""

    def test_no_conflict_when_no_key(self, memory_runtime_store: RuntimeStore) -> None:
        result = check_idempotency(memory_runtime_store, "cr_new_001")
        assert result is None

    def test_no_conflict_when_none(self, memory_runtime_store: RuntimeStore) -> None:
        result = check_idempotency(memory_runtime_store, None)
        assert result is None

    def test_conflict_when_key_exists(self, memory_runtime_store: RuntimeStore) -> None:
        now = datetime.now(UTC)
        save_idempotency(memory_runtime_store, "cr_dup_001", "vtask_123", now)

        result = check_idempotency(memory_runtime_store, "cr_dup_001")
        assert result is not None
        assert isinstance(result, IdempotentConflictResponse)
        assert result.task_id == "vtask_123"

    def test_save_idempotency_noop_when_none(self, memory_runtime_store: RuntimeStore) -> None:
        save_idempotency(memory_runtime_store, None, "vtask_123", datetime.now(UTC))
        # 不应写入任何 key
        assert memory_runtime_store.get_runtime_value(
            _build_idempotent_key("None")
        ) is None


# ---------------------------------------------------------------------------
# AC 3: Redis 运行态初始化
# ---------------------------------------------------------------------------

class TestRuntimeStateInit:
    """Redis 运行态初始化测试。"""

    def test_runtime_state_written(self, memory_runtime_store: RuntimeStore) -> None:
        task_id = "vtask_test_runtime"
        state = init_task_runtime_state(
            memory_runtime_store,
            task_id,
            request_id="req_123",
            user_id="user_456",
        )
        assert state["taskId"] == task_id
        assert state["taskType"] == "video"
        assert state["status"] == "pending"
        assert state["progress"] == 0

    def test_runtime_state_readable(self, memory_runtime_store: RuntimeStore) -> None:
        task_id = "vtask_test_read"
        init_task_runtime_state(memory_runtime_store, task_id)

        stored = memory_runtime_store.get_task_state(task_id)
        assert stored is not None
        assert stored["taskId"] == task_id


# ---------------------------------------------------------------------------
# AC 4: Dramatiq 任务分发
# ---------------------------------------------------------------------------

class TestDramatiqDispatch:
    """Dramatiq 消息分发测试。"""

    def test_dispatch_success(self, mock_scheduler: MagicMock) -> None:
        context = TaskContext(
            task_id="vtask_test_dispatch",
            task_type=VIDEO_TASK_TYPE,
            user_id="user_123",
        )
        request = CreateVideoTaskRequest(
            input_type=VideoInputType.TEXT,
            source_payload="测试内容",
        )

        message_id = dispatch_to_dramatiq(mock_scheduler, context, request)
        assert message_id == "msg_test_123"
        mock_scheduler.enqueue_task.assert_called_once()

    def test_dispatch_failure_raises_app_error(self) -> None:
        from app.core.errors import AppError

        scheduler = MagicMock(spec=TaskScheduler)
        scheduler.enqueue_task.side_effect = RuntimeError("broker down")

        context = TaskContext(
            task_id="vtask_test_fail",
            task_type=VIDEO_TASK_TYPE,
            user_id="user_123",
        )
        request = CreateVideoTaskRequest(
            input_type=VideoInputType.TEXT,
            source_payload="测试内容",
        )

        with pytest.raises(AppError) as exc_info:
            dispatch_to_dramatiq(scheduler, context, request)

        assert exc_info.value.status_code == 500
        assert exc_info.value.code == VideoErrorCode.VIDEO_DISPATCH_FAILED


# ---------------------------------------------------------------------------
# AC 1-7: 创建全链路集成测试
# ---------------------------------------------------------------------------

class TestCreateVideoTaskFlow:
    """创建全链路测试。"""

    @pytest.mark.asyncio
    async def test_create_text_task_success(
        self,
        memory_runtime_store: RuntimeStore,
        mock_scheduler: MagicMock,
        sample_request: CreateVideoTaskRequest,
    ) -> None:
        """AC 1: 正常文本输入创建返回 202 payload。"""
        with patch(
            "app.features.video.services.create_task.persist_ruoyi_metadata",
            new_callable=AsyncMock,
            return_value=True,
        ):
            result = await create_video_task(
                sample_request,
                user_id="user_001",
                request_id="req_001",
                runtime_store=memory_runtime_store,
                scheduler=mock_scheduler,
            )

        assert isinstance(result, CreateVideoTaskResponse)
        assert result.task_id.startswith("vtask_")
        assert result.task_type == "video"
        assert result.status == "pending"
        assert result.created_at is not None

    @pytest.mark.asyncio
    async def test_create_image_task_success(
        self,
        memory_runtime_store: RuntimeStore,
        mock_scheduler: MagicMock,
        sample_image_request: CreateVideoTaskRequest,
    ) -> None:
        """AC 1: 正常图片输入创建返回 202 payload。"""
        with patch(
            "app.features.video.services.create_task.persist_ruoyi_metadata",
            new_callable=AsyncMock,
            return_value=True,
        ):
            result = await create_video_task(
                sample_image_request,
                user_id="user_002",
                request_id="req_002",
                runtime_store=memory_runtime_store,
                scheduler=mock_scheduler,
            )

        assert isinstance(result, CreateVideoTaskResponse)
        assert result.task_type == "video"

    @pytest.mark.asyncio
    async def test_idempotent_conflict(
        self,
        memory_runtime_store: RuntimeStore,
        mock_scheduler: MagicMock,
        sample_request: CreateVideoTaskRequest,
    ) -> None:
        """AC 6: 同一 clientRequestId 重复提交返回 409 已有 taskId。"""
        with patch(
            "app.features.video.services.create_task.persist_ruoyi_metadata",
            new_callable=AsyncMock,
            return_value=True,
        ):
            # 第一次创建
            result1 = await create_video_task(
                sample_request,
                user_id="user_003",
                request_id="req_003",
                runtime_store=memory_runtime_store,
                scheduler=mock_scheduler,
            )
            assert isinstance(result1, CreateVideoTaskResponse)

            # 第二次重复提交
            result2 = await create_video_task(
                sample_request,
                user_id="user_003",
                request_id="req_004",
                runtime_store=memory_runtime_store,
                scheduler=mock_scheduler,
            )

        assert isinstance(result2, IdempotentConflictResponse)
        assert result2.task_id == result1.task_id

    @pytest.mark.asyncio
    async def test_redis_runtime_written_after_create(
        self,
        memory_runtime_store: RuntimeStore,
        mock_scheduler: MagicMock,
    ) -> None:
        """AC 3: 创建后 Redis 运行态 key 已正确写入。"""
        request = CreateVideoTaskRequest(
            input_type=VideoInputType.TEXT,
            source_payload="Redis 运行态测试",
        )

        with patch(
            "app.features.video.services.create_task.persist_ruoyi_metadata",
            new_callable=AsyncMock,
            return_value=True,
        ):
            result = await create_video_task(
                request,
                user_id="user_004",
                request_id="req_005",
                runtime_store=memory_runtime_store,
                scheduler=mock_scheduler,
            )

        assert isinstance(result, CreateVideoTaskResponse)
        state = memory_runtime_store.get_task_state(result.task_id)
        assert state is not None
        assert state["taskId"] == result.task_id
        assert state["taskType"] == "video"
        assert state["status"] == "pending"
        assert state["progress"] == 0

    @pytest.mark.asyncio
    async def test_dramatiq_message_enqueued(
        self,
        memory_runtime_store: RuntimeStore,
        mock_scheduler: MagicMock,
    ) -> None:
        """AC 4: Dramatiq 消息已正确入队。"""
        request = CreateVideoTaskRequest(
            input_type=VideoInputType.TEXT,
            source_payload="Dramatiq 分发测试",
        )

        with patch(
            "app.features.video.services.create_task.persist_ruoyi_metadata",
            new_callable=AsyncMock,
            return_value=True,
        ):
            await create_video_task(
                request,
                user_id="user_005",
                request_id="req_006",
                runtime_store=memory_runtime_store,
                scheduler=mock_scheduler,
            )

        mock_scheduler.enqueue_task.assert_called_once()
        call_kwargs = mock_scheduler.enqueue_task.call_args
        assert call_kwargs.kwargs["task_type"] == "video"

    @pytest.mark.asyncio
    async def test_ruoyi_degradation_does_not_block(
        self,
        memory_runtime_store: RuntimeStore,
        mock_scheduler: MagicMock,
    ) -> None:
        """AC 2: RuoYi 写入降级场景下任务仍可正常创建。"""
        request = CreateVideoTaskRequest(
            input_type=VideoInputType.TEXT,
            source_payload="RuoYi 降级测试",
        )

        with patch(
            "app.features.video.services.create_task.persist_ruoyi_metadata",
            new_callable=AsyncMock,
            return_value=False,  # 模拟降级
        ):
            result = await create_video_task(
                request,
                user_id="user_006",
                request_id="req_007",
                runtime_store=memory_runtime_store,
                scheduler=mock_scheduler,
            )

        assert isinstance(result, CreateVideoTaskResponse)
        assert result.task_id.startswith("vtask_")


# ---------------------------------------------------------------------------
# AC 5: 响应结构一致性
# ---------------------------------------------------------------------------

class TestResponseStructure:
    """统一响应结构测试。"""

    def test_success_envelope_structure(self) -> None:
        """202 响应遵循 {code, msg, data} 结构。"""
        response = CreateVideoTaskResponse(
            task_id="vtask_test",
            created_at=datetime.now(UTC),
        )
        envelope = CreateVideoTaskResponseEnvelope(data=response)
        dumped = envelope.model_dump(mode="json", by_alias=True)

        assert dumped["code"] == 202
        assert "msg" in dumped
        assert "data" in dumped
        assert dumped["data"]["taskId"] == "vtask_test"
        assert dumped["data"]["taskType"] == "video"
        assert dumped["data"]["status"] == "pending"

    def test_conflict_envelope_structure(self) -> None:
        """409 响应遵循 {code, msg, data} 结构。"""
        conflict = IdempotentConflictResponse(
            task_id="vtask_existing",
            status="pending",
        )
        envelope = IdempotentConflictResponseEnvelope(data=conflict)
        dumped = envelope.model_dump(mode="json", by_alias=True)

        assert dumped["code"] == 409
        assert "msg" in dumped
        assert dumped["data"]["taskId"] == "vtask_existing"


# ---------------------------------------------------------------------------
# 契约一致性测试
# ---------------------------------------------------------------------------

class TestContractAlignment:
    """契约文件对齐测试。"""

    def test_response_matches_contract_fields(self) -> None:
        """响应字段应与 create-task-response.schema.json 对齐。"""
        response = CreateVideoTaskResponse(
            task_id="vtask_20260406120000_abc123def456",
            created_at=datetime(2026, 4, 6, 12, 0, 0, tzinfo=UTC),
        )
        dumped = response.model_dump(mode="json", by_alias=True)

        # 契约要求的必选字段
        assert "taskId" in dumped
        assert "taskType" in dumped
        assert "status" in dumped
        assert "createdAt" in dumped

        # 值约束
        assert dumped["taskId"].startswith("vtask_")
        assert dumped["taskType"] == "video"
        assert dumped["status"] == "pending"

    def test_request_matches_contract_fields(self) -> None:
        """请求字段应与 create-task-request.schema.json 对齐。"""
        request = CreateVideoTaskRequest(
            input_type=VideoInputType.TEXT,
            source_payload="测试",
        )
        dumped = request.model_dump(mode="json", by_alias=True)

        # 契约要求的必选字段
        assert "inputType" in dumped
        assert "sourcePayload" in dumped

        # 可选字段
        assert "clientRequestId" in dumped
        assert "userProfile" in dumped
