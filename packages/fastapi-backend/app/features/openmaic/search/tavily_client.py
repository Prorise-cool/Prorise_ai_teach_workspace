"""Tavily web search client — thin wrapper.

Returns empty list if TAVILY_API_KEY is not configured.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    title: str
    url: str
    content: str
    score: float = 0.0


async def web_search(query: str, max_results: int = 5) -> list[SearchResult]:
    """Perform a Tavily web search.

    Returns empty list if:
    - TAVILY_API_KEY env var is not set
    - tavily-python is not installed
    - Any network/API error occurs
    """
    api_key = os.environ.get("TAVILY_API_KEY", "").strip()
    if not api_key:
        logger.debug("search.tavily: TAVILY_API_KEY not configured, skipping search")
        return []

    try:
        from tavily import TavilyClient
    except ImportError:
        logger.debug("search.tavily: tavily-python not installed")
        return []

    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(query=query, max_results=max_results)
        results = response.get("results", [])
        return [
            SearchResult(
                title=r.get("title", ""),
                url=r.get("url", ""),
                content=r.get("content", ""),
                score=float(r.get("score", 0.0)),
            )
            for r in results
        ]
    except Exception as exc:  # noqa: BLE001
        logger.warning("search.tavily: search failed: %s", exc)
        return []


def format_search_results_for_prompt(results: list[SearchResult]) -> str:
    """Format search results as text for LLM prompts."""
    if not results:
        return "None"

    lines = []
    for i, r in enumerate(results, 1):
        lines.append(f"{i}. **{r.title}**")
        lines.append(f"   URL: {r.url}")
        if r.content:
            lines.append(f"   摘要: {r.content[:300]}")
        lines.append("")

    return "\n".join(lines)
