import inspect
import json
from manim import *
from typing import Dict, Set, Any, List
from pkgutil import walk_packages

class ManimLibraryExtractor:
    def __init__(self, module_prefix: str = "manim"):
        self.module_prefix = module_prefix
        self.library_info = {
            "classes": {},
            "inheritance": {},
            "methods": {},
            "parameters": {},
            "common_patterns": {}
        }
        self.processed_classes = set()
    
    def extract_library_info(self) -> None:
        """提取所有子模块中的类信息"""
        try:
            main_module = __import__(self.module_prefix)
        except ImportError:
            raise ValueError(f"无法找到模块: {self.module_prefix}")

        modules: List[Any] = [main_module]
        
        # 获取所有子模块
        for importer, modname, ispkg in walk_packages(
            main_module.__path__, 
            main_module.__name__ + '.'
        ):
            try:
                module = __import__(modname, fromlist=["dummy"])
                modules.append(module)
            except Exception as e:
                print(f"跳过模块 {modname}: {str(e)}")
                continue

        # 处理所有模块
        for module in modules:
            for name, obj in inspect.getmembers(module):
                if inspect.isclass(obj) and obj.__module__.startswith(self.module_prefix):
                    self._extract_class_info(name, obj)
    
    def _extract_class_info(self, class_name: str, class_obj: Any) -> None:
        """提取类信息并去重"""
        if class_name in self.processed_classes:
            return
        self.processed_classes.add(class_name)

        class_info = {
            "methods": {},
            "properties": [],
            "base_classes": [
                base.__name__ for base in class_obj.__bases__ 
                if base.__module__.startswith(self.module_prefix)
            ],
            "doc": class_obj.__doc__ or ""
        }

        # 提取方法和属性
        for name, member in inspect.getmembers(class_obj):
            if inspect.isfunction(member) or inspect.ismethod(member):
                class_info["methods"][name] = self._extract_method_info(member)
            elif isinstance(member, property):
                class_info["properties"].append(name)

        self.library_info["classes"][class_name] = class_info
        self._update_inheritance(class_name, class_info["base_classes"])

    def _update_inheritance(self, class_name: str, base_classes: List[str]) -> None:
        """更新继承关系图"""
        for base in base_classes:
            if base not in self.library_info["inheritance"]:
                self.library_info["inheritance"][base] = []
            if class_name not in self.library_info["inheritance"][base]:
                self.library_info["inheritance"][base].append(class_name)

    def _extract_method_info(self, method_obj: Any) -> Dict:
        """提取方法的详细信息，包括参数"""
        try:
            signature = inspect.signature(method_obj)
            params = {}
            for name, param in signature.parameters.items():
                params[name] = {
                    "kind": str(param.kind),
                    "default": str(param.default) if param.default is not param.empty else None,
                    "required": param.default is param.empty and param.kind not in 
                              [param.VAR_POSITIONAL, param.VAR_KEYWORD]
                }
            
            return {
                "params": params,
                "doc": method_obj.__doc__,
                "return_annotation": str(signature.return_annotation)
            }
        except ValueError:
            return {"error": "无法获取方法信息"}

    def _extract_common_patterns(self) -> None:
        """提取常用的代码模式"""
        # 这里可以定义一些常见的代码模式
        self.library_info["common_patterns"] = {
            "create_circle": {
                "pattern": "Circle(radius={radius}, color={color})",
                "params": {"radius": 1.0, "color": "WHITE"}
            },
            "right_angle": {
                "pattern": "RightAngle(line1, line2)",
                "constraints": ["perpendicular_lines"]
            }
            # 可以添加更多常用模式
        }

    def save_to_json(self, filename: str = "manim_library_info.json") -> None:
        """将库信息保存为 JSON 文件"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.library_info, f, indent=2, ensure_ascii=False)

    def load_from_json(self, filename: str = "manim_library_info.json") -> None:
        """从 JSON 文件加载库信息"""
        with open(filename, 'r', encoding='utf-8') as f:
            self.library_info = json.load(f)

    def get_class_methods(self, class_name: str, visited: Set[str] = None) -> Set[str]:
        if visited is None:
            visited = set()
        if class_name in visited:
            return set()  # 检测到循环继承
        visited.add(class_name)
        
        methods = set()
        class_info = self.library_info["classes"].get(class_name, {})
        
        methods.update(class_info.get("methods", {}).keys())
        
        for base_class in class_info.get("base_classes", []):
            methods.update(self.get_class_methods(base_class, visited))
        
        return methods


    def get_method_info(self, class_name: str, method_name: str, visited: Set[str] = None) -> Dict:
        """获取方法信息，如果需要会向上查找基类"""
        if visited is None:
            visited = set()
        if class_name in visited:
            return {}  # 检测循环继承
        visited.add(class_name)
        
        class_info = self.library_info["classes"].get(class_name, {})
        
        # 检查方法是否在当前类中定义
        if method_name in class_info.get("methods", {}):
            return class_info["methods"][method_name]
        
        # 检查基类
        for base_class in class_info.get("base_classes", []):
            method_info = self.get_method_info(base_class, method_name, visited)
            if method_info:
                return method_info
        
        return {}

if __name__=="__main__":
  
    # 尝试使用Manim Community Edition（默认）
    extractor = ManimLibraryExtractor(module_prefix="manim")
    extractor.extract_library_info()
    extractor._extract_common_patterns()
    extractor.save_to_json("manim_ce_library.json")
    print("Manim CE 库信息提取成功！")
