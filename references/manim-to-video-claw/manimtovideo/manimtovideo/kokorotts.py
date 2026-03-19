from manim_voiceover.services.base import SpeechService
import requests
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

class KokoroTTS(SpeechService):
   def __init__(self, voice,**kwargs):
       super().__init__(**kwargs)
       self.key = os.getenv("RUNPOD_API_KEY")
       self.voice_type = voice
       
   def generate_from_text(self, text, cache_dir=None, path=None):
       url = 'https://api.runpod.ai/v2/rt73ypcv0jdwl8/runsync'
       headers = {'Content-Type': 'application/json',"Authorization": f"Bearer {self.key}"}
       
       data = {
            "input": {
                "text": text,
                "voice": self.voice_type,
                "language": "zh",
                "speed": 1.0
            }
        }
       
       response = requests.post(url, headers=headers, json=data)
       response_json = response.json()
       
       import base64
       audio_data = base64.b64decode(response_json["output"]['audio_base64'])
       audio_path = f"{uuid.uuid4()}.mp3"
       
       with open(f"{self.cache_dir}/{audio_path}", "wb") as f:
           f.write(audio_data)
           
       return {
           "input_text": text,
           "input_data": {},
           "original_audio": audio_path
       }