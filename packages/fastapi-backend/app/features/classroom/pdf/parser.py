"""PDF text extraction using pypdf.

Ported from OpenMAIC's unpdf-based parser.
Returns empty string on malformed PDFs (never raises).
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PDFParseResult:
    text: str
    page_count: int


def parse_pdf_bytes(pdf_bytes: bytes) -> PDFParseResult:
    """Extract text from PDF bytes using pypdf.

    Never raises — returns empty text + 0 pages on any failure.
    """
    try:
        import pypdf
    except ImportError:
        logger.error("pypdf is not installed; install it with: pip install pypdf")
        return PDFParseResult(text="", page_count=0)

    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        page_count = len(reader.pages)
        pages_text: list[str] = []

        for page in reader.pages:
            try:
                text = page.extract_text()
                if text:
                    pages_text.append(text.strip())
            except Exception as exc:  # noqa: BLE001
                logger.debug("pdf.parser: page extraction error: %s", exc)

        full_text = "\n\n".join(pages_text)
        logger.info("pdf.parser: extracted %d chars from %d pages", len(full_text), page_count)
        return PDFParseResult(text=full_text, page_count=page_count)

    except Exception as exc:  # noqa: BLE001
        logger.warning("pdf.parser: failed to parse PDF: %s", exc)
        return PDFParseResult(text="", page_count=0)
