from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.schemas.common import build_error_envelope


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        *,
        retryable: bool = False,
        details: dict[str, object] | None = None
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retryable = retryable
        self.details = details or {}
        super().__init__(message)


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_envelope(
            code=exc.status_code,
            msg=exc.message,
            error_code=exc.code,
            retryable=exc.retryable,
            details=exc.details
        )
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
