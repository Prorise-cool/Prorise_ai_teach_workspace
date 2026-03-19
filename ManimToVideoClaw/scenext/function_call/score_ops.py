"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
import json
import os
import hmac
import hashlib
import time
import aiohttp
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)


async def upload_UpdateTask(task_id, params):
    # 将任务更新到数据库
    response = (
        supabase.table("tasks")
        .update(params)
        .eq("id", task_id)
        .execute()
    )

        
async def update_progress(task_id,progress):

    response = (
        supabase.table("tasks")
        .update({'progress':progress})
        .eq("id", task_id)
        .execute()
    )
    return response
  

# 上传视频生成日志到数据库
async def upload_video_log(task):
    response = (
        supabase.table("video_gen_log")
        .insert({
            "processing":task.processing,
            "state":task.state,
            "task_id":task.task_id,
            "user_id":task.user_id,
            "title":task.config.get("title",""),
            "manim_code":task.processing[-1].get("content","")
        })
        .execute()
    )
    return response

async def upload_scenes(task):
    response = (
        supabase.table("tasks")
        .update({
            "title":task.config.get("title",""),
            "scenes":task.scenes,
            "config":task.config
        })
        .eq("id", task.task_id)
        .execute()
    )
    return response

async def async_subscribemsg(task):
    status = {0:"FAILED",1:"COMPLETED",2:"IN_PROGRESS"}
    
    if task.notify_url != "":
        # 发送回调通知
        data = {
            "task_id": task.task_id,
            "status": status.get(task.state,'unknown'),
            "progress": task.progress,
            "result": task.result,
            "timestamp":int(time.time())
        }
        signature = generate_signature(data, task.token)
        headers = {
            'Content-Type': 'application/json',
            'X-Signature': signature
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(task.notify_url, json=data,headers=headers) as response:
            
                return response



def generate_signature(payload, api_key):
    """
    生成HMAC-SHA256签名
    :param payload: 要发送的数据
    :param api_key: 用于签名的API key
    :return: 十六进制签名
    """
    # 将payload转换为JSON字符串
    if isinstance(payload, dict):
        payload_str = json.dumps(payload, sort_keys=True)
    else:
        payload_str = str(payload)
    
    # 使用HMAC-SHA256生成签名
    signature = hmac.new(
        key=api_key.encode('utf-8'),
        msg=payload_str.encode('utf-8'),
        digestmod=hashlib.sha256
    ).hexdigest()
    
    return signature