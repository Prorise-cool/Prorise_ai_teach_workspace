from manim_voiceover.services.base import SpeechService
from aip import AipSpeech
import os
from dotenv import load_dotenv

load_dotenv()

class BaiduTTS(SpeechService):
    def __init__(self,**kwargs):
        super().__init__(**kwargs)
        app_id = os.getenv("BAIDU_TTS_APPID")
        api_key = os.getenv("BAIDU_TTS_APIKEY")
        secret_key = os.getenv("BAIDU_TTS_SECRETKEY")
        self.client = AipSpeech(app_id, api_key, secret_key)
        
    def generate_from_text(self, text, cache_dir=None, path=None):
        result = self.client.synthesis(text, 'zh', 1, {
            'vol': 5,
            'spd': 5,
            'pit': 5,
            'per': 4  # 度丫丫音色
        })
        
        if not isinstance(result, dict):
            audio_path = "output.mp3"
            with open(f"{self.cache_dir}/{audio_path}", "wb") as f:
                f.write(result)
                
            return {
                "input_text": text,
                "input_data": {},
                "original_audio": audio_path
            }