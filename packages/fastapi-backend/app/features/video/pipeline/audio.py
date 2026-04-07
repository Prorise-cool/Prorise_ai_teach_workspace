"""视频流水线音频落地辅助函数。"""

from __future__ import annotations

import base64
import binascii
import wave
from pathlib import Path
from typing import Any, Mapping


def decode_audio_payload(metadata: Any) -> tuple[bytes, str] | None:
    if not isinstance(metadata, Mapping):
        return None

    audio_base64 = metadata.get("audioBase64") or metadata.get("audio_base64")
    if not isinstance(audio_base64, str) or not audio_base64.strip():
        return None

    audio_format = str(metadata.get("audioFormat") or metadata.get("audio_format") or "mp3").strip().lstrip(".")
    try:
        return base64.b64decode(audio_base64, validate=True), audio_format or "mp3"
    except (binascii.Error, ValueError):
        return None


def write_silent_wav(path: Path, *, duration_seconds: int, sample_rate: int) -> None:
    frame_count = max(int(duration_seconds * sample_rate), 1)
    chunk_size = max(sample_rate, 1)
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        remaining = frame_count
        silence_chunk = b"\x00\x00" * chunk_size
        while remaining > 0:
            current_chunk = min(remaining, chunk_size)
            if current_chunk == chunk_size:
                wav_file.writeframes(silence_chunk)
            else:
                wav_file.writeframes(b"\x00\x00" * current_chunk)
            remaining -= current_chunk
