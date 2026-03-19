import os
from supabase import create_client, Client
from dotenv import load_dotenv
load_dotenv()

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
    
# 上传视频生成日志到数据库
async def update_video_log(task_id,state,manim_res):

    response = (
        supabase.table("video_gen_log")
        .update({
            "state":state,
            "manim_res":manim_res
        })
        .eq("task_id", task_id)
        .execute()
    )
    return response


