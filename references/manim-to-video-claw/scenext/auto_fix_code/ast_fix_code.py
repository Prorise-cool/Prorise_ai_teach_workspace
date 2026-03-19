"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
import re

def find_closing_bracket(s, start_pos):
    """找到匹配的右括号位置"""
    count = 1  # 已经找到一个左括号
    pos = start_pos + 1  # 从start_pos的下一个字符开始
    
    while count > 0 and pos < len(s):
        if s[pos] == '(':
            count += 1
        elif s[pos] == ')':
            count -= 1
        pos += 1
        
    return pos - 1 if count == 0 else -1

def regex_fix_code(manim_code, object_type_to_params=None):
    """
    修复Manim代码中的对象参数，支持跨行处理
    """
    if object_type_to_params is None:
        object_type_to_params = {
            'Text': {'font_size': '28', 'font': '"Noto Sans CJK SC"'},
            'MathTex': {'tex_template': 'TexTemplateLibrary.ctex'},
            'Tex': {'tex_template': 'TexTemplateLibrary.ctex'},
        }

    objects_found = {k: 0 for k in object_type_to_params}
    code = manim_code
    modified_parts = []
    pos = 0

    while pos < len(code):
        best_match = None
        for obj_type, params in object_type_to_params.items():
            # 使用正则表达式精确匹配对象创建模式
            pattern = re.compile(r'(?<!\w)' + re.escape(obj_type) + r'\s*\(', re.MULTILINE)
            match = pattern.search(code, pos)
            if match:
                start = match.start()
                # 选择最接近当前位置的匹配
                if best_match is None or start < best_match['start']:
                    best_match = {
                        'start': start,
                        'obj_type': obj_type,
                        'params': params,
                        'end': match.end()
                    }

        if not best_match:
            modified_parts.append(code[pos:])
            break

        # 添加当前位置到匹配开始之间的内容
        modified_parts.append(code[pos:best_match['start']])
        obj_type = best_match['obj_type']
        params = best_match['params']
        start_pos = best_match['end'] - 1  # 定位到括号位置
        
        # 找到闭合括号
        end_pos = find_closing_bracket(code, start_pos)
        if end_pos == -1:
            modified_parts.append(code[best_match['start']:])
            pos = len(code)
            break

        # 提取现有参数
        existing_params = code[start_pos+1:end_pos]
        
        # 构建新参数列表
        required_params = []
        for param, value in params.items():
            # 使用正则表达式检查参数是否存在
            if not re.search(rf'\b{re.escape(param)}\s*=', existing_params):
                required_params.append(f"{param}={value}")

        if required_params:
            # 保留原有格式处理
            if existing_params.strip():
                # 处理末尾逗号
                if existing_params.strip()[-1] != ',' and not existing_params.rstrip().endswith(','):
                    existing_params += ','
                existing_params += '\n' if '\n' in existing_params else ' '
            existing_params += ', '.join(required_params)

        # 重构对象表达式
        modified_expr = f"{obj_type}({existing_params})"
        modified_parts.append(modified_expr)
        
        pos = end_pos + 1
        objects_found[obj_type] += 1

    # 输出调试信息
   
    return ''.join(modified_parts)

def ast_fix_code(manim_code):
    """兼容层保持函数调用"""
    params = {
        'Text': {'font_size': '20','font':'"Noto Sans CJK SC"'},
        'MathTex': {'tex_template': 'TexTemplateLibrary.ctex'},
        'Tex': {'tex_template': 'TexTemplateLibrary.ctex'},
    }
  
    return regex_fix_code(manim_code, params)

