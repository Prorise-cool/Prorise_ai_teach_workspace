"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""

import ast
import sys
import json
from collections import defaultdict
import inspect
from manim import *
from .ai_fix_code import ai_fix_code

class ManimAnalyzer(ast.NodeVisitor):
    def __init__(self):
        # 类名 -> 实例列表
        self.classes = defaultdict(list)
        # 变量名 -> 类名
        self.var_types = {}
        # 变量名 -> 初始化参数集合
        self.instance_params = defaultdict(set)
        # 变量名 -> 方法名 -> 参数集合
        self.instance_methods = defaultdict(lambda: defaultdict(set))
    
    def visit_Assign(self, node):
        """处理赋值语句"""
        # 提取目标变量名
        target_names = []
        for target in node.targets:
            if isinstance(target, ast.Name):
                target_names.append(target.id)
        
        if not target_names:
            self.generic_visit(node)
            return
        
        # 分析右侧表达式
        if isinstance(node.value, ast.Call):
            # 直接类实例化: var = Class(...)
            class_info = self.extract_class_call(node.value)
            if class_info:
                class_name, params = class_info
                for target_name in target_names:
                    self.var_types[target_name] = class_name
                    self.classes[class_name].append(target_name)
                    self.instance_params[target_name].update(params)
            
            # 检查链式调用: var = Class(...).method1(...).method2(...)
            methods_info = self.extract_method_chain(node.value)
            if methods_info and target_names:
                for method_name, params in methods_info:
                    for target_name in target_names:
                        self.instance_methods[target_name][method_name].update(params)
        
        self.generic_visit(node)
    
    def extract_class_call(self, node):
        """从调用中提取类名和参数"""
        if isinstance(node, ast.Call):
            class_name = None
            if isinstance(node.func, ast.Name):
                class_name = node.func.id
            elif isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
                class_name = node.func.attr  # module.Class() 情况
            
            if class_name:
                params = self.extract_call_params(node)
                return class_name, params
        
        # 处理链式调用的情况: Class(...).method(...)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            return self.extract_class_call(node.func.value)
        
        return None
    
    def extract_method_chain(self, node, methods=None):
        """提取方法链中的所有方法及其参数"""
        if methods is None:
            methods = []
        
        if not isinstance(node, ast.Call):
            return methods
        
        if isinstance(node.func, ast.Attribute):
            # 这是一个方法调用: obj.method(...)
            method_name = node.func.attr
            params = self.extract_call_params(node)
            methods.append((method_name, params))
            
            # 递归处理链中的前一个调用
            if isinstance(node.func.value, ast.Call):
                self.extract_method_chain(node.func.value, methods)
        
        return methods
    
    def extract_call_params(self, node):
        """提取调用中的参数名"""
        params = set()
        for kw in node.keywords:
            if kw.arg:
                params.add(kw.arg)
        return params
    
    def visit_Expr(self, node):
        """处理表达式语句，如方法调用"""
        if isinstance(node.value, ast.Call):
            self.process_standalone_call(node.value)
        self.generic_visit(node)
    
    def process_standalone_call(self, node):
        """处理独立的方法调用"""
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            # 处理对象方法调用: obj.method(...)
            if isinstance(node.func.value, ast.Name):
                obj_name = node.func.value.id
                method_name = node.func.attr
                
                if obj_name in self.var_types:
                    params = self.extract_call_params(node)
                    self.instance_methods[obj_name][method_name].update(params)
            
            # 递归处理可能的链式调用
            self.process_standalone_call(node.func.value)

def analyze_manim_code(code):
    try:
        tree = ast.parse(code)
        analyzer = ManimAnalyzer()
        analyzer.visit(tree)
        return analyzer.classes, analyzer.var_types, analyzer.instance_params, analyzer.instance_methods
    except Exception as e:
        print(f"解析代码时出错: {e}", file=sys.stderr)
        # 给到AI改正
        return {}, {}, {}, {}

def convert_to_serializable(data):
    """将数据转换为可序列化的格式"""
    if isinstance(data, defaultdict):
        return convert_to_serializable(dict(data))
    elif isinstance(data, dict):
        return {k: convert_to_serializable(v) for k, v in data.items()}
    elif isinstance(data, set):
        return sorted(list(data))
    elif isinstance(data, list):
        return [convert_to_serializable(item) for item in data]
    else:
        return data

def stat_check(code):
    classes, var_types, instance_params, instance_methods = analyze_manim_code(code)
    
    # 获取所有方法
    all_methods = set()
    for methods in instance_methods.values():
        all_methods.update(methods.keys())
    
    # 构建JSON结构
    result = {
        "classes": {},
        "methods": {}
    }
    
    # 填充类信息
    for class_name, instances in classes.items():
        if not class_name[0].isupper():
            continue
        result["classes"][class_name] = {
            "instances": []
        }
        
        for instance_name in sorted(instances):
            instance_info = {
                "name": instance_name,
                "params": sorted(list(instance_params.get(instance_name, []))),
                "methods": {}
            }
            
            # 实例方法调用
            for method_name, params in instance_methods.get(instance_name, {}).items():
                instance_info["methods"][method_name] = sorted(list(params))
            
            result["classes"][class_name]["instances"].append(instance_info)
    
    # 填充方法信息
    for method_name in sorted(all_methods):
        result["methods"][method_name] = {
            "instances": []
        }
        
        for instance_name, methods in instance_methods.items():
            if method_name in methods:
                class_name = var_types.get(instance_name, "未知类")
                instance_info = {
                    "name": instance_name,
                    "class": class_name,
                    "params": sorted(list(methods[method_name]))
                }
                result["methods"][method_name]["instances"].append(instance_info)

    return result


# 统计完成，进行检查，纠正
def get_manim_library(json_file: str):
   # 从 JSON 加载库信息
   with open(json_file, 'r', encoding='utf-8') as f:
       library_info = json.load(f)
   
   return library_info

classes_info =  get_manim_library("assistants/manim_library/manim_ce_library.json")

class ManimParamChecker(ast.NodeVisitor):
    def __init__(self, class_names=None):
        global classes_info
        self.issues = []
        # 跟踪变量及其类型
        self.var_type_map = {}
        self.classes_info = classes_info
        # 将类名字符串转换为类引用
        self.classes_to_check = self._resolve_class_names(class_names)
        
        # 构建Manim类和方法的参数映射
        self.manim_classes = self._build_manim_class_map()
        self.manim_methods = self._build_manim_method_map()
        # 构建对象方法映射
        self.manim_object_methods = self._build_manim_object_methods()
    
    def _resolve_class_names(self, class_names):
        """将类名字符串列表解析为类对象列表"""
        if not class_names:
            # 默认类列表
            return [
                Rectangle, Circle, Square, Line, Arrow, 
                Text, Tex, MathTex, VGroup, 
                Scene, Mobject, VMobject,MovingCameraScene
            ]
        
        classes = []
        # 从manim模块获取类
        for name in class_names:
            if hasattr(sys.modules['manim'], name):
                cls = getattr(sys.modules['manim'], name)
                if isinstance(cls, type):  # 确保是类
                    classes.append(cls)
            else:
                print(f"警告: 在manim中找不到类 '{name}'，将被忽略")
        
        # 确保至少有一些基本类
        if not classes:
            print("警告: 未找到有效类，使用默认类列表")
            return [Rectangle, Circle, Mobject, VMobject, Scene,MovingCameraScene]
        
        return classes
    
    def _build_manim_class_map(self):
        """构建Manim类的参数映射"""
        class_map = {}
        
        for cls in self.classes_to_check:
            try:
                params = list(inspect.signature(cls.__init__).parameters.keys())
                # 移除self参数
                if 'self' in params:
                    params.remove('self')
                class_map[cls.__name__] = params
                
                # 检查是否有kwargs参数
                if 'kwargs' in params or '**kwargs' in str(inspect.signature(cls.__init__)):
                    # 获取父类的参数
                    for base in cls.__bases__:
                        if base.__name__ in class_map:
                            class_map[cls.__name__].extend(class_map[base.__name__])
                        else:
                            try:
                                base_params = list(inspect.signature(base.__init__).parameters.keys())
                                if 'self' in base_params:
                                    base_params.remove('self')
                                class_map[cls.__name__].extend(base_params)
                            except (ValueError, TypeError):
                                pass
            except (ValueError, TypeError):
                # 某些类可能没有可检查的签名
                pass
        
        # 添加VMobject和Mobject的常见参数，因为很多类都继承自它们
        common_params = [
            'stroke_width', 'stroke_color', 'stroke_opacity', 
            'fill_color', 'fill_opacity', 'color', 'opacity',
            'sheen_factor', 'sheen_direction',
            'background_stroke_width', 'background_stroke_color', 'background_stroke_opacity'
        ]
        
        for cls_name in class_map:
            class_map[cls_name].extend(common_params)
            # 去重
            class_map[cls_name] = list(set(class_map[cls_name]))
        
        return class_map
    
    def _build_manim_method_map(self):
        """构建Manim方法的参数映射"""
        method_map = {}
        
        for cls in self.classes_to_check:
            for name, obj in inspect.getmembers(cls):
                if inspect.isfunction(obj) or inspect.ismethod(obj):
                    # 排除私有方法
                    if not name.startswith('_') or name == '__init__':
                        try:
                            params = list(inspect.signature(obj).parameters.keys())
                            if 'self' in params:
                                params.remove('self')
                            method_map[name] = params
                            
                            # 检查是否有kwargs参数
                            if 'kwargs' in params or '**kwargs' in str(inspect.signature(obj)):
                                method_map[name].append('**kwargs')
                        except (ValueError, TypeError):
                            pass
        
        # 添加play方法的特殊处理
        if 'play' in method_map:
            method_map['play'].extend(['run_time', 'rate_func', 'lag_ratio', 'subcaption', 'subcaption_duration'])
        
        return method_map
    
    def _build_manim_object_methods(self):
        """构建Manim对象的方法映射"""
        method_map = {}
        
        for cls in self.classes_to_check:
            methods = set()
            # 收集当前类的方法
            for name, _ in inspect.getmembers(cls, lambda x: inspect.isfunction(x) or inspect.ismethod(x)):
                methods.add(name)
            
            # 收集所有基类的方法
            for base in inspect.getmro(cls):
                if base != object:  # 排除object基类
                    for name, _ in inspect.getmembers(base, lambda x: inspect.isfunction(x) or inspect.ismethod(x)):
                        methods.add(name)
            
            # 添加常见属性
            if issubclass(cls, Mobject):
                methods.update([
                    'get_center', 'get_top', 'get_bottom', 'get_left', 'get_right',
                    'move_to', 'shift', 'scale', 'rotate', 'flip', 'stretch',
                    'align_to', 'next_to', 'to_edge', 'to_corner', 'set_color'
                ])
            
            method_map[cls.__name__] = list(methods)
        
        return method_map
    
    def visit_Assign(self, node):
        """处理赋值语句以跟踪变量类型"""
        # 处理常规赋值
        if isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name):
            class_name = node.value.func.id
            # 检查是否是创建Manim对象
            if class_name in self.manim_classes:
                # 记录变量类型
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        self.var_type_map[target.id] = class_name
        
        # 处理方法调用的赋值
        elif isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Attribute):
            # 处理链式调用，如 var = obj.method()
            if isinstance(node.value.func.value, ast.Name):
                var_name = node.value.func.value.id
                method_name = node.value.func.attr
                
                if var_name in self.var_type_map:
                    # 假设方法返回同类型的对象 (常见于链式调用)
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            self.var_type_map[target.id] = self.var_type_map[var_name]
        
        self.generic_visit(node)
    
    def visit_Call(self, node):
        """处理函数和方法调用"""
        # 检查类实例化
        if isinstance(node.func, ast.Name):
            class_name = node.func.id
            if class_name in self.manim_classes:
                valid_params = self.manim_classes[class_name]
                for keyword in node.keywords:
                    arg_name = keyword.arg
                    # 查找与参数名相似但不完全相同的参数（可能是拼写错误）
                    if arg_name not in valid_params and '**kwargs' not in valid_params:
                        # 尝试找到相似的参数名
                        similar_params = self._find_similar_params(arg_name, valid_params)
                        if similar_params:
                            suggestion = f"，您是否想使用：{', '.join(similar_params)}？"
                        else:
                            suggestion = ""

                        # 查文档填充正确的信息
                        docs = f"{self.classes_info['classes'][class_name]['methods']['__init__']}\n doc:{self.classes_info['classes'][class_name]['doc']}"
                        # 修改后
                        error_msg = f"错误提示：类 '{class_name}' 不接受参数 '{arg_name}'{suggestion}；相关文档信息如下：{docs}"
                        if error_msg not in self.issues:  # 检查是否重复
                            self.issues.append(error_msg)
        
        # 检查方法调用
        elif isinstance(node.func, ast.Attribute):
            method_name = node.func.attr
            var_name = None  # 初始化变量，避免后面未定义错误
            
            # 检查是否是对象方法调用
            if isinstance(node.func.value, ast.Name):
                var_name = node.func.value.id
                
                # 首先检查方法是否存在
                if var_name in self.var_type_map:
                    var_type = self.var_type_map[var_name]
                    
                    if var_type in self.manim_object_methods:
                        # 检查方法是否存在于对象中
                        if method_name not in self.manim_object_methods[var_type]:
                            similar_methods = self._find_similar_params(method_name, self.manim_object_methods[var_type])
                            if similar_methods:
                                suggestion = f"，您是否想使用：{', '.join(similar_methods)}？"
                            else:
                                suggestion = ""

                            # 查文档
                            docs = self.classes_info['classes'][var_type]['methods'].keys()
                            self.issues.append(f"错误提示：行 {node.lineno}: 类 '{var_type}' 没有方法 '{method_name}'{suggestion}，相关文档信息如下：{docs}")
                            
                            # 跳过参数检查 (方法不存在)
                            self.generic_visit(node)
                            return
            
            # 检查方法参数（无论是否直接引用变量）
            if method_name in self.manim_methods:
                valid_params = self.manim_methods[method_name]
                # 检查是否有**kwargs
                has_kwargs = '**kwargs' in valid_params
                
                for keyword in node.keywords:
                    arg_name = keyword.arg
                    if arg_name not in valid_params and not has_kwargs:
                        # 尝试找到相似的参数名
                        similar_params = self._find_similar_params(arg_name, valid_params)
                        if similar_params:
                            suggestion = f"，您是否想使用：{', '.join(similar_params)}？"
                        else:
                            suggestion = ""
                        
                        # 获取类名，注意检查var_name是否已定义
                        if var_name and var_name in self.var_type_map:
                            class_name = self.var_type_map.get(var_name)
                        else:
                            class_name = "未知类"

                        self.issues.append(f"错误提示：行 {node.lineno}: {class_name}类的方法 '{method_name}' 不接受参数 '{arg_name}'{suggestion}")
        
        self.generic_visit(node)



    def _find_similar_params(self, param, valid_params):
        """找出与给定参数名相似的有效参数"""
        if param is None:
            return []
        similar = []
        # 使用简单的编辑距离或包含关系检查
        for valid in valid_params:
            # 忽略'**kwargs'这样的特殊参数
            if valid.startswith('*'):
                continue
                
            # 检查拼写错误（简单实现）
            if abs(len(param) - len(valid)) <= 3:
                # 计算共同字符
                common_chars = 0
                for c1, c2 in zip(param, valid):
                    if c1 == c2:
                        common_chars += 1
                
                # 如果有足够多的共同字符，认为是相似的
                if common_chars >= min(len(param), len(valid)) * 0.7:
                    similar.append(valid)
        
        return similar

def check_manim_code(code_snippet, class_names=None):
    """
    检查Manim代码片段中的参数和方法错误
    
    参数:
        code_snippet (str): 要检查的Manim代码片段
        class_names (list): 要检查的类名字符串列表，如 ['Rectangle', 'Circle', 'Scene']
                            如果为None，则使用默认类列表
    
    返回:
        list: 发现的问题列表
    """
    try:
        tree = ast.parse(code_snippet)
        checker = ManimParamChecker(class_names)
        checker.visit(tree)
        return checker.issues
    except SyntaxError as e:
        return [f"语法错误: {str(e)}"]



async def stat_check_fix(task,manim_code,classes_info=classes_info):

    # 获取统计结果
    retry_num = 0 # 重试，且共2次机会
    retry_max = 2 # 最大重试次数
    models_level = ['deepseek_r1'] # 提级
    while retry_max>retry_num:
        stat_res = stat_check(manim_code)

        classname_error = False  # 是否有类不存在的错误

        right_class_name = []
        class_white_list = ["AzureService","BaiduTTS","ByteTTS","KokoroTTS","SparkTTS"] # 类白名单
        # 检查是否有不存在的类
        for class_name in stat_res['classes']:
            # 逐个类处理 
            if class_name not in classes_info["classes"] and class_name not in class_white_list:
                # 如果是不存在的类，看看是什么类型的一般
                print(f"{class_name}类不存在")
                issue = f"{class_name}类在Manim库中不存在,Manim库有以下类：{classes_info['classes'].keys()}"
             
                classname_error = True
            else:
                right_class_name.append(class_name)

        # 变动了则重新统计一下类情况
        if classname_error:
            # 如果修改了类，重新统计一下类情况
            right_class_name = []
            stat_res = stat_check(manim_code)
            for class_name in stat_res['classes']:
                right_class_name.append(class_name)

    
        # 参数检查
        issues = check_manim_code(manim_code,right_class_name)
        print(f"第一次发现的参数问题{issues}")

        if not issues:
            print("未发现参数问题")
            break
          
        max_fix = 2 # 参数问题最大修复次数
        fix_num = 0
        while issues and fix_num<max_fix:
            manim_code = await ai_fix_code(manim_code,issues[0],model_name=models_level[retry_num])
            # 重新检查一下还有问题吗，
            issues = check_manim_code(manim_code,right_class_name) # 更新问题列表
            fix_num += 1
            print(f"第{fix_num+1}次发现的参数问题:{issues}")

        retry_num += 1
        print(f"修复后新场景的代码：{manim_code}")

    return manim_code
           
