"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
from fastapi import FastAPI
import uvicorn
import Main
from pydantic import BaseModel
import tracemalloc
tracemalloc.start() # 启用 tracemalloc 模块来追踪对象分配的来源
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

class Task(BaseModel):
    task_id:str
    use_score:list = []
    result: list = []
    processing: list = []
    state:int = 2
    progress:list = []
    scenes:list
    user_id:str = ""
    config:dict
    messages:str = ""
    notify_url: str = ""
    token: str = ""
    code_json:dict = {
        'TTS': 'ByteTTS',
        'other_scene': '',  # 可选的其他父类
        'scenes': [],
        'background_color':'BLACK',
        'aspectRatio':'16:9',
        'other':'''
'''
    }

    
@app.post("/task")
async def addtask(T:Task):

    try:
        # 开始执行任务
        await Main.execute_task(T)

        return {'state':"ok"}
    
    except Exception as e:
        return {'state':"error"}

    
if __name__ == "__main__":
    uvicorn.run(app,host="0.0.0.0",port=2333, reload=False,loop="uvloop") 