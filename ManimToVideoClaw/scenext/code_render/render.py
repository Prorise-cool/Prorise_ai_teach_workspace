"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""

from jinja2 import Template

# 读取模板文件
with open('code_render/templates/base.j2', 'r') as f:
    template_str = f.read()

template = Template(template_str)


with open('code_render/templates/tmp.j2', 'r') as f:
    template_str_tmp = f.read()

template_tmp = Template(template_str_tmp)

with open('code_render/templates/process.j2', 'r') as f:
    template_str_process = f.read()

template_process = Template(template_str_process)

def render_scene_code(data):
    global template
    # 渲染模板
    rendered_scene = template.render(data)
    return rendered_scene

def render_scene_code_tmp(data):
    global template_tmp
    # 渲染模板
    rendered_scene = template_tmp.render(data)
    return rendered_scene

def render_scene_code_process(data):
    global template_process
    # 渲染模板
    rendered_scene = template_process.render(data)
    return rendered_scene
