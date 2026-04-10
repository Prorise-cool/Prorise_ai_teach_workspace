"""FFmpeg 视频合成服务。

负责为渲染视频叠加字幕并提取封面帧。
VoiceoverScene 渲染输出的视频已包含音轨，此服务不再处理音频合并与时长对齐。
"""

from __future__ import annotations

import asyncio
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from app.core.config import Settings
from app.features.video.pipeline._helpers import (
    SUBTITLE_FONT_NAME,
    SUBTITLE_FONT_SIZE,
    SUBTITLE_MAX_CHARS_PER_LINE,
    escape_ass_text,
    escape_ffmpeg_filter_path,
    format_srt_timestamp,
    is_fake_render_video,
    probe_media_duration_seconds,
    round_duration_seconds,
    split_subtitle_text,
)
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    ComposeResult,
    ExecutionResult,
    Storyboard,
    TTSResult,
    VideoStage,
)
from app.features.video.pipeline.runtime import VideoRuntimeStateStore


@dataclass(slots=True)
class SubtitleEntry:
    """单条字幕条目。"""

    start_seconds: float
    end_seconds: float
    text: str


@dataclass(slots=True)
class ComposeService:
    """FFmpeg 视频合成服务，负责字幕烧录和封面提取。

    VoiceoverScene 渲染输出已包含音轨，此服务仅叠加字幕并提取封面。
    """

    settings: Settings
    runtime: VideoRuntimeStateStore

    def build_subtitle_command(
        self,
        video_path: str,
        output_path: str,
        *,
        subtitle_path: str,
    ) -> list[str]:
        """构建字幕叠加 FFmpeg 命令（保留原始音轨）。"""
        return [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            "-vf",
            f"ass={escape_ffmpeg_filter_path(subtitle_path)}",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            output_path,
        ]

    def build_cover_command(self, video_path: str, cover_path: str) -> list[str]:
        """构建封面提取 FFmpeg 命令。"""
        return [
            "ffmpeg",
            "-y",
            "-ss",
            "1",
            "-i",
            video_path,
            "-frames:v",
            "1",
            "-q:v",
            "2",
            cover_path,
        ]

    def build_subtitle_entries(
        self,
        *,
        storyboard: Storyboard,
        scene_durations: Sequence[float],
        max_chars_per_line: int = SUBTITLE_MAX_CHARS_PER_LINE,
    ) -> list[SubtitleEntry]:
        """根据分镜和场景时长构建字幕条目列表。"""
        entries: list[SubtitleEntry] = []
        current_start = 0.0
        for index, scene in enumerate(storyboard.scenes):
            duration = scene_durations[index] if index < len(scene_durations) else float(scene.duration_hint)
            duration = max(duration, 0.1)
            scene_text = re.sub(r"\s+", " ", scene.voice_text or scene.narration).strip() or scene.title.strip() or f"场景 {index + 1}"
            segments = split_subtitle_text(scene_text, max_chars_per_line=max_chars_per_line) or [scene_text]
            segment_duration = duration / max(len(segments), 1)
            segment_start = current_start
            for segment_index, segment in enumerate(segments):
                segment_end = (
                    current_start + duration
                    if segment_index == len(segments) - 1
                    else segment_start + segment_duration
                )
                entries.append(
                    SubtitleEntry(
                        start_seconds=segment_start,
                        end_seconds=max(segment_end, segment_start + 0.1),
                        text=segment,
                    )
                )
                segment_start = segment_end
            current_start += duration
        return entries

    def write_srt(self, entries: Sequence[SubtitleEntry], output_path: Path) -> None:
        """将字幕条目写入 SRT 文件。"""
        lines: list[str] = []
        for index, entry in enumerate(entries, start=1):
            lines.extend(
                [
                    str(index),
                    f"{format_srt_timestamp(entry.start_seconds)} --> {format_srt_timestamp(entry.end_seconds)}",
                    entry.text,
                    "",
                ]
            )
        output_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")

    def write_ass_from_srt(
        self,
        *,
        srt_path: Path,
        ass_path: Path,
        font_name: str = SUBTITLE_FONT_NAME,
        font_size: int = SUBTITLE_FONT_SIZE,
    ) -> None:
        """将 SRT 字幕转换为 ASS 格式。"""
        content = srt_path.read_text(encoding="utf-8")
        pattern = re.compile(
            r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\Z)",
            re.MULTILINE,
        )
        ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,0,2,24,24,28,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        events: list[str] = []
        for _, start, end, text in pattern.findall(content):
            start_time = start.replace(",", ".")[:-1]
            end_time = end.replace(",", ".")[:-1]
            normalized_text = escape_ass_text(text.strip().replace("\n", r"\N"))
            events.append(f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{normalized_text}")
        ass_path.write_text(ass_header + "\n".join(events) + "\n", encoding="utf-8")

    def resolve_scene_durations(self, *, storyboard: Storyboard, tts_result: TTSResult) -> list[float]:
        """根据 TTS 音频实际时长解析场景时长列表。"""
        duration_by_scene: dict[str, float] = {}
        for segment in tts_result.audio_segments:
            duration_by_scene[segment.scene_id] = probe_media_duration_seconds(Path(segment.audio_path)) or float(segment.duration)

        return [
            max(duration_by_scene.get(scene.scene_id, float(scene.duration_hint)), 0.1)
            for scene in storyboard.scenes
        ]

    async def _run_ffmpeg(self, command: Sequence[str]) -> None:
        """异步执行 FFmpeg 命令。"""
        try:
            await asyncio.to_thread(
                subprocess.run,
                list(command),
                capture_output=True,
                text=True,
                timeout=self.settings.video_ffmpeg_timeout_seconds,
                check=True,
            )
        except Exception as exc:  # noqa: BLE001
            raise VideoPipelineError(
                stage=VideoStage.COMPOSE,
                error_code=VideoTaskErrorCode.VIDEO_COMPOSE_FAILED,
                message=str(exc),
            ) from exc

    async def execute(
        self,
        *,
        task_id: str,
        storyboard: Storyboard,
        render_result: ExecutionResult,
        tts_result: TTSResult,
    ) -> ComposeResult:
        """执行视频合成流程：字幕叠加 + 封面提取。

        VoiceoverScene 渲染输出已包含音轨，此处仅叠加字幕并提取封面。
        tts_result 仅用于计算字幕时间轴，不再用于音频拼接。
        """
        if render_result.output_path is None:
            raise VideoPipelineError(
                stage=VideoStage.COMPOSE,
                error_code=VideoTaskErrorCode.VIDEO_COMPOSE_FAILED,
                message="render output is missing",
            )

        temp_dir = Path(tempfile.mkdtemp(prefix=f"video_compose_{task_id}_"))
        output_path = temp_dir / "output.mp4"
        cover_path = temp_dir / "cover.jpg"
        subtitle_srt_path = temp_dir / "subtitles.srt"
        subtitle_ass_path = temp_dir / "subtitles.ass"
        source_video_path = Path(render_result.output_path)

        scene_durations = self.resolve_scene_durations(storyboard=storyboard, tts_result=tts_result)
        subtitle_entries = self.build_subtitle_entries(storyboard=storyboard, scene_durations=scene_durations)
        self.write_srt(subtitle_entries, subtitle_srt_path)
        self.write_ass_from_srt(srt_path=subtitle_srt_path, ass_path=subtitle_ass_path)

        output_duration_seconds = probe_media_duration_seconds(source_video_path) or max(sum(scene_durations), 1.0)
        if shutil.which("ffmpeg") and not is_fake_render_video(source_video_path):
            subtitle_command = self.build_subtitle_command(
                str(source_video_path),
                str(output_path),
                subtitle_path=str(subtitle_ass_path),
            )
            cover_command = self.build_cover_command(str(output_path), str(cover_path))
            await self._run_ffmpeg(subtitle_command)
            output_duration_seconds = probe_media_duration_seconds(output_path) or output_duration_seconds
            await self._run_ffmpeg(cover_command)
        else:
            output_path.write_bytes(b"COMPOSED_FAKE_MP4")
            cover_path.write_bytes(b"FAKE_COVER")

        self.runtime.save_value(
            "compose_subtitles",
            {
                "srtPath": str(subtitle_srt_path),
                "assPath": str(subtitle_ass_path),
            },
        )
        compose_result = ComposeResult(
            video_path=str(output_path),
            cover_path=str(cover_path),
            duration=round_duration_seconds(output_duration_seconds),
            file_size=output_path.stat().st_size,
        )
        self.runtime.save_model("compose_result", compose_result)
        return compose_result
