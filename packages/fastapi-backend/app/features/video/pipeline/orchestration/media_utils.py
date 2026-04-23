"""FFmpeg / FFprobe 工具函数集合（Wave 1.5 从 orchestrator.py 拆出）。

纯函数模块：封装编排器用到的所有 FFmpeg / FFprobe 调用——音频合并、
片段拼接、封面帧提取、媒体时长探测——统一在此维护，便于单独测试或替换
后端（如换用 python-ffmpeg 库）而不牵动主编排逻辑。

所有函数均不持有任何编排器状态；日志仍沿用本模块的 logger。
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path


logger = logging.getLogger(__name__)

SECTION_AUDIO_TAIL_HOLD_SECONDS = 0.35
"""section 视频末尾保留的静音尾帧时长（秒）。

音频长于视频时，在视频尾部 tpad 复制最后一帧若干秒，避免画面直接黑屏
但音频还在念——视觉上会显得更连贯。
"""


def compose_section_with_audio(
    video_path: Path,
    audio_path: Path | None,
    output_path: Path,
) -> Path:
    """合并单个 section 的视频和音频。如果没有音频，直接复制视频。"""
    if audio_path is None or not audio_path.exists():
        shutil.copy2(video_path, output_path)
        return output_path

    video_duration = probe_media_duration(video_path)
    audio_duration = probe_media_duration(audio_path)
    tail_padding = max(
        0.0,
        audio_duration - video_duration + SECTION_AUDIO_TAIL_HOLD_SECONDS,
    )

    if tail_padding > 0.05:
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-i",
            str(audio_path),
            "-filter_complex",
            f"[0:v]tpad=stop_mode=clone:stop_duration={tail_padding:.3f}[v]",
            "-map",
            "[v]",
            "-map",
            "1:a",
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-auto-alt-ref",
            "0",
            "-c:a",
            "libvorbis",
            "-shortest",
            str(output_path),
        ]
    else:
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-i",
            str(audio_path),
            "-c:v",
            "copy",
            "-c:a",
            "libvorbis",
            "-shortest",
            str(output_path),
        ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.warning(
            "FFmpeg libvorbis audio merge failed for %s; falling back to silent clip copy: %s",
            video_path.name,
            result.stderr[:200],
        )
        shutil.copy2(video_path, output_path)
    return output_path


def concat_videos(video_paths: list[Path], output_path: Path) -> Path:
    """FFmpeg concat demuxer 合并多个视频。"""
    list_file = output_path.parent / "concat_list.txt"
    list_file.write_text("\n".join(f"file '{p}'" for p in video_paths))

    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_file),
        "-c",
        "copy",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg concat failed: {result.stderr[:300]}")
    return output_path


def extract_cover(video_path: Path, cover_path: Path) -> Path:
    """从视频第 1 秒提取封面。"""
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-ss",
        "1",
        "-vframes",
        "1",
        str(cover_path),
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if not cover_path.exists():
        # fallback: create a placeholder
        cover_path.write_bytes(b"")
    return cover_path


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


def probe_duration(video_path: Path) -> int:
    """用 ffprobe 获取视频时长（秒），失败时回退到 60s。"""
    duration = probe_media_duration(video_path)
    if duration <= 0:
        return 60  # fallback
    return max(1, int(duration))
