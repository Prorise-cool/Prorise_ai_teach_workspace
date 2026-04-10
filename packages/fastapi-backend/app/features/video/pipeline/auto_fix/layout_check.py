"""静态布局验证 -- 对标 manim4ai LayoutManager.static_check()。

渲染前 AST 静态分析检测布局问题：坐标越界、物体数量、静态重叠。
参考：manim4ai (aadya940/manim4ai)，FRAME_BOX=box(-7,-4,7,4)。
适配：manim4ai 运行时检查 Mobject，我们做 AST 静态分析。
"""

from __future__ import annotations

import ast
from dataclasses import dataclass, field

# 帧边界（manim4ai FRAME_BOX 基础上内缩 0.5 安全边距）
FRAME_X_MIN, FRAME_X_MAX = -6.5, 6.5
FRAME_Y_MIN, FRAME_Y_MAX = -3.5, 3.5
MAX_OBJECTS_PER_SCENE = 20

_DIRECTION_CONSTANTS: dict[str, tuple[float, float]] = {
    "UP": (0, 1), "DOWN": (0, -1), "LEFT": (-1, 0), "RIGHT": (1, 0),
    "UL": (-1, 1), "UR": (1, 1), "DL": (-1, -1), "DR": (1, -1),
    "ORIGIN": (0, 0),
}

_KNOWN_MOBJECT_CLASSES: frozenset[str] = frozenset({
    "Circle", "Square", "Rectangle", "Triangle", "Dot", "Line", "Arrow",
    "Text", "MathTex", "Tex", "NumberPlane", "Axes", "Graph",
    "VGroup", "Group", "SVGMobject", "ImageMobject", "Star", "Ellipse",
    "Polygon", "RegularPolygon", "AnnularSector", "Sector", "Arc",
    "BraceBetweenPoints", "Brace", "Table", "DecimalNumber", "Integer",
    "NumberLine", "BarChart", "ParametricFunction", "FunctionGraph",
})


@dataclass
class PlacedObject:
    """AST 中识别到的 Mobject 实例。"""
    name: str
    class_name: str
    line_no: int
    positions: list[tuple[float, float]] = field(default_factory=list)


@dataclass
class LayoutIssue:
    """一个布局问题。"""
    severity: str  # "error" | "warning"
    message: str
    line_no: int = 0


def _eval_scalar(node: ast.expr) -> float | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        inner = _eval_scalar(node.operand)
        return -inner if inner is not None else None
    return None


class ManimLayoutChecker(ast.NodeVisitor):
    """AST 布局检查器：坐标越界 + 物体数量 + 静态重叠。"""

    def __init__(self, *, max_objects: int = MAX_OBJECTS_PER_SCENE) -> None:
        self.max_objects = max_objects
        self.objects: list[PlacedObject] = []
        self._var_objects: dict[str, PlacedObject] = {}

    def visit_Assign(self, node: ast.Assign) -> None:
        if len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            cls = self._get_chained_class_name(node.value)
            if cls and cls in _KNOWN_MOBJECT_CLASSES:
                obj = PlacedObject(name=name, class_name=cls, line_no=node.lineno)
                self._track_chained_position(node.value, obj)
                self.objects.append(obj)
                self._var_objects[name] = obj
        self.generic_visit(node)

    def visit_Expr(self, node: ast.Expr) -> None:
        if isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Attribute):
            attr = node.value.func
            if isinstance(attr.value, ast.Name) and attr.value.id in self._var_objects:
                pos = self._extract_coord(attr.attr, node.value)
                if pos is not None:
                    self._var_objects[attr.value.id].positions.append(pos)
        self.generic_visit(node)

    def _get_chained_class_name(self, node: ast.expr) -> str | None:
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                return node.func.id
            if isinstance(node.func, ast.Attribute):
                return self._get_chained_class_name(node.func.value)
        return None

    def _track_chained_position(self, node: ast.expr, obj: PlacedObject) -> None:
        for method_name, call_node in self._extract_chain(node):
            pos = self._extract_coord(method_name, call_node)
            if pos is not None:
                obj.positions.append(pos)

    def _extract_chain(self, node: ast.expr) -> list[tuple[str, ast.Call]]:
        result: list[tuple[str, ast.Call]] = []
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            result.extend(self._extract_chain(node.func.value))
            result.append((node.func.attr, node))
        return result

    def _extract_coord(self, method: str, node: ast.Call) -> tuple[float, float] | None:
        if method == "move_to" and node.args:
            return self._eval_vec(node.args[0])
        if method == "shift" and node.args:
            return self._eval_vec(node.args[0])
        if method == "next_to" and len(node.args) >= 2:
            vec = self._eval_vec(node.args[1])
            return (vec[0] * 3.0, vec[1] * 3.0) if vec else None
        if method == "to_edge" and node.args:
            vec = self._eval_vec(node.args[0])
            if vec:
                return (
                    vec[0] * FRAME_X_MAX if vec[0] != 0 else 0,
                    vec[1] * FRAME_Y_MAX if vec[1] != 0 else 0,
                )
        return None

    def _eval_vec(self, node: ast.expr) -> tuple[float, float] | None:
        """解析向量：UP*3, RIGHT*2+UP*1, np.array([x,y,z]), [x,y,z]。"""
        if isinstance(node, ast.Name) and node.id in _DIRECTION_CONSTANTS:
            return _DIRECTION_CONSTANTS[node.id]

        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Mult):
            left, right = self._eval_vec(node.left), self._eval_vec(node.right)
            sl, sr = _eval_scalar(node.left), _eval_scalar(node.right)
            if left and sr is not None:
                return (left[0] * sr, left[1] * sr)
            if right and sl is not None:
                return (right[0] * sl, right[1] * sl)

        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
            left, right = self._eval_vec(node.left), self._eval_vec(node.right)
            if left and right:
                return (left[0] + right[0], left[1] + right[1])

        if isinstance(node, ast.Call):
            if (isinstance(node.func, ast.Attribute)
                    and isinstance(node.func.value, ast.Name)
                    and node.func.value.id == "np"
                    and node.func.attr == "array" and node.args):
                return self._parse_array(node.args[0])

        if isinstance(node, ast.List) and len(node.elts) >= 2:
            return self._parse_array(node)

        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            inner = self._eval_vec(node.operand)
            return (-inner[0], -inner[1]) if inner else None

        return None

    @staticmethod
    def _parse_array(node: ast.expr) -> tuple[float, float] | None:
        if isinstance(node, ast.List) and len(node.elts) >= 2:
            x, y = _eval_scalar(node.elts[0]), _eval_scalar(node.elts[1])
            if x is not None and y is not None:
                return (x, y)
        return None

    def get_issues(self) -> list[LayoutIssue]:
        """三层检查：数量 → 越界 → 重叠。"""
        issues: list[LayoutIssue] = []

        if len(self.objects) > self.max_objects:
            issues.append(LayoutIssue(
                severity="warning",
                message=f"场景物体数 ({len(self.objects)}) 超建议上限 ({self.max_objects})",
            ))

        for obj in self.objects:
            for pos in obj.positions:
                if not (FRAME_X_MIN <= pos[0] <= FRAME_X_MAX):
                    issues.append(LayoutIssue(
                        severity="error",
                        message=f"'{obj.name}' (行{obj.line_no}) X={pos[0]:.1f} 超安全区 [{FRAME_X_MIN},{FRAME_X_MAX}]",
                        line_no=obj.line_no,
                    ))
                if not (FRAME_Y_MIN <= pos[1] <= FRAME_Y_MAX):
                    issues.append(LayoutIssue(
                        severity="error",
                        message=f"'{obj.name}' (行{obj.line_no}) Y={pos[1]:.1f} 超安全区 [{FRAME_Y_MIN},{FRAME_Y_MAX}]",
                        line_no=obj.line_no,
                    ))

        for i, a in enumerate(self.objects):
            for b in self.objects[i + 1:]:
                for pa in a.positions:
                    for pb in b.positions:
                        dist = ((pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2) ** 0.5
                        if dist < 0.3:
                            issues.append(LayoutIssue(
                                severity="warning",
                                message=f"'{a.name}' 和 '{b.name}' 位置过近 (距离{dist:.2f})",
                                line_no=a.line_no,
                            ))
        return issues


def check_layout(code: str, *, max_objects: int = MAX_OBJECTS_PER_SCENE) -> list[LayoutIssue]:
    """对标 manim4ai static_check()：AST 解析 → 三层检查。"""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []
    checker = ManimLayoutChecker(max_objects=max_objects)
    checker.visit(tree)
    return checker.get_issues()


def format_layout_issues(issues: list[LayoutIssue]) -> str:
    """格式化为可读字符串，空串=无问题。"""
    if not issues:
        return ""
    lines = [
        f"  {'[ERROR]' if i.severity == 'error' else '[WARN]'} {i.message}"
        for i in issues
    ]
    return "Layout issues detected:\n" + "\n".join(lines)
