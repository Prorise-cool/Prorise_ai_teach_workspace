"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
# 相关生成分镜的AI
'''
先进行分类，看看是否可以制作Manim视频，若可以则说明视频风格什么样的最好，若不可以则说明原因
然后将风格和要求给到AI，进行循环式询问生成，一次输出一个分镜
'''
from .models import AIModel
import re

async def prompt_classify(T):

    model = AIModel(std_model_name="doubao")
    prompt = f'''prompt:{T.question}
---
# 任务
1. 判断prompt是否可以用Manim来制作视频讲解,若可以则说明prompt有效
2. 若无效则说明原因
# 输出格式(JSON):
{{
    "prompt_type": bool, # prompt是否有效，有效为True，无效为False
    "message": str, # 若无效则说明原因，若有效则填写"有效"
    "type":bool # 是否能看到题目中有图形，若能填Ture,否则填False
}}
'''
    ai_res = await model.send_msg_vl(prompt,T.questionImages)
    res = await model.trans_json(ai_res)
    
    return res

async def solve_problem(T):

    user_task = f'''
题目：{T.question}
---
注意：回答格式模板如下：
**解题思路**
{{此题考查的知识点，解题思路等}}
**答案**
{{请逐步推理，并将您的最终答案放在 \\boxed{{}} 中}}
tips:内容使用排版清晰的markdown语言，公式使用latex语言；
请解答:
    '''

    if T.have_diagram:
        solve_problem_model = AIModel(std_model_name="doubao")
        solve_res = await solve_problem_model.send_msg_vl(user_task,T.questionImages)
    else:
        solve_problem_model = AIModel(agent="solve_agent")
        solve_res = await solve_problem_model.send_msg_custom_history(user_task)

    return solve_res


async def ai_storyboard(T):
    
    extract_system_prompt = '''你的任务是将讲解文字与视频描述提取出来，并优化整理讲解文字，用如下格式返回：
- 完整的提取出讲解文字，并进行口语化优化整理(如数学符号、latex公式均需谐音文字化)，用<voiceover></voiceover>包裹
- 提取的视频描述用<scene></scene>包裹'''

    teacher_system_prompt = f'''你是一位资深教师，拥有丰富的教学经验。你的任务是向学生讲解给定的题目，以互动的方式进行教学。

---
# 给定题目为：{T.question}
# 参考答案：{T.answer}
---

## 角色与互动要求
作为真实的老师，你需要：
1. 每次只输出一个教学步骤，然后等待学生回应
2. 根据学生的回应调整下一步讲解
3. 回复中必须包含对话内容和视频描述两部分

## 教学流程（固定）
1. **展示题目**：在视频描述中重述题目内容，再口头重述题目内容，必要时画图辅助理解
2. **分析考点**：分析题目考察的关键知识点和解题思路
3. **步骤解析**：一步步板书讲解解题过程
4. **总结归纳**：总结解题要点和知识点

## 输出格式
每次回复包含两部分：
1. **对话内容**：使用简洁明了的口语化表达，将数学符号转换为口语（如"x²"读作"x的平方"、"<"读作"小于"）,禁止用latex
2. **视频描述**：以`[视频描述]`标记
   - 场景内容：就说显示什么内容就好，不要指定显示在什么上下左右的位置！涉及公式用latex

## 特别说明
- 视频描述内容要求使用Manim能实现的
- 公式使用LaTeX语言在视频中呈现
- 视频内容应与问题匹配，提问时不展示答案
- 当学生完全掌握内容时，以结束语作为课程的终点
- 视频描述中需要完整的描述出要显示的文本内容是什么，比如第一次显示题目要完整写出题目文本内容
- 不使用括号表达动作与情绪
'''
    # 你只会提问等待老师来解答
    student_system_prompt = f'''你是一位好奇且积极参与的学生，正在询问老师这题:{T.question}。你的目标是通过与老师的互动来理解题目，并展现真实学生的表现。

## 核心特性：
1. **真实的学习过程**：
   - 在老师指导下，展现渐进式的理解过程
   - 经常会犯常见错误
2. **互动参与**：
   - 回应老师的引导和问题
   - 主动提出疑惑和不理解的地方
   - 表达"啊哈"时刻，当突然理解某个概念
3. **知识水平**：
   - 知识水平与问题难度一致
   - 大部分步骤不能自己推出来

## 互动反馈
你应该配合老师的教学步骤，在老师引导后提供适当的反馈：
1. **回应引导问题**：认真思考并回应老师的提问,但经常答错
2. **表达理解程度**：清晰表达你的困惑
3. **终止标志**：只有老师说了课程结束并且你没有其它疑问了，才能说"老师再见"的结束语！

## 互动风格指南：
- **自然对话**：使用简洁明了的口语化表达，将数学符号转换为口语（如"x²"读作"x的平方"、"<"读作"小于"）,禁止用latex
- **构建性错误（重要）**：有时犯错，但这些错误应该是有教育意义的
- **不使用括号表达动作与情绪**
- 你无法使用黑板
- 不要自问自答
'''
    if T.have_diagram:
        teacher_model = AIModel(std_model_name="doubao",system_prompt=teacher_system_prompt)
    else:
        teacher_model = AIModel(std_model_name="deepseek_v3",system_prompt=teacher_system_prompt)
    student_model = AIModel(agent="student_agent",system_prompt=student_system_prompt)
    extract_model = AIModel(std_model_name="deepseek_v3",system_prompt=extract_system_prompt) 
    
    count = 1
    # 点燃话题
    stu_res = f"老师您好，{T.question}"
    all_frame = []
    finish = False
    # 直到学生学明白了就停止
    while not finish:
        scene = {} # 存储子场景信息 

        # 获取老师回复
        if count==1 and T.have_diagram:
            tchr_origin_res = await teacher_model.send_msg_vl(stu_res,T.questionImages)
        else:
            tchr_origin_res = await teacher_model.send_msg(stu_res)
        tchr_origin_res = tchr_origin_res.replace("{", "\\{").replace("}", "\\}")
        # 提取出老师的讲解文字
        extract_res = await extract_model.send_msg_custom_history(tchr_origin_res) # 不保存上下文 
        
        tchr_res = re.findall(r'<voiceover>(.*?)</voiceover>', extract_res,re.DOTALL)[-1]
        tchr_res = tchr_res.replace("'''","\\'''")
        tchr_res = tchr_res.replace('\n', '')
        tchr_res = tchr_res.replace('<', '小于')
        tchr_res = tchr_res.replace('>', '大于')
        scene['id'] = f"frame{count}"
        scene['voiceText'] = tchr_res
        scene['imageDesc'] = re.findall(r'<scene>(.*?)</scene>', extract_res,re.DOTALL)[-1]
        scene['voiceRole'] = "zh_male_M392_conversation_wvae_bigtts"
        all_frame.append(scene)
        count += 1

        # 获取学生的回复
        stu_res = await student_model.send_msg(f"{tchr_res}\n黑板上的内容：{scene['imageDesc'] }")
        
        
        # 若对话大于50轮直接中止
        stu_res_fix = stu_res
        if count>80 or "老师再见" in stu_res:
            finish = True
        stu_res_fix = stu_res_fix.replace("'''","\\'''")
        stu_res_fix = stu_res_fix.replace('\n', '') 
        stu_res_fix = stu_res_fix.replace('<', '小于') 
        stu_res_fix = stu_res_fix.replace('>', '大于') 
        scene = {}
        scene['id'] = f"frame{count}"
        scene['voiceText'] = stu_res_fix
        scene['imageDesc'] = "无"
        scene['voiceRole'] = "zh_female_linjianvhai_moon_bigtts"
        all_frame.append(scene)

        count += 1

    return all_frame


# 获取全局配置相关内容
async def get_config(all_frame):
    prompt = f'''
要制作的Manim视频分镜信息如下：{all_frame}
请用JSON输出视频配置信息，如下格式：
{{
    "title": "",  # 视频标题
    "backgroundColor": "",  # 视频背景色，默认#000000
    "aspectRatio": "",  # 宽屏比例 默认16:9
    "dimension": ""  # 2D 或 3D ，默认2D
}}
'''
    model = AIModel(std_model_name="deepseek_v3")
    ai_res = await model.send_msg(prompt)
    config = await model.trans_json(ai_res)
    return config


async def get_img_content(imgs):
    if len(imgs)>5:
        imgs = imgs[:5]
    # 提取图片里面的内容
    vl_model  = AIModel(std_model_name="visual_model")
    content = await vl_model.send_msg_vl("提取图片中的题目内容,涉及公式用latex表示",imgs)
    print(content)
    return content