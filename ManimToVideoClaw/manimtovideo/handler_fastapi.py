"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
import traceback
from fastapi import FastAPI
import uvicorn
import cloudFunction
import function_call 
from icon import svg_img_main
from pydantic import BaseModel
import os
import shutil
import asyncio
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import tracemalloc
tracemalloc.start() # 启用 tracemalloc 模块来追踪对象分配的来源
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
load_dotenv()

app = FastAPI()

class Task(BaseModel):
    manim_code:str = ""
    task_id:str
    user_id:str
    use_score:list = []
    task_content:str
    scene_id:str = '0'
    quality:str = 'm'
    dimension: str = '2D'
# 执行器配置
print(f"CPU核心数量：{os.cpu_count()}")
process_pool = ProcessPoolExecutor(max_workers=os.cpu_count())  # CPU密集型
thread_pool = ThreadPoolExecutor(max_workers=32)  # I/O密集型

async def run_in_processpool(func, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(process_pool, func, *args)

async def run_in_threadpool(func, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(thread_pool, func, *args)

@app.post("/manimtovideo")
async def manimtovideo(T:Task):
    manim_code = T.manim_code
    try:
        # 先看看是否要添加SVG或IMG
        if "SVGMobject" in manim_code or "ImageMobject" in manim_code:
            # 准备需要的图标
            manim_code = await svg_img_main(manim_code)
   
        # 生成视频
        video_path = await run_in_processpool(function_call.CreateManimVideo, T.task_id, manim_code,T.quality)
        print(f"执行代码后返回内容{video_path}")
        
        if video_path.startswith("/ManimToVideo/function_call/Temp"):
            # 生成成功上传到阿里云OSS
            # 调用上传函数  
            aliyunfileUrl = await run_in_threadpool(
                cloudFunction.upload_filePath_to_aliyunOSS,
                video_path,
                f"Video/{T.user_id}/Manim{T.task_id}.mp4"
            )

            # 删除本地相关文件信息
            await delete_folder(T.task_id)
            print(aliyunfileUrl)
            # aliyunfileUrl以https://oss.scenext.cn开头

            # 任务执行成功提交处理
            updateParams = {
                "result":[{
                    "type":"video",
                    "content":aliyunfileUrl
                }],
                "state":1,
                "consumption":T.use_score,
                "finish_at": datetime.now(timezone.utc).isoformat()
            }
            video_path = aliyunfileUrl
        else:    
            # video_path为报错信息

            updateParams = {
                "result":[{
                    "type":"text",
                    "content":"任务执行失败，本次不消耗",
                }],
                "state":0,
                "consumption":T.use_score,
                "finish_at": datetime.now(timezone.utc).isoformat()
            }

        await function_call.upload_UpdateTask(T.task_id,updateParams)
        
        await function_call.update_video_log(T.task_id,updateParams['state'],video_path)
        return {"status":"ok"}
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"处理任务时出错:\n{error_trace}{e}")
       
        
        # 更新任务状态为失败
        error_params = {
            "result":[{
                "type":"text", 
                "content":f"任务执行失败，本次不消耗。"
            }],
            "state":0,
            "consumption":T.use_score,
            "finish_at": datetime.now(timezone.utc).isoformat()
        }
        
        await function_call.upload_UpdateTask(T.task_id, error_params)
        
        await function_call.update_video_log(T.task_id,error_params['state'],video_path)
       
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "message": str(e),
                "trace": error_trace
            }
        )
    

@app.post("/deletetask")
async def deletetask(T:Task):
    # 删除任务相关信息，如文件夹等
    try:
        await delete_folder(T.task_id)
        return {"status":"success"}
    except Exception as e:
        return {"status":"error","info":e}
        

async def delete_folder(id):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(current_dir,"function_call", "Temp", id)
    # 删除文件夹
    if os.path.exists(output_dir):
        await run_in_threadpool(shutil.rmtree, output_dir)

@app.post("/getlastframeimg")
async def getlastframeimg(T:Task):
    manim_code = T.manim_code
    try:
        # 先看看是否要添加SVG或IMG
        if "SVGMobject" in manim_code or "ImageMobject" in manim_code:
            # 准备需要的图标
            manim_code = await svg_img_main(manim_code)
        # 生成视频
        image_path = await run_in_processpool(function_call.CreateLastFrame, T.task_id, manim_code)
        print(f"执行代码后返回内容{image_path}")
        if image_path.startswith("/ManimToVideo/function_call/Temp"):
            # 将图片转为URL
            image_url = cloudFunction.upload_filePath_to_aliyunOSS(file_Path=image_path,cloud_path=f"frame_img/{T.user_id}/{T.task_id}/{T.scene_id}.png")
       
            await run_in_threadpool(os.remove, image_path) # 清除图像
            return JSONResponse(content={"status": "success", "message": image_url})
        else:    
            # image_path为报错信息 
            return JSONResponse(content={"status": "error", "message": image_path})

    except Exception as e:
        print("任务报错")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        traceback.print_exc()
        return JSONResponse(content={"status": "error", "message": f"ERROR:{e}"})


if __name__ == "__main__":
    uvicorn.run(app,host="0.0.0.0",port=2333, reload=False,loop="uvloop") 