"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
import traceback
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import aiohttp
import function
from fastapi import HTTPException, status, FastAPI,Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
import os 
import yaml
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()
# 加载配置文件
with open('config.yaml', 'r', encoding='utf-8') as file:
    url_config = yaml.safe_load(file)

# 连接数据库
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """用户认证，访问授权"""
    token = credentials.credentials
   
    try:
        # 验证访问权限与获取用户ID

        return {
            "user_id":"d988d4d9-72f0-4b76-97b0-ca974335dcf4",
            "token": token
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    

class Task(BaseModel):
    task_id:str
    question:str = ''
    answer:str = ""
    user_id:str = ""
    token:str = ""
    questionImages:list = []
    answerImages:list = []
    quality:str = 'm'
    notify_url: str = ""
    have_diagram: bool = False

 
@app.post("/generate-storyboard")
async def storyboard(T:Task,user = Depends(get_current_user)):
    try:
        T.user_id = user['user_id']
        T.token = user['token']
        # 首先看看能不能生成分镜
        c_res = await function.prompt_classify(T)
        T.have_diagram = c_res['type']
        # 无效的话结束
        if not c_res['prompt_type']:
            # 无效,直接发送走
            await gen_video(T,[],{},c_res['message'])
            return
        
        # 提取图片内容
        if T.questionImages:
            T.question = f"{await function.get_img_content(T.questionImages)}\n---\n{T.question}"
        if T.answerImages:
            T.answer = f"{await function.get_img_content(T.answerImages)}\n---\n{T.answer}"

        # 生成分镜，然后发送到api.scenext.cn/gen_video
        all_frame = []
        
        # 解答这题目，形成参考答案
        if T.answer=="":
            T.answer = await function.solve_problem(T)
        
        all_frame = await function.ai_storyboard(T)

        # 生成并发送默认视频配置
        default_config = await function.get_config(all_frame)
        default_config['quality'] = T.quality
        await gen_video(T,all_frame,default_config)
    except Exception as e:
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        traceback.print_exc()
        await gen_video(T,[],{},e)

async def gen_video(T:Task,all_frame,config,messages:str=""):
    url = url_config['api_endpoint']['scenext_url'] # 给到scenext模块
    data = {
        "scenes":all_frame,
        "config":config,
        "task_id":T.task_id,
        "messages":messages,
        "notify_url":T.notify_url,
        "user_id":T.user_id,
        "token":T.token
    }
    headers = {
        "x-fc-invocation-type": "Async", # 阿里云云函数异步任务提交
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {T.token}'
    }
    timeout = aiohttp.ClientTimeout(total=3600)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, json=data,headers=headers) as response:
            
            return response

@app.get("/")
async def root():
    return {"message": "分镜魔方API服务已启动"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=2333)