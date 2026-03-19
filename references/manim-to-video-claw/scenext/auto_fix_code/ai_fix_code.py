"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
from assistants import AIModel

async def ai_fix_code(manim_code,error_msg,model_name):
    '''
    修复报错的Manim代码,先查相关文档，根据文档指导来修复
    '''

    color_tip = ''
    if "NameError" in error_msg:
        color_tip = "设置的颜色若不存在，则使用十六进制颜色代码，且写到ManimColor类中,如ManimColor('#90B134')"
    model = AIModel(std_model_name=model_name)
    prompt1 = f'''代码片段：{manim_code}
报错提示：{error_msg} 
哪一行代码出的问题，并检查其它地方是否有相同的问题;
{color_tip}
注：已导入这些库from manim import *
import numpy as np
import math
元素添加方法就是self.add_elements()'''
    ai_res1 = await model.send_msg(prompt1) 
    print(f"AI找到的出错的问题行{ai_res1}")
    prompt2 = f'''请将你做的修改应用到代码片段中：并输出代码片段：
```python
{{这里写修复后的完整代码片段，务必完整，不要省略！}}
```
'''    
    model.std_model_name = "deepseek_v3"
    model.refresh_model_config()
    ai_response = await model.send_msg(prompt2) 
    print(f"修复后的完整代码：{ai_response}")
    new_code = model.extract_code(ai_response)
    res_code = extract_construct_method(new_code)
    if res_code:
        return res_code
    else:
        return new_code
    # return fix(manim_code,ai_response)

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

