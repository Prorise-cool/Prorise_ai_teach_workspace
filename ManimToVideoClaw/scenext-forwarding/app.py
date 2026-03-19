"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
from fastapi import FastAPI, HTTPException
import uvicorn
from pydantic import BaseModel
from fastapi import HTTPException, status, FastAPI,Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
import httpx
from fastapi.middleware.cors import CORSMiddleware
import yaml
import os
app = FastAPI()

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头信息
)
# 加载配置文件
with open('config.yaml', 'r', encoding='utf-8') as file:
    url_config = yaml.safe_load(file)

# 连接数据库
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
   
    try:
        # 验证访问权限与获取用户ID
        
        return {
            "user_id":"d988d4d9-72f0-4b76-97b0-ca974335dcf4", # 这里要获取实际的用户ID
            "token": token
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) 

class GenVideoData(BaseModel):
    question: str = ""
    questionImages: list = []
    answer: str = ""
    answerImages: list = []
    quality: str = 'm'
    notify_url: str = "" # 任务完成的回调地址

# 创建视频的api接口
@app.post("/api/gen_video")
async def api_gen_video(D: GenVideoData,user = Depends(get_current_user)):
    # 存入数据库，然后请求生成分镜的
    try:
        
        response = (
            supabase.table("tasks")
            .insert({
                "title": D.question,
                "state": 2,
                "progress": [],
                "user_id":user['user_id']
            })
            .execute()
        )

        task_id = response.data[0]['id']
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {user["token"]}',
            "x-fc-invocation-type": "Async",
            "x-fc-async-task-id": task_id
        }
        data_dict = {
            "question": D.question,
            "answer": D.answer,
            "questionImages": D.questionImages,
            "answerImages": D.answerImages,
            "quality": D.quality,
            "task_id": task_id,
            "notify_url": D.notify_url
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url_config['api_endpoint']['storyboard_url'], 
                headers=headers, 
                json=data_dict
            )
            
            # 处理响应
            if response.status_code == 202:
                return {
                    "status": "success",
                    "data":{
                        'task_id': task_id
                    }
                }
            else:
                print(f"API错误: {response.status_code} - {response.text}")
                return {
                    "status": "error",
                    "data":{
                        'messages': f'The video generation interface response is abnormal:{response.status_code} - {response.text}'
                    }
                }
    except Exception as e:
        return {
            "status": "error",
            "data":{
                "messages":f"Server error:{e}"
            }
        }

# 查询视频生成状态的api接口
@app.get("/api/get_status/{task_id}")
async def get_task_status(task_id,user = Depends(get_current_user)):
    try:
        # 获取任务状态
        response = (
            supabase.table("tasks")
            .select("*")
            .eq("id",task_id)
            .execute()
        )

        status = response.data[0]['state']
        if status==2:
            return {
                "status": "success",
                "data":{
                    "task_id": task_id,
                    "status": "IN_PROGRESS",
                    "progress": response.data[0]['progress']
                }
            }
        elif status==1:
            return {
                "status": "success",
                "data":{
                    "task_id": task_id,
                    "status": "COMPLETED",
                    "progress": response.data[0]['progress'],
                    "consumption": response.data[0]['consumption'],
                    "result": response.data[0]['result'],
                    "title": response.data[0]['title'],
                    "created_at": response.data[0]['created_at'],
                    "finish_at": response.data[0]['finish_at'],
                }
            }
        elif status==0:
            return {
                "status": "success",
                "data":{
                    "task_id": task_id,
                    "status": "FAILED",
                    "consumption": response.data[0]['consumption'],
                    "result": response.data[0]['result']
                }
            }
        return {
            "status": "error",
            "data":{
                "messages":f"An exception occurred while obtaining the task status({status})."
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "data":{
                "messages":f"Server error:{e}"
            }
        }


if __name__ == "__main__":
    
    uvicorn.run(app,host="0.0.0.0",port=2333, reload=False) 

