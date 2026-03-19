import aiohttp
import yaml
# 加载配置文件
with open('/SCENEXT/config.yaml', 'r', encoding='utf-8') as file:
    url_config = yaml.safe_load(file)

async def manimtovideo(task,code):
    url = url_config['api_endpoint']['manimtovideo_url']
    data = {
        "manim_code": code,
        "task_id": task.task_id,
        "user_id": task.user_id,
        "use_score":task.use_score,
        "task_content":task.config['title'],
        "quality":task.config['quality'],
        "dimension":task.config['dimension']
    }
    headers = {
        "x-fc-invocation-type": "Async",
        "x-fc-async-task-id": task.task_id
    }
    timeout = aiohttp.ClientTimeout(total=3600)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, json=data,headers=headers) as response:
            
            return response

async def delete_taskvideo_folder(task):
    url = url_config['api_endpoint']['deletetask_url']
    data = {
        "task_id": task.task_id,
        "user_id": task.user_id,
        "use_score":task.use_score,
        "task_content":task.config.get("title","")
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data) as response:
            response_text = await response.json()
            
            return response_text