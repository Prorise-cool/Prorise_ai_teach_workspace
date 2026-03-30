from collections.abc import Callable

ISO_8601_EXAMPLE = "2026-03-29T16:15:00Z"

SERVICE_HEALTH_EXAMPLE = {
    "code": 200,
    "msg": "ok",
    "data": {
        "status": "ok"
    }
}

ROOT_BOOTSTRAP_EXAMPLE = {
    "code": 200,
    "msg": "查询成功",
    "data": {
        "service": "Prorise AI Teach FastAPI Backend",
        "environment": "development",
        "status": "bootstrapped",
        "api_prefix": "/api/v1",
        "runtime_store": "redis-or-fallback",
        "architecture": "core-infra-providers-features-shared",
        "contract_version": "1.0.0",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }
}


def build_feature_bootstrap_example(feature: str) -> dict[str, object]:
    return {
        "code": 200,
        "msg": "查询成功",
        "data": {
            "feature": feature,
            "status": "scaffolded",
            "mode": "epic-0"
        }
    }


TASK_SNAPSHOT_SUCCESS_EXAMPLE = {
    "code": 200,
    "msg": "查询成功",
    "data": {
        "taskId": "video_20260329161500_ab12cd34",
        "taskType": "video",
        "status": "processing",
        "progress": 45,
        "message": "正在生成分镜与脚本",
        "timestamp": ISO_8601_EXAMPLE,
        "requestId": "req_20260329_processing",
        "errorCode": None
    }
}

TASK_LIST_SUCCESS_EXAMPLE = {
    "code": 200,
    "msg": "查询成功",
    "rows": [
        {
            "id": "video_20260329161500_ab12cd34",
            "title": "任务 video_20260329161500_ab12cd34",
            "taskId": "video_20260329161500_ab12cd34",
            "taskType": "video",
            "status": "processing",
            "progress": 45,
            "message": "正在生成分镜与脚本",
            "timestamp": ISO_8601_EXAMPLE,
            "requestId": "req_20260329_processing",
            "errorCode": None
        },
        {
            "id": "classroom_20260329162000_ef56gh78",
            "title": "任务 classroom_20260329162000_ef56gh78",
            "taskId": "classroom_20260329162000_ef56gh78",
            "taskType": "classroom",
            "status": "completed",
            "progress": 100,
            "message": "课堂任务执行完成",
            "timestamp": "2026-03-29T16:20:00Z",
            "requestId": "req_20260329_completed",
            "errorCode": None
        }
    ],
    "total": 2,
    "requestId": "req_20260329_list"
}


def build_error_example(
    *,
    code: int,
    msg: str,
    error_code: str,
    retryable: bool,
    request_id: str | None = None,
    task_id: str | None = None,
    details: dict[str, object] | None = None
) -> dict[str, object]:
    return {
        "code": code,
        "msg": msg,
        "data": {
            "error_code": error_code,
            "retryable": retryable,
            "request_id": request_id,
            "task_id": task_id,
            "details": details or {}
        }
    }


UNAUTHORIZED_ERROR_EXAMPLE = build_error_example(
    code=401,
    msg="当前会话已失效，请重新登录",
    error_code="COMMON_UNAUTHORIZED",
    retryable=False,
    details={"action": "reauth"}
)

FORBIDDEN_ERROR_EXAMPLE = build_error_example(
    code=403,
    msg="当前账号暂无访问权限",
    error_code="COMMON_FORBIDDEN",
    retryable=False,
    details={"required_permission": "video:task:read"}
)

CONFLICT_ERROR_EXAMPLE = build_error_example(
    code=409,
    msg="任务执行失败，请稍后重试",
    error_code="TASK_PROVIDER_TIMEOUT",
    retryable=True,
    request_id="req_20260329_conflict",
    task_id="video_20260329161500_ab12cd34",
    details={
        "task_id": "video_20260329161500_ab12cd34",
        "status": "failed"
    }
)

INTERNAL_ERROR_EXAMPLE = build_error_example(
    code=500,
    msg="服务内部异常",
    error_code="COMMON_INTERNAL_ERROR",
    retryable=True,
    request_id="req_20260329_demo",
    details={}
)


ERROR_RESPONSE_EXAMPLES: dict[int, dict[str, object]] = {
    401: UNAUTHORIZED_ERROR_EXAMPLE,
    403: FORBIDDEN_ERROR_EXAMPLE,
    409: CONFLICT_ERROR_EXAMPLE,
    500: INTERNAL_ERROR_EXAMPLE
}


def build_error_responses(example_builder: Callable[[int], dict[str, object]]) -> dict[int, dict[str, object]]:
    return {
        status_code: {
            "description": example["msg"],
            "content": {
                "application/json": {
                    "example": example_builder(status_code)
                }
            }
        }
        for status_code in (401, 403, 409, 500)
    }
