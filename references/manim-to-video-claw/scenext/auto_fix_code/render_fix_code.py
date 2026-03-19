"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
import textwrap
import aiohttp
from auto_fix_code import stat_check_fix
from assistants import AIModel
from code_render import render_scene_code_process
import yaml
# 加载配置文件
with open('/SCENEXT/config.yaml', 'r', encoding='utf-8') as file:
    url_config = yaml.safe_load(file)

async def get_last_frame(task,code,scene_id):
    '''
    return 最后一帧图片的base64
    '''
    url = url_config['api_endpoint']['getlastframeimg_url']
    data = {
        "manim_code": code,
        "task_id": task.task_id,
        "user_id": task.user_id,
        "use_score":task.use_score,
        "task_content":task.config['title'],
        "scene_id":scene_id,
        "dimension":task.config['dimension']
    }

    timeout = aiohttp.ClientTimeout(total=7200)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, json=data) as response:
            response_text = await response.json()
            return response_text

                
async def get_last_img_url(task,prev_code,current_code,scene_id):
    retry_num = 0 # 重试，且共6次机会
    retry_max = 6 # 最大重试次数
    model = AIModel(std_model_name='deepseek_r1')
    while retry_num<=retry_max:
        tmp_code_data = {
            "prev_code":prev_code,
            "current_code":textwrap.dedent(current_code),
            "other":'\n'
        }
        print(f"AI可编辑代码部分{current_code}")
        manim_code = render_scene_code_process(tmp_code_data)

        # 运行Manim代码
        print(f"生成的代码：{manim_code}")

        last_frame_res = await get_last_frame(task,manim_code,scene_id)
       
        # 执行成功是last_frame_res是success，失败的时候是报错信息
        if last_frame_res['status']=="success":
            img_url = last_frame_res['message']
            return img_url,current_code
        else:            
            error_msg = last_frame_res['message']
            print(error_msg)

            if retry_num < retry_max:
                # 正常添加报错消息到消息列表，只有第一次添加有所不同，返回修改意见，用deepseek_r1
                if retry_num==0:
                    # 第一次
                    suggest = await model.send_msg(prompt1(current_code,error_msg))
                else:
                    suggest = await model.send_msg(f"还是报错：{error_msg}")
                print(suggest)
                # 每次根据修改意见返回修改后的完整代码，用deepseekv3
                current_code = await apply_suggest(current_code,error_msg,suggest)
                retry_num += 1
                # 再检查一下AI修复的会不会出现参数问题
                current_code = await stat_check_fix(task,current_code)
            else:
                # 任务没完成，
                raise RuntimeError("修复代码最大次数任为修复成功，任务执行失败")
            
    raise RuntimeError("无法获取有效的图片URL，所有重试均失败")

async def apply_suggest(pre_code,error_msg,suggest):
    '''
    应用AI的修改意见，返回修改后的完整代码（提取）
    pre_code: 导致报错信息产生的直接代码
    suggest:该报错的修改意见
    return 应用修改意见后修复的代码
    '''
    model = AIModel(std_model_name='deepseek_v3')
    msg = [{
        "role":"user",
        "content":prompt1(pre_code,error_msg)
    },{
        "role":"assistant",
        "content":suggest
    }]
    prompt = '''请将你做的修改应用到代码片段中：并输出代码片段：
```python
{这里写修复后的完整代码片段，务必完整，不要省略！}
```
'''
    ai_res = await model.send_msg_custom_history(prompt,msg)

    new_code = model.extract_code(ai_res)
    res_code = extract_construct_method(new_code)
    if res_code:
        return res_code
    else:
        return new_code

def prompt1(manim_code,error_msg):
    '''
    合成第一次报错的请求提示词
    '''
    color_tip = ''
    if "NameError" in error_msg:
        color_tip = "设置的颜色若不存在，则使用十六进制颜色代码，且写到ManimColor类中,如ManimColor('#90B134')"
    prompt = f'''代码片段：{manim_code}
报错提示：{error_msg} 
哪一行代码出的问题，并检查其它地方是否有相同的问题
{color_tip}
元素标准添加方法就是self.add_elements()'''
    return prompt


def extract_construct_method(code):
    lines = code.split('\n')
    
    # 寻找 "def construct(self):" 所在行
    construct_line_idx = -1
    for i, line in enumerate(lines):
        if "def construct(self):" in line:
            construct_line_idx = i
            break
    
    if construct_line_idx == -1:
        return None
    
    # 确定方法的基本缩进级别
    base_indent = len(lines[construct_line_idx]) - len(lines[construct_line_idx].lstrip())
    method_indent = base_indent + 4  # Python 标准缩进为 4 个空格
    
    # 收集方法体内容
    method_body = []
    i = construct_line_idx + 1
    
    while i < len(lines):
        line = lines[i]
        # 空行直接添加
        if not line.strip():
            method_body.append("")
            i += 1
            continue
            
        current_indent = len(line) - len(line.lstrip())
        
        # 如果缩进小于等于基本缩进，说明方法结束
        if current_indent <= base_indent:
            break
            
        # 移除一级缩进
        dedented_line = line[method_indent:]
        method_body.append(dedented_line)
        i += 1
    
    return '\n'.join(method_body)


async def render_fix_main(task,prev_code,current_code,scene_id):

    img_url,current_code = await get_last_img_url(task,prev_code,current_code,scene_id)

    return current_code,img_url
