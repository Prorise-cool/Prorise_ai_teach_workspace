"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
'''
先检查OSS的icon文件夹中是否存在对于的图标，若不存在则调用生成
'''

import re
import aiohttp
import aiofiles
import json
import os
import ast
from dotenv import load_dotenv
import cloudFunction

load_dotenv()

async def download_file_async(url: str, save_path: str):
    """
    异步下载文件并保存到指定路径
    :param url: 文件的URL
    :param save_path: 保存文件的完整路径（包括文件名）
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    # 确保保存路径的文件夹存在
                    os.makedirs(os.path.dirname(save_path), exist_ok=True)
                    
                    # 异步写入文件
                    async with aiofiles.open(save_path, mode='wb') as f:
                        await f.write(await response.read())
            
                    return {"status": "success", "path": save_path}
                else:
                    return {"status": "error", "code": response.status, "detail": await response.text()}
    except aiohttp.ClientError as e:
        return {"status": "error", "message": f"Network error: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error: {str(e)}"}

 
async def generate_image_async(prompt: str,file_type:str, negative_prompt: str="blurry, low quality, dark", style: str = "FLAT_VECTOR"):
    '''
    根据需要的图标文件名生成对应图标到icon文件夹内
    '''
    api_key = os.getenv("SVGIO_API_KEY")

    # 请求头
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    # 请求体
    payload = {
        "prompt": prompt,
        "negativePrompt": negative_prompt,
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                'https://api.svg.io/v1/generate-image',
                headers=headers,
                data=json.dumps(payload)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    if result.get('success'):

                        # 将生成的图片上传到云文档
                        if file_type=="svg":
                            file_new_path = os.path.join("/ManimToVideo","icon",f"{prompt}.svg")
                            down_res = await download_file_async(result['data'][0]['svgUrl'],file_new_path)
                        
                        else:
                            file_new_path = os.path.join("/ManimToVideo","icon",f"{prompt}.png")
                            down_res = await download_file_async(result['data'][0]['pngUrl'],file_new_path)
                        
                        return {
                            "status": "success",
                            "file_new_path":file_new_path
                        }
                    else:
                        print(f"生成SVG API returned failure:{result}")
                        return {"status": "error", "message": f"API returned failure:{result}"}
                else:
                    error_detail = await response.text()
                    print(f"生成svg的api错误：{error_detail}")
                    return {
                        "status": "error",
                        "code": response.status,
                        "detail": error_detail
                    }
        except aiohttp.ClientError as e:
            print(f"Network error: {str(e)}")
            return {"status": "error", "message": f"Network error: {str(e)}"}
        except json.JSONDecodeError:
            print("生成SVG的API：Invalid JSON response")
            return {"status": "error", "message": "Invalid JSON response"}

class FilenameExtractor(ast.NodeVisitor):
    def __init__(self):
        self.file_info = []  # 存储(文件名, 类型)元组
    
    def visit_Call(self, node):
        # 检查是否是 SVGMobject 或 ImageMobject 的调用
        class_name = None
        if isinstance(node.func, ast.Name):
            class_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            class_name = node.func.attr
        
        if class_name in ("SVGMobject", "ImageMobject"):
            param_name = "file_name" if class_name == "SVGMobject" else "filename"
            file_expr = None
            
            # 查找关键字参数
            for keyword in node.keywords:
                if keyword.arg == param_name:
                    file_expr = keyword.value
                    break
            
            # 若未找到关键字参数，检查第一个位置参数
            if not file_expr and node.args:
                file_expr = node.args[0]
            
            # 提取字符串字面量
            if file_expr:
                value = None
                if isinstance(file_expr, ast.Constant) and isinstance(file_expr.value, str):
                    value = file_expr.value
                elif isinstance(file_expr, ast.Str):  # 兼容Python<3.8
                    value = file_expr.s
                
                if value:
                    # 同时记录文件名和对应的组件类型
                    self.file_info.append((value, class_name))
        
        self.generic_visit(node)

def extract_filenames_with_info(code):
    try:
        tree = ast.parse(code)
        extractor = FilenameExtractor()
        extractor.visit(tree)
        return extractor.file_info
    except:
        return []


def replace_filenames_in_code(code, filename_replacements):
    """
    仅替换SVGMobject和ImageMobject构造函数中的文件路径参数
    
    参数:
        code (str): 原始代码
        filename_replacements (dict): 文件名替换映射，如 {"old_name.svg": "/new/path/old_name.svg"}
    
    返回:
        str: 替换后的代码
    """
    # 匹配SVGMobject的文件名参数
    svg_pattern = r'(SVGMobject\s*\(\s*)(?:file_name\s*=\s*)?(["\'])(.*?)\2'
    # 匹配ImageMobject的文件名参数
    img_pattern = r'(ImageMobject\s*\(\s*)(?:filename\s*=\s*)?(["\'])(.*?)\2'
    
    patterns = [svg_pattern, img_pattern]
    
    for pattern in patterns:
        def replacer(match):
            prefix = match.group(1)  # 保留前缀部分
            quote = match.group(2)   # 保留引号类型
            filename = match.group(3)  # 提取文件名
            
            if filename in filename_replacements:
                # 仅替换文件名部分，保持其他部分不变
                return f'{prefix}{quote}{filename_replacements[filename]}{quote}'
            return match.group(0)  # 无需替换时保持原样
        
        # 执行替换
        code = re.sub(pattern, replacer, code, flags=re.DOTALL)
    
    return code

def get_file_type_with_context(filename, class_name):
    """
    根据文件名和组件类型确定文件类型
    
    参数:
        filename (str): 文件名
        class_name (str): 组件类名，'SVGMobject' 或 'ImageMobject'
        
    返回:
        tuple: (filename_without_extension, extension)
    """
    # 使用 os.path.basename 提取文件名（去掉路径）
    basename = os.path.basename(filename)
    # 使用 rsplit 从右向左分割，最多分割一次
    parts = basename.rsplit(".", 1)
    
    if len(parts) == 1 or parts[1] == "":
        # 没有后缀的情况，根据类型提供默认后缀
        default_ext = "svg" if class_name == "SVGMobject" else "png"
        return parts[0], default_ext
    else:
        # 返回文件名和后缀
        return parts[0], parts[1]
    
async def svg_img_main(code):
    '''
    输入 code
    提取出需要生成的图片名称

    1. 检查需要的图标云存储中是否含有
    2. 若含有则将图标下载到本地icon文件夹
    3. 若不存在则生成一个图标然后上传到云存储，同时生成的图标存在本地一份
    '''
    # 提取出来需要准备哪些图标文件
    file_info = set(extract_filenames_with_info(code)) # 集合去重
    filename_replacements = {}  # 存储文件名替换映射
    print(file_info)
    # 逐个检查文件在icon文件夹是否存在，若不存在生成一个
    for icon_name, class_name in file_info:
        # 拆分一下文件名与后缀
        prompt, file_type = get_file_type_with_context(icon_name, class_name)
        cloud_path = os.path.join("icon", f"{prompt}.{file_type}")

        # 检查在icon文件夹是否存在
        if not cloudFunction.file_OSSexist(cloud_path):
            # 如果不存在，做一个
            gene_res = await generate_image_async(prompt,file_type)
            if gene_res['status'] == "success":
                
                filename_replacements[icon_name] = gene_res['file_new_path']
                # 同时将图标上传到云存储，供未来再次使用
                cloudFunction.upload_filePath_to_aliyunOSS(gene_res['file_new_path'],cloud_path,forbid_overwrite='true')
        else:
            # 存在则先保存到本地
            local_path = os.path.join("/ManimToVideo", cloud_path)
            if not os.path.exists(local_path):
                cloudFunction.download_OSSfile(cloud_path,local_path)
            filename_replacements[icon_name] = local_path
            print(f"已经存在的icon路径:{cloud_path}")

    updated_code = replace_filenames_in_code(code, filename_replacements)
    return updated_code
