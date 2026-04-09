"""静态分析修复层 -- 基于 AST 检测 Manim 代码中的参数与方法错误。

本模块提供两阶段处理：
1. :class:`ManimAnalyzer` 解析代码，提取类实例化、方法调用与参数信息。
2. :class:`ManimParamChecker` 对照已知 Manim API 进行校验，输出问题列表。

当前实现为精简版，内置常见 Manim 类的参数白名单；
完整的 Manim 库 JSON 数据库集成可在后续迭代中接入。
"""

from __future__ import annotations

import ast
import difflib
import sys
from collections import defaultdict
from typing import Any, Sequence


# ---------------------------------------------------------------------------
# 常见 Manim 类的可接受参数白名单（精简版）
# ---------------------------------------------------------------------------

_COMMON_MOBJECT_PARAMS: frozenset[str] = frozenset({
    "color", "stroke_width", "stroke_color", "stroke_opacity",
    "fill_color", "fill_opacity", "opacity",
    "sheen_factor", "sheen_direction",
    "background_stroke_width", "background_stroke_color", "background_stroke_opacity",
})

_COMMON_MOBJECT_METHODS: frozenset[str] = frozenset({
    "get_center", "get_top", "get_bottom", "get_left", "get_right",
    "move_to", "shift", "scale", "rotate", "flip", "stretch",
    "align_to", "next_to", "to_edge", "to_corner", "set_color",
    "set_opacity", "set_stroke", "set_fill", "set_width", "set_height",
    "animate", "copy", "save_state", "restore",
})

MANIM_CLASS_PARAMS: dict[str, frozenset[str]] = {
    "Text": frozenset({
        "text", "font_size", "font", "color", "opacity",
        "gradient", "line_spacing", "slant", "weight",
        "t2c", "t2f", "t2g", "t2s", "t2w",
        *_COMMON_MOBJECT_PARAMS,
    }),
    "MathTex": frozenset({
        "tex_to_color_map", "tex_template", "arg_separator",
        "substrings_to_isolate", "tex_environment",
        "font_size", "color", "opacity",
        *_COMMON_MOBJECT_PARAMS,
    }),
    "Tex": frozenset({
        "tex_to_color_map", "tex_template", "arg_separator",
        "substrings_to_isolate", "tex_environment",
        "font_size", "color", "opacity",
        *_COMMON_MOBJECT_PARAMS,
    }),
    "Rectangle": frozenset({
        "width", "height", "color", "fill_color", "fill_opacity",
        "stroke_width", "stroke_color",
        *_COMMON_MOBJECT_PARAMS,
    }),
    "Circle": frozenset({
        "radius", "color", "fill_color", "fill_opacity",
        "stroke_width", "stroke_color",
        *_COMMON_MOBJECT_PARAMS,
    }),
    "Square": frozenset({
        "side_length", "color", "fill_color", "fill_opacity",
        "stroke_width", "stroke_color",
        *_COMMON_MOBJECT_PARAMS,
    }),
    "Line": frozenset({
        "start", "end", "color", "stroke_width", "buff",
        "path_arc",
        *_COMMON_MOBJECT_PARAMS,
    }),
    "Arrow": frozenset({
        "start", "end", "color", "stroke_width", "buff",
        "path_arc", "max_tip_length_to_length_ratio", "max_stroke_width_to_length_ratio",
        "tip_length", "tip_width",
        *_COMMON_MOBJECT_PARAMS,
    }),
    "VGroup": frozenset({
        "color", "fill_color", "fill_opacity",
        *_COMMON_MOBJECT_PARAMS,
    }),
    "VMobject": frozenset(_COMMON_MOBJECT_PARAMS),
    "Mobject": frozenset(_COMMON_MOBJECT_PARAMS),
    "Scene": frozenset({
        "camera_config", "random_seed",
    }),
    "MovingCameraScene": frozenset({
        "camera_config", "random_seed",
    }),
}

MANIM_CLASS_METHODS: dict[str, frozenset[str]] = {
    name: _COMMON_MOBJECT_METHODS
    for name in MANIM_CLASS_PARAMS
    if name not in ("Scene", "MovingCameraScene")
}
MANIM_CLASS_METHODS["Scene"] = frozenset({
    "play", "wait", "add", "remove", "clear",
    "get_top_level_mobjects",
})
MANIM_CLASS_METHODS["MovingCameraScene"] = frozenset({
    "play", "wait", "add", "remove", "clear",
    "get_top_level_mobjects",
})

MANIM_METHOD_PARAMS: dict[str, frozenset[str]] = {
    "play": frozenset({
        "run_time", "rate_func", "lag_ratio",
        "subcaption", "subcaption_duration",
    }),
    "wait": frozenset({
        "duration", "stop_condition", "freeze_buffer", "run_time",
    }),
    "animate": frozenset(),
}


# ---------------------------------------------------------------------------
# ManimAnalyzer -- AST 分析器
# ---------------------------------------------------------------------------


class ManimAnalyzer(ast.NodeVisitor):
    """AST 访问器，提取 Manim 代码中的类实例化与方法调用信息。

    Attributes:
        classes:      类名 -> 实例变量名列表。
        var_types:    变量名 -> 推断的类名。
        instance_params:   变量名 -> 构造时使用的参数名集合。
        instance_methods:  变量名 -> {方法名 -> 调用参数名集合}。
    """

    def __init__(self) -> None:
        super().__init__()
        self.classes: dict[str, list[str]] = defaultdict(list)
        self.var_types: dict[str, str] = {}
        self.instance_params: dict[str, set[str]] = defaultdict(set)
        self.instance_methods: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))

    # -- 赋值语句：追踪变量类型与链式调用 --

    def visit_Assign(self, node: ast.Assign) -> None:  # noqa: N802
        """处理赋值语句，追踪变量类型。"""
        target_names = self._extract_target_names(node.targets)
        if not target_names:
            self.generic_visit(node)
            return

        if isinstance(node.value, ast.Call):
            class_info = self._extract_class_call(node.value)
            if class_info:
                class_name, params = class_info
                for name in target_names:
                    self.var_types[name] = class_name
                    self.classes[class_name].append(name)
                    self.instance_params[name].update(params)

            methods_info = self._extract_method_chain(node.value)
            for method_name, params in methods_info:
                for name in target_names:
                    self.instance_methods[name][method_name].update(params)

        self.generic_visit(node)

    # -- 表达式语句：追踪独立方法调用 --

    def visit_Expr(self, node: ast.Expr) -> None:  # noqa: N802
        """处理表达式语句中的方法调用。"""
        if isinstance(node.value, ast.Call):
            self._process_standalone_call(node.value)
        self.generic_visit(node)

    # -- 内部辅助 --

    @staticmethod
    def _extract_target_names(targets: list[ast.expr]) -> list[str]:
        names: list[str] = []
        for target in targets:
            if isinstance(target, ast.Name):
                names.append(target.id)
        return names

    @staticmethod
    def _extract_call_params(node: ast.Call) -> set[str]:
        params: set[str] = set()
        for keyword in node.keywords:
            if keyword.arg is not None:
                params.add(keyword.arg)
        return params

    def _extract_class_call(self, node: ast.Call) -> tuple[str, set[str]] | None:
        """从调用节点提取类名和参数。"""
        class_name: str | None = None
        if isinstance(node.func, ast.Name):
            class_name = node.func.id
        elif isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
            class_name = node.func.attr

        if class_name:
            return class_name, self._extract_call_params(node)

        # 链式调用: Class(...).method(...) -- 递归提取类名。
        if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Call):
            return self._extract_class_call(node.func.value)

        return None

    def _extract_method_chain(self, node: ast.Call, methods: list[tuple[str, set[str]]] | None = None) -> list[tuple[str, set[str]]]:
        """提取方法链中所有方法及其参数。"""
        if methods is None:
            methods = []
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            return methods
        method_name = node.func.attr
        params = self._extract_call_params(node)
        methods.append((method_name, params))
        if isinstance(node.func.value, ast.Call):
            self._extract_method_chain(node.func.value, methods)
        return methods

    def _process_standalone_call(self, node: ast.Call) -> None:
        """处理独立的方法调用（如 ``obj.method(...)``）。"""
        if not isinstance(node.func, ast.Attribute):
            return
        if isinstance(node.func.value, ast.Name):
            obj_name = node.func.value.id
            method_name = node.func.attr
            if obj_name in self.var_types:
                params = self._extract_call_params(node)
                self.instance_methods[obj_name][method_name].update(params)
        # 递归处理链式调用。
        if isinstance(node.func.value, ast.Call):
            self._process_standalone_call(node.func.value)


# ---------------------------------------------------------------------------
# ManimParamChecker -- 参数校验器
# ---------------------------------------------------------------------------


class ManimParamChecker(ast.NodeVisitor):
    """AST 访问器，校验 Manim 类参数和方法是否存在拼写错误。

    Attributes:
        issues: 检测到的问题列表。
    """

    def __init__(self) -> None:
        super().__init__()
        self.issues: list[str] = []
        self._var_type_map: dict[str, str] = {}

    # -- 赋值语句：追踪变量类型 --

    def visit_Assign(self, node: ast.Assign) -> None:  # noqa: N802
        if isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name):
            class_name = node.value.func.id
            if class_name in MANIM_CLASS_PARAMS:
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        self._var_type_map[target.id] = class_name
        elif isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Attribute):
            if isinstance(node.value.func.value, ast.Name):
                var_name = node.value.func.value.id
                if var_name in self._var_type_map:
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            self._var_type_map[target.id] = self._var_type_map[var_name]
        self.generic_visit(node)

    # -- 方法调用：校验参数名 --

    def visit_Call(self, node: ast.Call) -> None:  # noqa: N802
        self._check_class_instantiation(node)
        self._check_method_call(node)
        self.generic_visit(node)

    # -- 内部辅助 --

    def _check_class_instantiation(self, node: ast.Call) -> None:
        """校验类实例化时的参数名。"""
        if not isinstance(node.func, ast.Name):
            return
        class_name = node.func.id
        valid_params = MANIM_CLASS_PARAMS.get(class_name)
        if valid_params is None:
            return
        for keyword in node.keywords:
            arg_name = keyword.arg
            if arg_name is not None and arg_name not in valid_params:
                similar = _find_similar_names(arg_name, valid_params)
                suggestion = f"，是否想使用: {', '.join(similar)}？" if similar else ""
                self.issues.append(
                    f"行 {node.lineno}: 类 '{class_name}' 不接受参数 '{arg_name}'{suggestion}"
                )

    def _check_method_call(self, node: ast.Call) -> None:
        """校验方法调用时参数名和方法是否存在。"""
        if not isinstance(node.func, ast.Attribute):
            return
        method_name = node.func.attr
        var_name: str | None = None

        if isinstance(node.func.value, ast.Name):
            var_name = node.func.value.id
            if var_name in self._var_type_map:
                var_type = self._var_type_map[var_name]
                known_methods = MANIM_CLASS_METHODS.get(var_type)
                if known_methods is not None and method_name not in known_methods:
                    similar = _find_similar_names(method_name, known_methods)
                    suggestion = f"，是否想使用: {', '.join(similar)}？" if similar else ""
                    self.issues.append(
                        f"行 {node.lineno}: 类 '{var_type}' 没有方法 '{method_name}'{suggestion}"
                    )
                    return

        # 校验方法参数。
        valid_method_params = MANIM_METHOD_PARAMS.get(method_name)
        if valid_method_params is not None:
            for keyword in node.keywords:
                arg_name = keyword.arg
                if arg_name is not None and arg_name not in valid_method_params:
                    class_name = self._var_type_map.get(var_name, "未知类") if var_name else "未知类"
                    similar = _find_similar_names(arg_name, valid_method_params)
                    suggestion = f"，是否想使用: {', '.join(similar)}？" if similar else ""
                    self.issues.append(
                        f"行 {node.lineno}: {class_name} 的方法 '{method_name}' 不接受参数 '{arg_name}'{suggestion}"
                    )


# ---------------------------------------------------------------------------
# 公共接口
# ---------------------------------------------------------------------------


def _find_similar_names(target: str, candidates: frozenset[str] | set[str] | Sequence[str], *, cutoff: float = 0.6) -> list[str]:
    """使用 difflib 查找与 *target* 相似的候选名称。"""
    return difflib.get_close_matches(target, candidates, n=3, cutoff=cutoff)


def analyze_manim_code(code: str) -> tuple[dict[str, list[str]], dict[str, str], dict[str, set[str]], dict[str, dict[str, set[str]]]]:
    """解析 Manim 代码，提取类/变量/参数/方法信息。

    Args:
        code: Manim Python 脚本源码。

    Returns:
        四元组 ``(classes, var_types, instance_params, instance_methods)``。
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return {}, {}, {}, {}
    analyzer = ManimAnalyzer()
    analyzer.visit(tree)
    return (
        dict(analyzer.classes),
        dict(analyzer.var_types),
        dict(analyzer.instance_params),
        {k: dict(v) for k, v in analyzer.instance_methods.items()},
    )


def check_manim_code(code: str) -> list[str]:
    """静态校验 Manim 代码中的参数与方法问题。

    Args:
        code: Manim Python 脚本源码。

    Returns:
        检测到的问题描述列表（可能为空）。
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return [f"语法错误: {exc}"]
    checker = ManimParamChecker()
    checker.visit(tree)
    return checker.issues


def stat_check_fix(code: str, max_iterations: int = 3) -> str:
    """基于静态分析的代码修复（第 2 层）。

    对 Manim 代码执行 AST 静态分析，检测参数拼写错误、不存在的方法调用
    等问题。当前实现仅执行检测与基本修正；未来可集成 LLM 进行自动修复。

    Args:
        code: Manim 脚本源码。
        max_iterations: 最大修复迭代次数（当前未使用 LLM 修复，保留接口）。

    Returns:
        修复后的代码；如无需修改则返回原始 *code*。
    """
    issues = check_manim_code(code)
    if not issues:
        return code

    # 当前版本：仅做基本文本替换修正常见拼写错误。
    # 后续迭代可接入 ai_fix_code 进行 LLM 修复。
    fixed_code = _apply_simple_fixes(code, issues)

    # 验证修复后是否仍有问题。
    for _ in range(max_iterations - 1):
        remaining = check_manim_code(fixed_code)
        if not remaining:
            break
        fixed_code = _apply_simple_fixes(fixed_code, remaining)

    return fixed_code


def _apply_simple_fixes(code: str, issues: list[str]) -> str:
    """对已知问题应用简单的文本替换修复。

    当前仅处理部分常见错误；更复杂的修复由 ``ai_fix_code`` 负责。
    """
    fixed = code
    # 示例: ShowCreation -> Create (与 script_templates 对齐)
    fixed = fixed.replace("ShowCreation", "Create")
    return fixed
