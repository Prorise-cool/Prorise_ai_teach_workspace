"""预加载 TTS 服务——在沙箱内读取预生成的本地音频文件。

此模块会被复制到 Docker 沙箱 workspace 中，供 VoiceoverScene 使用。
它不依赖任何外部 API 或网络连接，不使用 FORBIDDEN_IMPORTS 中的模块。
"""

from __future__ import annotations

from manim_voiceover.services.base import SpeechService


class PreloadedTTS(SpeechService):
    """从本地预生成音频文件读取，不调用外部 API。

    设计目的：
    - TTS 在沙箱外由动态 provider 系统完成（保留后台可配置能力）
    - 音频文件通过 workspace volume mount 挂载进沙箱
    - 本 SpeechService 仅读取本地文件，满足 --network none 安全约束
    """

    def __init__(self, audio_path: str, **kwargs) -> None:
        super().__init__(**kwargs)
        self.audio_path = audio_path

    def generate_from_text(
        self,
        text: str,
        cache_dir: str | None = None,
        path: str | None = None,
        **kwargs,
    ) -> dict:
        """返回预生成的音频文件路径，不执行任何合成。"""
        return {
            "input_text": text,
            "input_data": {},
            "original_audio": self.audio_path,
        }
