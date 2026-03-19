from manim_voiceover.services.base import SpeechService
import requests
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

class ByteTTS(SpeechService):
   def __init__(self, voice,platform:str="DOUBAO", **kwargs):
       super().__init__(**kwargs)
       self.appid = os.getenv(f"{platform}_VOICE_APPID")
       self.token = os.getenv(f"{platform}_VOICE_TOKEN")
       self.voice_type = voice
       
   def generate_from_text(self, text, cache_dir=None, path=None):
       url = "https://openspeech.bytedance.com/api/v1/tts"
       headers = {"Authorization": f"Bearer;{self.token}"}
       
       data = {
           "app": {
               "appid": self.appid,
               "token": self.token,
               "cluster": "volcano_tts"
           },
           "user": {
               "uid": str(uuid.uuid4())
           },
           "audio": {
               "voice_type": self.voice_type,
               "encoding": "mp3",
               "speed_ratio": 1.0
           },
           "request": {
               "reqid": str(uuid.uuid4()),
               "text": text,
               "operation": "query"
           }
       }
       
       response = requests.post(url, headers=headers, json=data)
       response_json = response.json()

       try:
            response.raise_for_status()  # 主动触发 HTTP 错误
       except requests.exceptions.HTTPError as e:
            print(f"TTS 服务HTTP错误: {e}")
       except requests.exceptions.JSONDecodeError:
            print("无效的JSON响应，原始内容:", response.text)
       
       if response_json["code"] != 3000:
           raise Exception(f"TTS Error: {response_json['message']}")
           
       import base64
       audio_data = base64.b64decode(response_json["data"])
       audio_path = f"{uuid.uuid4()}.mp3"
       
       with open(f"{self.cache_dir}/{audio_path}", "wb") as f:
           f.write(audio_data)
           
       return {
           "input_text": text,
           "input_data": {},
           "original_audio": audio_path
       }