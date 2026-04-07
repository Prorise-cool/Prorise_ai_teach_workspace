"""视频流水线内部共享工具函数。

本模块仅供 pipeline 子模块内部使用，不对外暴露。
包含 JSON/代码提取、文本处理、时间格式化、媒体探测等轻量辅助逻辑。
"""

from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable, Mapping

JSON_OBJECT_PATTERN = re.compile(r"\{.*\}", re.DOTALL)
CODE_BLOCK_PATTERN = re.compile(r"```(?:python)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)
FAKE_RENDER_BYTES = b"FAKE_MP4_DATA"
SUBTITLE_MAX_CHARS_PER_LINE = 20
SUBTITLE_FONT_NAME = "Source Han Sans CN"
SUBTITLE_FONT_SIZE = 24


def utc_now() -> datetime:
    """返回当前 UTC 时间。"""
    return datetime.now(UTC)


def first_non_empty(parts: Iterable[str | None], fallback: str) -> str:
    """从多个候选字符串中返回第一个非空值，否则返回 *fallback*。"""
    for part in parts:
        if part and part.strip():
            return part.strip()
    return fallback


def extract_json_object(raw_content: str) -> dict[str, Any] | None:
    """从原始文本中提取第一个 JSON 对象。"""
    matched = JSON_OBJECT_PATTERN.search(raw_content)
    if matched is None:
        return None
    try:
        payload = json.loads(matched.group(0))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def extract_code(raw_content: str) -> str | None:
    """从原始文本中提取代码块内容。"""
    matched = CODE_BLOCK_PATTERN.search(raw_content)
    if matched is not None:
        content = matched.group(1).strip()
        return content or None
    return raw_content.strip() or None


def unique_preserve_order(values: Iterable[str]) -> list[str]:
    """去重并保持原始顺序。"""
    results: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = value.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        results.append(normalized)
    return results


def read_text(*values: object) -> str | None:
    """返回第一个非空字符串值。"""
    for value in values:
        if isinstance(value, str):
            normalized = value.strip()
            if normalized:
                return normalized
    return None


def read_mapping_value(mapping: Mapping[str, Any], *keys: str) -> Any:
    """依次尝试多个 key 从映射中取出非 None 值。"""
    for key in keys:
        if key in mapping:
            value = mapping[key]
            if value is not None:
                return value
    return None


def provider_settings(provider: Any) -> Mapping[str, Any]:
    """提取 provider 的 settings 映射。"""
    config = getattr(provider, "config", None)
    settings = getattr(config, "settings", None)
    return settings if isinstance(settings, Mapping) else {}


def coerce_float(value: Any, default: float) -> float:
    """安全转换为 float，失败时返回 *default*。"""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def coerce_int(value: Any, default: int) -> int:
    """安全转换为 int，失败时返回 *default*。"""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def is_fake_render_video(path: Path) -> bool:
    """判断给定路径是否为伪造的渲染视频占位文件。"""
    try:
        if path.stat().st_size != len(FAKE_RENDER_BYTES):
            return False
        with path.open("rb") as file:
            return file.read(len(FAKE_RENDER_BYTES)) == FAKE_RENDER_BYTES
    except OSError:
        return False


def probe_media_duration_seconds(path: Path) -> float | None:
    """使用 ffprobe 探测媒体文件时长（秒）。"""
    if shutil.which("ffprobe") is None or not path.exists():
        return None

    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
    ]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=10, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    if completed.returncode != 0:
        return None
    try:
        duration = float(completed.stdout.strip())
    except ValueError:
        return None
    return duration if duration > 0 else None


def round_duration_seconds(duration_seconds: float) -> int:
    """将秒数向上取整，最小为 1。"""
    return max(int(math.ceil(duration_seconds)), 1)


def format_srt_timestamp(duration_seconds: float) -> str:
    """将秒数格式化为 SRT 时间戳 HH:MM:SS,mmm。"""
    total_milliseconds = max(int(round(duration_seconds * 1000)), 0)
    hours, remainder = divmod(total_milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, milliseconds = divmod(remainder, 1_000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"


def split_subtitle_text(text: str, *, max_chars_per_line: int) -> list[str]:
    """按标点和最大字符数拆分字幕文本。"""
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= max_chars_per_line:
        return [normalized] if normalized else []

    segments: list[str] = []
    current_segment = ""
    primary_punctuation = ["。", "？", "！", "!", "；", ";"]
    secondary_punctuation = ["，", "、", "：", ":", ",", " "]

    for char in normalized:
        current_segment += char
        if len(current_segment) < max_chars_per_line:
            continue

        latest_primary = max((current_segment.rfind(symbol) for symbol in primary_punctuation), default=-1)
        if latest_primary > max_chars_per_line // 2:
            segments.append(current_segment[: latest_primary + 1].strip())
            current_segment = current_segment[latest_primary + 1 :].strip()
            continue

        latest_secondary = max((current_segment.rfind(symbol) for symbol in secondary_punctuation), default=-1)
        if latest_secondary > max_chars_per_line // 2:
            segments.append(current_segment[: latest_secondary + 1].strip())
            current_segment = current_segment[latest_secondary + 1 :].strip()
            continue

        segments.append(current_segment.strip())
        current_segment = ""

    if current_segment:
        segments.append(current_segment.strip())
    return [segment for segment in segments if segment]


def escape_ass_text(text: str) -> str:
    """转义 ASS 字幕特殊字符。"""
    return text.replace("\\", r"\\").replace("{", r"\{").replace("}", r"\}")


def escape_ffmpeg_filter_path(path: str) -> str:
    """转义 FFmpeg filter 路径中的特殊字符。"""
    return (
        path.replace("\\", r"\\")
        .replace(":", r"\:")
        .replace(",", r"\,")
        .replace("'", r"\'")
    )


def split_sentences(text: str) -> list[str]:
    """按中文/英文句号等拆分句子。"""
    chunks = re.split(r"[。！？\n]+", text)
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def is_pipeline_temp_dir(path: Path) -> bool:
    """判断是否为流水线临时目录。"""
    return path.name.startswith(("video_", "video_tts_", "video_compose_"))


def cleanup_pipeline_temp_dirs(*file_paths: str | None) -> None:
    """清理流水线生成的临时目录。"""
    directories: set[Path] = set()
    for file_path in file_paths:
        if not file_path:
            continue
        directory = Path(file_path).expanduser().resolve().parent
        if is_pipeline_temp_dir(directory):
            directories.add(directory)

    for directory in sorted(directories, key=lambda item: len(str(item)), reverse=True):
        shutil.rmtree(directory, ignore_errors=True)


def infer_subject(text: str) -> str:
    """根据关键词推断学科。"""
    lowered = text.lower()
    if any(keyword in lowered for keyword in ("函数", "导数", "积分", "几何", "概率", "数学")):
        return "math"
    if any(keyword in lowered for keyword in ("物理", "速度", "力学", "电路")):
        return "physics"
    if any(keyword in lowered for keyword in ("化学", "离子", "方程式")):
        return "chemistry"
    return "general"


def infer_difficulty(text: str) -> str:
    """根据文本长度推断难度。"""
    if len(text) > 120:
        return "hard"
    if len(text) > 60:
        return "medium"
    return "easy"


def extract_source_text(source_payload: dict[str, object]) -> str:
    """从输入 payload 中提取题目文本。"""
    if isinstance(source_payload.get("text"), str):
        return source_payload["text"].strip()
    image_ref = source_payload.get("imageRef")
    ocr_text = source_payload.get("ocrText")
    return first_non_empty(
        [
            ocr_text if isinstance(ocr_text, str) else None,
            f"请解析图片题目：{image_ref}" if isinstance(image_ref, str) else None,
        ],
        fallback="请解析输入题目",
    )


def build_title(summary: str) -> str:
    """从摘要构建标题（最多 48 字符）。"""
    cleaned = re.sub(r"\s+", " ", summary).strip()
    return cleaned[:48] if len(cleaned) > 48 else cleaned


def serialize_datetime(value: datetime) -> str:
    """将 datetime 序列化为 ISO 格式字符串。"""
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


def result_storage_key(task_id: str) -> str:
    """生成结果存储键。"""
    from app.features.video.pipeline.constants import VIDEO_RESULT_DETAIL_TEMPLATE

    return VIDEO_RESULT_DETAIL_TEMPLATE.format(task_id=task_id)


def artifact_storage_key(task_id: str) -> str:
    """生成产物图谱存储键。"""
    from app.features.video.pipeline.constants import VIDEO_ARTIFACT_GRAPH_TEMPLATE

    return VIDEO_ARTIFACT_GRAPH_TEMPLATE.format(task_id=task_id)
