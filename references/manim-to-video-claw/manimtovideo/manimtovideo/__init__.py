'''
Manim视频配音用的TTS服务

'''

from .bytetts import ByteTTS
from .baidutts import BaiduTTS
from .sparktts import SparkTTS
from .kokorotts import KokoroTTS

__all__ = ['ByteTTS','BaiduTTS','SparkTTS','KokoroTTS']