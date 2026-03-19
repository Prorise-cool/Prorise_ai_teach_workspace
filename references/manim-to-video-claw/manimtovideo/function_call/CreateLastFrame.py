"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
import os
import subprocess
import shutil

# 设定环境变量值
def CreateLastFrame(task_id,manim_code):
    
    print(f"生成最后一帧图片的代码：{manim_code}")
    # try:
    # 获取当前文件夹路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_name = "lastframe"

    # 创建Temp文件夹及其子目录
    output_dir = os.path.join(current_dir, "Temp", task_id)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)


    # 在输出目录中创建一个临时Python文件来存储Manim代码
    temp_code_file = os.path.join(output_dir, "last_frame_code.py")
    with open(temp_code_file, "w") as f:
        f.write(manim_code)

    # 保存最后一帧画面
    command = ["manim", "-s","-ql", temp_code_file, "MyScene"]
    result = subprocess.run(command, cwd=output_dir, stderr=subprocess.PIPE) # stdout=subprocess.PIPE, 
    print("视频渲染完成，开始添加字幕...")
    # 检查是否有错误
    if result.returncode != 0:
        error_message = result.stderr.decode('utf-8')
         # 根据需要的详细程度格式化错误信息
        formatted_error = format_error_by_verbosity(error_message)
        # 清理临时文件和目录
        if os.path.exists(temp_code_file):
            os.remove(temp_code_file)
        # if os.path.exists(os.path.join(output_dir, "media")):
        #     shutil.rmtree(os.path.join(output_dir, "media"))
        
        return f'''
        Error: {formatted_error}
        '''

    # 查找生成的视频文件路径
    image_dir = os.path.join(output_dir, "media", "images", "last_frame_code")
    image_file = [f for f in os.listdir(image_dir) if f.endswith(".png")]

    if not image_file:
        # 清理临时文件和目录
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        return "Error: 生成的图片文件未找到"

    image_path = os.path.join(image_dir, image_file[0])

    final_image_path = os.path.join(output_dir, f"{file_name}.png")
    os.rename(image_path, final_image_path)

    # 清理临时文件和目录
    if os.path.exists(temp_code_file):
        os.remove(temp_code_file)
    
    return final_image_path



    ###  错误信息处理  ###

def filter_animation_progress(error_message):
    """过滤掉Manim动画进度信息，只保留实际的错误信息。"""
    # 分割成行
    lines = error_message.split('\n')
    
    # 过滤掉所有动画进度行
    filtered_lines = []
    for line in lines:
        if not line.strip().startswith("Animation") and "%" not in line:
            filtered_lines.append(line)
    
    return '\n'.join(filtered_lines)

def extract_main_error(error_message):
    """从完整错误追踪中提取最重要的错误信息。"""
    # 首先过滤动画进度信息
    filtered_message = filter_animation_progress(error_message)
    
    # 查找错误追踪部分
    traceback_start = filtered_message.find("Traceback")
    if traceback_start == -1:
        return filtered_message  # 没有找到错误追踪信息，返回过滤后的全部信息
    
    # 提取错误类型和消息
    error_type = None
    error_message = None
    
    # 查找最后一个错误行
    lines = filtered_message[traceback_start:].split('\n')
    for line in reversed(lines):
        if ': ' in line and not line.strip().startswith('File "'):
            error_parts = line.strip().split(': ', 1)
            if len(error_parts) == 2:
                error_type = error_parts[0]
                error_message = error_parts[1]
                break
    
    # 添加错误发生位置的上下文
    context = ""
    for i, line in enumerate(lines):
        if "❱" in line:
            # 找到错误发生的文件和行号
            file_line = ""
            for j in range(i-1, -1, -1):
                if lines[j].strip().startswith('File "'):
                    file_line = lines[j].strip()
                    break
            
            # 添加具体的代码行
            code_line = line.split("❱")[-1].strip()
            context = f"{file_line}\n  问题代码: {code_line}"
            break
    
    # 构建简洁的错误信息
    if error_type and error_message:
        return f"错误类型: {error_type}\n错误信息: {error_message}\n{context}"
    else:
        # 如果无法提取特定错误，返回最后几行
        return "\n".join(lines[-5:])
def format_error_by_verbosity(error_message, verbosity="detailed"):
    """根据详细程度控制错误信息的输出。"""
    if verbosity == "minimal":
        # 只返回最基本的错误信息
        main_error = extract_main_error(error_message)
        error_lines = main_error.split('\n')
        return error_lines[-1] if error_lines else "未知错误"
    
    elif verbosity == "normal":
        # 返回主要错误和上下文
        return extract_main_error(error_message)
    
    elif verbosity == "detailed":
        # 返回过滤后的错误信息，移除进度信息但保留完整的错误追踪
        return filter_animation_progress(error_message)
    
    else:  # "full"
        # 返回完整的错误信息
        return error_message