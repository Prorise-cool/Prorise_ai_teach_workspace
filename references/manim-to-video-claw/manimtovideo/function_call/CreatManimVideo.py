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
import re
from datetime import datetime, timedelta

# 设定环境变量值
def CreateManimVideo(task_id,manim_code,quality):
    
    print(f"函数接收的{manim_code}")
    # try:
    # 获取当前文件夹路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_name = "subsence"

    # 创建Temp文件夹及其子目录
    output_dir = os.path.join(current_dir, "Temp", task_id)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)


    # 在输出目录中创建一个临时Python文件来存储Manim代码
    temp_code_file = os.path.join(output_dir, "temp_manim_code.py")
    with open(temp_code_file, "w") as f:
        f.write(manim_code)

    # 运行Manim生成1080p视频，指定工作目录为输出目录  关闭缓存："--disable_caching"
    command = ["manim", f"-q{quality}", temp_code_file, "MyScene"]
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
    if quality=='h':
        fd = "1080p60"
    elif quality=='l':
        fd = "480p15"
    else:
        fd = "720p30"
    video_dir = os.path.join(output_dir, "media", "videos", "temp_manim_code", fd)
    video_files = [f for f in os.listdir(video_dir) if f.endswith(".mp4")]
    video_srt_file = [f for f in os.listdir(video_dir) if f.endswith(".srt")]
    if not video_files:
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        return "Error: 生成的视频文件未找到"

    video_path = os.path.join(video_dir, video_files[0])

    if video_srt_file:
    # 给视频添加字幕，有字幕文件才添加
        video_srt_path = os.path.join(video_dir,video_srt_file[0])
        process_srt_file(video_srt_path, video_srt_path, max_chars_per_line=20)

        subtitles_video_path = os.path.join(video_dir, f'subtitles_{video_files[0]}')

    # 添加字幕到视频
        add_subtitles_to_video(
            video_path,
            video_srt_path,
            subtitles_video_path
        )
        print("字幕添加成功")

        # 移动视频文件到输出目录的第一层
        final_video_path = os.path.join(output_dir, f"{file_name}.mp4")
        os.rename(subtitles_video_path, final_video_path)
    else:
        final_video_path = os.path.join(output_dir, f"{file_name}.mp4")
        os.rename(video_path, final_video_path)

    # 清理临时文件和目录
    if os.path.exists(temp_code_file):
        os.remove(temp_code_file)

    return final_video_path
  

### 将srt文件分割 ###
def parse_time(time_str):
    """将SRT时间字符串解析为datetime对象"""
    hours, minutes, remainder = time_str.split(':')
    seconds, milliseconds = remainder.split(',')
    return datetime.strptime(f"{hours}:{minutes}:{seconds}.{milliseconds}", "%H:%M:%S.%f")

def format_time(dt):
    """将datetime对象格式化为SRT时间字符串"""
    return dt.strftime("%H:%M:%S,%f")[:-3]

def split_subtitle(subtitle_text, max_chars_per_line=20):
    """将字幕文本分割成更短的行"""
    # 如果文本长度已经小于最大字符数，直接返回
    if len(subtitle_text) <= max_chars_per_line:
        return [subtitle_text]
    
    # 根据标点符号分割文本
    # 优先在句号、问号、感叹号等句末标点处分割
    segments = []
    current_segment = ""
    
    # 按标点符号分割的优先级：句号/问号/感叹号 > 逗号/分号/冒号 > 其他
    primary_punctuation = ['。', '？', '!', '；']
    secondary_punctuation = ['，', '、', '：']
    
    for char in subtitle_text:
        current_segment += char
        
        # 当前段落到达最大长度，需要寻找合适的分割点
        if len(current_segment) >= max_chars_per_line:
            # 检查最近的主要标点符号位置
            latest_primary_punct = max([current_segment.rfind(p) for p in primary_punctuation] + [-1])
            
            # 如果找到主要标点，在此处分割
            if latest_primary_punct > max_chars_per_line // 2:
                segments.append(current_segment[:latest_primary_punct+1])
                current_segment = current_segment[latest_primary_punct+1:]
                continue
            
            # 否则检查次要标点符号
            latest_secondary_punct = max([current_segment.rfind(p) for p in secondary_punctuation] + [-1])
            if latest_secondary_punct > max_chars_per_line // 2:
                segments.append(current_segment[:latest_secondary_punct+1])
                current_segment = current_segment[latest_secondary_punct+1:]
                continue
            
            # 如果没有合适的标点，就在单词中间断开（中文可能不太理想，但作为最后的选择）
            segments.append(current_segment)
            current_segment = ""
    
    # 添加最后剩余的文本
    if current_segment:
        segments.append(current_segment)
    
    return segments

def process_srt_file(input_file, output_file, max_chars_per_line=20):
    """处理SRT文件，拆分长行"""
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 使用正则表达式匹配SRT文件的字幕块
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\d+\n|$)'
    matches = re.findall(pattern, content)
    
    new_subtitles = []
    new_index = 1
    
    for index, start_time, end_time, text in matches:
        # 移除文本中的换行符，合并为一行
        text = text.replace('\n', ' ').strip()
        
        # 分割长行
        segments = split_subtitle(text, max_chars_per_line)
        
        if len(segments) == 1:
            # 如果只有一行，直接添加原始字幕
            new_subtitles.append(f"{new_index}\n{start_time} --> {end_time}\n{segments[0]}")
            new_index += 1
        else:
            # 如果分割成多行，需要调整每行的时间
            start_dt = parse_time(start_time)
            end_dt = parse_time(end_time)
            
            # 计算每个分段的持续时间
            total_duration = (end_dt - start_dt).total_seconds()
            segment_duration = total_duration / len(segments)
            
            for i, segment in enumerate(segments):
                seg_start = start_dt + timedelta(seconds=i * segment_duration)
                seg_end = start_dt + timedelta(seconds=(i + 1) * segment_duration)
                
                new_subtitles.append(f"{new_index}\n{format_time(seg_start)} --> {format_time(seg_end)}\n{segment}")
                new_index += 1
    
    # 写入新的SRT文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(new_subtitles))


def srt_to_ass(srt_file, ass_file, font_name="思源黑体 CN", font_size=24):
    """将SRT字幕文件转换为ASS格式"""
    with open(srt_file, 'r', encoding='utf-8') as f:
        srt_content = f.read()
    
    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    srt_pattern = re.compile(r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\Z)', re.MULTILINE)
    matches = srt_pattern.findall(srt_content)
    
    ass_events = []
    for _, start, end, text in matches:
        start_parts = start.split(',')
        start_time = start_parts[0] + '.' + start_parts[1][:2]
        end_parts = end.split(',')
        end_time = end_parts[0] + '.' + end_parts[1][:2]
        
        text = text.strip().replace('\n', '\\N')
        
        ass_events.append(f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{text}")
    
    with open(ass_file, 'w', encoding='utf-8') as f:
        f.write(ass_header + '\n'.join(ass_events))
    
    return ass_file

def add_subtitles_to_video(video_path, subtitle_path, output_path, use_ass=True, font_name="Source Han Sans CN", font_size=72):
    """将字幕添加到视频"""
    subtitle_ext = os.path.splitext(subtitle_path)[1].lower()
    
    if subtitle_ext == '.srt' and use_ass:
        # 转换SRT到ASS格式以获得更好的渲染效果
        ass_path = os.path.splitext(subtitle_path)[0] + '.ass'
        subtitle_path = srt_to_ass(subtitle_path, ass_path, font_name, font_size)
        subtitle_ext = '.ass'
    
    if subtitle_ext == '.ass':
        # 使用ASS字幕
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-vf', f'ass={subtitle_path}',
            '-c:v', 'libx264',
            '-c:a', 'copy',
            '-y',
            output_path
        ]
    else:
        # 使用SRT字幕并应用高级样式
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-vf', f'subtitles={subtitle_path}:force_style=\'FontName={font_name},FontSize={font_size},PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BackColour=&H000000,BorderStyle=1,Outline=1,Shadow=0,Alignment=2\'',
            '-c:v', 'libx264',
            '-c:a', 'copy',
            '-y',
            output_path
        ]
       
    
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"字幕添加成功，输出文件：{output_path}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"添加字幕时出错: {e}")
        return False


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