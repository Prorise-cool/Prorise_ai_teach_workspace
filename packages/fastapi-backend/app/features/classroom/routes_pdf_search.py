"""课堂 PDF 解析与 Web 搜索路由。

合并自原 ``app.features.openmaic.routes:parse_pdf`` 与 ``web_search``。
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.security import AccessContext, get_access_context
from app.features.classroom.pdf.parser import parse_pdf_bytes
from app.schemas.common import build_success_envelope

logger = logging.getLogger(__name__)

router = APIRouter()

_MAX_PDF_SIZE = 200 * 1024 * 1024  # 200 MB


@router.post("/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    access_context: AccessContext = Depends(get_access_context),  # noqa: ARG001
) -> JSONResponse:
    """解析上传的 PDF 文本。"""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )
    pdf_bytes = await file.read()
    if len(pdf_bytes) > _MAX_PDF_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF file exceeds 200 MB limit",
        )

    result = parse_pdf_bytes(pdf_bytes)
    return build_success_envelope(
        {"text": result.text, "pageCount": result.page_count},
        msg="操作成功",
    )


@router.post("/web-search")
async def web_search(
    request: Request,
    access_context: AccessContext = Depends(get_access_context),  # noqa: ARG001
) -> JSONResponse:
    """可选的 Tavily web search 包装。"""
    from app.features.classroom.search.tavily_client import web_search as _search

    body: dict[str, Any] = await request.json()
    query = str(body.get("query", "")).strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="query is required",
        )

    results = await _search(query=query, max_results=int(body.get("maxResults", 5)))
    return build_success_envelope(
        {
            "results": [
                {"title": r.title, "url": r.url, "content": r.content, "score": r.score}
                for r in results
            ]
        },
        msg="操作成功",
    )
