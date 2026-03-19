"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
import textwrap
import traceback
from assistants import AIModel
from code_render import render_scene_code,render_scene_code_tmp,render_scene_code_process
import function_call
from auto_fix_code import ast_fix_code,stat_check_fix,render_fix_main
from datetime import datetime, timezone

async def execute_task(task):
  
    print("执行了函数execute_task")

    try:
        
        # 无分镜内容（说明分镜那里任务分类是分到无效的）
        if not task.scenes:
            task.processing += [{
                "type":"error",
                "content":task.messages
            }]
            # 任务执行失败
            task.state = 0 # 0代表失败
            task.result = [{
                "type":"text",
                "content":task.messages,
                "score": 0,
                "scoreDetail":task.messages
            }]
            await task_finish(task)
            return 

        # 上传一下分镜数据和全局配置这些
        await function_call.upload_scenes(task)

        # 创建写代码的agent
        gene_code_agent = AIModel(agent="code_agent")
        
        scenes = task.scenes
        print(scenes)
        
        if task.config['dimension']=="3D":
            # 只能是这两个的一个
            task.code_json['other_scene'] = "ThreeDScene"
        else:
            task.code_json['other_scene'] = "MovingCameraScene"
            
        task.code_json['background_color'] = f"ManimColor('{task.config['backgroundColor']}')"
        task.code_json['aspectRatio'] = task.config['aspectRatio']

        tmp_code_data = {
            "other_scene":task.code_json['other_scene'],
            "current_code_info":"",
            "background_color":task.code_json['background_color']
        }

        # 生成完整的current_code
        current_code = render_scene_code_tmp(tmp_code_data)
        print(f"初始current_code{current_code}")
        
        prev_show_code = render_scene_code_tmp(tmp_code_data)
      
        for scene in scenes:   
            
            tmp = {
                "voiceText":scene['voiceText'],
                "scene_code":"",
                "voiceRole":scene['voiceRole']
            }
            if scene['imageDesc']=="无":
                task.code_json['scenes'].append(tmp)
                task.progress += [{
                    'id':scene['id'],
                    'image':task.progress[-1]['image']
                }]
                continue

            # AI写代码
            opti = prompt_opti(task,scene['imageDesc'],prev_show_code) # 补充输出格式要求
            scene_code = await gene_code_agent.text_to_code(task,opti)
            scene_code = scene_code.replace("ShowCreation","Create")
            scene_code = textwrap.dedent(scene_code)
            print(f"新场景的代码：{scene_code}")
            # AI检查编译错误与类使用错误
            scene_code = await stat_check_fix(task,scene_code)
            
            scene_code = ast_fix_code(scene_code) # 给Text，MathTex等加上必要参数
           
            # 生成新场景的最后一帧图片，检查是否需要优化与修复新场景代码scene_code
            scene_code,img_url = await render_fix_main(task,current_code,scene_code,scene['id'])
            task.progress += [{
                'id':scene['id'],
                'image':img_url
            }]
            await function_call.update_progress(task.task_id,task.progress) # 更新任务进度
            scene_code = textwrap.dedent(scene_code)
            current_code = render_scene_code_process({"prev_code":current_code,"other":"\n","current_code":scene_code}) # 加上新场景的代码
            tmp['scene_code'] = scene_code
            # 给到最终的data_json
            task.code_json['scenes'].append(tmp)
            if scene==scenes[-1]:
                break # 最后一个子场景了，不需要更新current_code了
           
            tmp_code_data['current_code_info'] = scene_code
            prev_show_code = render_scene_code_tmp(tmp_code_data)

            gene_code_agent.clear_chat() # 清空上下文
           
    
        # 由jinja2生成完整代码
        manim_code = render_scene_code(task.code_json)

        # 提交去渲染成视频
        task.processing += [{
            "type":"manim_code",
            "content":manim_code
        }]
        await function_call.manimtovideo(task,manim_code)

        await function_call.upload_video_log(task) # 上传视频生成过程中的日志

        
    except Exception as e:
        task.processing += [{
            "type":"error",
            "content":e
        }]
        # 任务执行失败,且不扣积分
        await task_fail(task,"任务执行失败，不消耗积分")
        print("任务报错")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        traceback.print_exc()
        await task_finish(task)
 

def prompt_opti(task,scenes,current_code):
    '''
    '''

    opti_prompt = f'''你是Manim代码撰写专家，使用的Manim版本为最新社区版，你的任务是将视频场景描述转化成Manim代码。
---
## 技术要求
1. **数学公式**：
   - 仅使用MathTex类，不要使用Tex类
   - MathTex内的内容必须使用LaTeX语法
   
2. **视觉设置**：
   - 视频画面背景色为{task.code_json['background_color']}
   - 确保元素颜色设置与背景有足够对比度，保证可读性
   
3. **代码连续性**：
   - 在这个场景之前已有这些代码：
<current_code>
{current_code}

        # 只需输出这个场景需要的代码（不需要缩进），上面部分已有代码无需重复输出

</current_code>

## 要求
1. **元素大小**：
   - 长文本（超过15字）应分多行显示，避免超出屏幕边界；
   - Text对象必须设置font_size，最大不超过36，最小不低于28，根据文本的长度与层级选择大小
   - 不要定义类
2. **固定添加方式(最重要)**
   - 必须使用self.add_elements()将元素组添加到画面，其它self.paly()、self.add()等均不可！
   - 可以放到同一行的元素或者需要组合的元素就做成元素组VGroup/Group，然后再self.add_elements()
   - 元素组VGroup/Group内元素要做好布局控制，避免重叠
   - 坐标系上面的内容与坐标系必须放到一个VGroup/Group
---
需要制作的视频场景描述如下：<scene_desc>{scenes}</scene_desc>
不要按照视频场景描述中的布局要求，而是按照固定添加方式来！
---
# output
## 新场景的代码部分
```python
{{这里写接下来的新场景的代码部分（不需要缩进）}}
```'''
    print(opti_prompt)

    return opti_prompt


async def task_fail(task,fail_result):
    # 任务执行失败,且不扣积分
    task.state = 0 # 0代表失败
    task.result = [{
        "type":"text",
        "content":fail_result,
        "score": 0,
        "scoreDetail":"任务执行失败，不消耗积分"
    }]


async def task_finish(task):
    # 存入数据库，标记完成
    updateParams = {
        "result":task.result,
        "state":task.state,
        "consumption":task.use_score,
        "finish_at": datetime.now(timezone.utc).isoformat()
    }
    await function_call.delete_taskvideo_folder(task) # 删除该用户制作视频生成的文件夹
    await function_call.upload_UpdateTask(task.task_id,updateParams) # 更新的参数有返回的结果形式，任务状态，结果内容
    await function_call.async_subscribemsg(task)
    await function_call.upload_video_log(task) # 上传视频生成过程中的日志