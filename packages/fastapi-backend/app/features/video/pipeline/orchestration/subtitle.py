"""字幕生成与烧录工具模块。

职责:
1. 从 section lecture_lines + media duration 生成 SRT 字幕文件
2. SRT 转 ASS 格式（支持更精细的样式控制）
3. FFmpeg 烧录字幕到视频帧
"""

from __future__ import annotations

import logging
import re
import subprocess
from datetime import timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── 默认字幕样式常量 ──────────────────────────────────────────────

DEFAULT_FONT_NAME = "Noto Sans CJK SC"
DEFAULT_FONT_SIZE = 52
DEFAULT_MAX_CHARS_PER_LINE = 20

# ASS 颜色: &H00BBGGRR (BGR, not RGB)
# 黄色 → R=FF G=FF B=00 → &H00FFFF
ASS_COLOR_YELLOW = "&H00FFFF"
ASS_OUTLINE_BLACK = "&H000000"


# ── 字幕文本切分 ──────────────────────────────────────────────────


def split_subtitle(
    text: str,
    max_chars_per_line: int = DEFAULT_MAX_CHARS_PER_LINE,
) -> list[str]:
    """将长文本按中文标点智能切分为字幕行。

    优先级: 句号/问号/感叹号 > 逗号/分号/冒号 > 硬断
    """
    if not text or not text.strip():
        return []

    text = text.strip()
    if len(text) <= max_chars_per_line:
        return [text]

    primary_puncts = ["。", "？", "！", "!", "；", "?"]
    secondary_puncts = ["，", "、", "：", ",", ";", ":"]

    segments: list[str] = []
    current = ""

    for char in text:
        current += char

        if len(current) < max_chars_per_line:
            continue

        # 在主要标点处切分
        last_primary = max(current.rfind(p) for p in primary_puncts)
        if last_primary > len(current) // 3:
            segments.append(current[: last_primary + 1])
            current = current[last_primary + 1 :]
            continue

        # 在次要标点处切分
        last_secondary = max(current.rfind(p) for p in secondary_puncts)
        if last_secondary > len(current) // 3:
            segments.append(current[: last_secondary + 1])
            current = current[last_secondary + 1 :]
            continue

        # 无标点，硬断
        segments.append(current)
        current = ""

    if current.strip():
        segments.append(current)

    return segments


# ── SRT 时间格式化 ───────────────────────────────────────────────


def _format_srt_time(seconds: float) -> str:
    """将秒数格式化为 SRT 时间 HH:MM:SS,mmm。"""
    td = timedelta(seconds=max(0.0, seconds))
    total_seconds = int(td.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    millis = int((td.total_seconds() - total_seconds) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


# ── SRT 生成 ─────────────────────────────────────────────────────


def generate_srt_from_sections(
    sections: list[dict[str, Any]],
    section_durations: dict[str, float],
    max_chars_per_line: int = DEFAULT_MAX_CHARS_PER_LINE,
) -> str:
    """从 section 列表生成 SRT 字幕内容。

    Args:
        sections: 每个 section 至少包含 "id" 和 "lecture_lines"。
        section_durations: section_id -> 视频时长（秒）。
        max_chars_per_line: 单行字幕最大字符数。

    Returns:
        SRT 格式字符串。
    """
    srt_entries: list[str] = []
    index = 1
    cursor = 0.0  # 全局时间游标（秒）

    for section in sections:
        section_id = section.get("id", "unknown")
        lines = section.get("lecture_lines", [])
        if not lines:
            duration = section_durations.get(section_id, 0.0)
            cursor += duration
            continue

        full_text = "".join(lines)
        segments = split_subtitle(full_text, max_chars_per_line)

        section_duration = section_durations.get(section_id, 0.0)
        if not segments or section_duration <= 0:
            cursor += section_duration
            continue

        # 按字符数比例分配时间
        total_chars = sum(len(s) for s in segments)
        seg_cursor = cursor

        for seg in segments:
            seg_duration = (
                (len(seg) / total_chars) * section_duration
                if total_chars > 0
                else section_duration / len(segments)
            )
            start = seg_cursor
            end = seg_cursor + seg_duration
            srt_entries.append(
                f"{index}\n{_format_srt_time(start)} --> {_format_srt_time(end)}\n{seg}"
            )
            index += 1
            seg_cursor = end

        cursor += section_duration

    return "\n\n".join(srt_entries)


# ── SRT → ASS 转换 ──────────────────────────────────────────────


def srt_to_ass(
    srt_content: str,
    ass_path: Path,
    font_name: str = DEFAULT_FONT_NAME,
    font_size: int = DEFAULT_FONT_SIZE,
) -> Path:
    """将 SRT 内容转换为 ASS 字幕文件。

    ASS 提供更精确的样式控制（描边、阴影、对齐方式等）。
    """
    ass_header = f"""\
[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{ASS_COLOR_YELLOW},&H00FFFFFF,{ASS_OUTLINE_BLACK},&H80000000,-1,0,0,0,100,100,0,0,1,2,0,2,10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    srt_pattern = re.compile(
        r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\Z)",
        re.MULTILINE,
    )
    matches = srt_pattern.findall(srt_content)

    events: list[str] = []
    for _, start, end, text in matches:
        # SRT 时间 HH:MM:SS,mmm → ASS 时间 H:MM:SS.cc
        start_ass = _srt_time_to_ass(start)
        end_ass = _srt_time_to_ass(end)
        clean_text = text.strip().replace("\n", "\\N")
        events.append(
            f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{clean_text}"
        )

    ass_path.write_text(ass_header + "\n".join(events) + "\n", encoding="utf-8")
    logger.info("ASS subtitle written: %s (%d events)", ass_path, len(events))
    return ass_path


def _srt_time_to_ass(srt_time: str) -> str:
    """SRT HH:MM:SS,mmm → ASS H:MM:SS.cc。"""
    parts = srt_time.replace(",", ":").split(":")
    h = int(parts[0])
    m = int(parts[1])
    s = int(parts[2])
    ms = int(parts[3])
    centisec = ms // 10
    return f"{h}:{m:02d}:{s:02d}.{centisec:02d}"


# ── FFmpeg 字幕烧录 ──────────────────────────────────────────────


def burn_subtitles(
    video_path: Path,
    subtitle_path: Path,
    output_path: Path,
) -> Path:
    """用 FFmpeg 将字幕烧录到视频帧中。

    支持 ASS 和 SRT 格式。对 WebM (VP9) 使用 libvpx-vp9 重编码。
    """
    ext = subtitle_path.suffix.lower()

    if ext == ".ass":
        vf_filter = f"ass={subtitle_path}"
    else:
        # SRT: 用 force_style 指定样式
        vf_filter = (
            f"subtitles={subtitle_path}"
            f":force_style='FontName={DEFAULT_FONT_NAME}"
            f",FontSize={DEFAULT_FONT_SIZE}"
            f",PrimaryColour=&H00FFFF"
            f",OutlineColour=&H000000"
            f",Outline=2"
            f",Alignment=2'"
        )

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-vf",
        vf_filter,
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        "-auto-alt-ref",
        "0",
        "-c:a",
        "copy",
        str(output_path),
    ]

    logger.info("Burning subtitles: %s → %s", subtitle_path.name, output_path.name)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

    if result.returncode != 0:
        logger.error(
            "FFmpeg subtitle burn failed: %s", result.stderr[:500]
        )
        raise RuntimeError(
            f"FFmpeg subtitle burn failed: {result.stderr[:300]}"
        )

    logger.info("Subtitle burn complete: %s", output_path)
    return output_path


# ── 探测媒体时长 ─────────────────────────────────────────────────


def probe_media_duration(media_path: Path) -> float:
    """用 ffprobe 获取媒体时长（秒）。"""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(media_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    try:
        return max(0.0, float(result.stdout.strip()))
    except (ValueError, AttributeError):
        return 0.0


# ── 一站式: 从 sections 生成字幕并烧录到视频 ─────────────────────


def generate_and_burn_subtitles(
    video_path: Path,
    sections: list[dict[str, Any]],
    section_clips: list[Path],
    output_dir: Path,
    max_chars_per_line: int = DEFAULT_MAX_CHARS_PER_LINE,
) -> Path:
    """从 section 数据生成字幕并烧录到最终视频。

    Args:
        video_path: 已拼接的最终视频。
        sections: section 列表（需要 "id" 和 "lecture_lines"）。
        section_clips: 与 sections 顺序对应的片段文件路径（用于探测时长）。
        output_dir: 中间文件输出目录。

    Returns:
        烧录字幕后的视频路径。如果无字幕内容则返回原视频路径。
    """
    # 探测每个 section 片段的实际时长
    section_durations: dict[str, float] = {}
    for section, clip_path in zip(sections, section_clips):
        section_durations[section.get("id", "unknown")] = probe_media_duration(
            clip_path
        )

    # 检查是否有任何字幕内容
    has_text = any(section.get("lecture_lines") for section in sections)
    if not has_text:
        logger.info("No subtitle text found, skipping subtitle burn")
        return video_path

    # 生成 SRT
    srt_content = generate_srt_from_sections(sections, section_durations, max_chars_per_line)
    if not srt_content.strip():
        logger.info("Empty SRT content, skipping subtitle burn")
        return video_path

    srt_path = output_dir / "subtitles.srt"
    srt_path.write_text(srt_content, encoding="utf-8")

    # 转换为 ASS 以获得更好的样式控制
    ass_path = output_dir / "subtitles.ass"
    srt_to_ass(srt_content, ass_path)

    # 烧录字幕
    output_path = output_dir / f"final_with_subtitles.{video_path.suffix.lstrip('.')}"
    return burn_subtitles(video_path, ass_path, output_path)
