"""layout_check 模块单元测试。"""

from __future__ import annotations

import pytest

from app.features.video.pipeline.auto_fix.layout_check import (
    LayoutIssue,
    ManimLayoutChecker,
    check_layout,
    format_layout_issues,
)


class TestCheckLayout:
    """check_layout() 公开 API 测试。"""

    def test_clean_code_no_issues(self):
        code = "circle = Circle().shift(RIGHT * 2)"
        assert check_layout(code) == []

    def test_syntax_error_returns_empty(self):
        assert check_layout("def !!!") == []

    def test_x_out_of_bounds(self):
        code = "c = Circle().move_to([8, 0, 0])"
        issues = check_layout(code)
        assert any(i.severity == "error" and "X=" in i.message for i in issues)

    def test_y_out_of_bounds(self):
        code = "t = Text('hi').shift(UP * 5)"
        issues = check_layout(code)
        assert any(i.severity == "error" and "Y=" in i.message for i in issues)

    def test_within_bounds_no_issue(self):
        code = "s = Square().move_to([3, 2, 0])"
        assert check_layout(code) == []

    def test_overlap_warning(self):
        code = (
            "a = Circle().move_to([0, 0, 0])\n"
            "b = Square().move_to([0, 0, 0])"
        )
        issues = check_layout(code)
        assert any(i.severity == "warning" and "过近" in i.message for i in issues)

    def test_object_count_warning(self):
        lines = [f"o{i} = Dot()" for i in range(25)]
        code = "\n".join(lines)
        issues = check_layout(code, max_objects=20)
        assert any("超" in i.message for i in issues)


class TestFormatLayoutIssues:
    def test_empty_issues(self):
        assert format_layout_issues([]) == ""

    def test_formats_errors_and_warnings(self):
        issues = [
            LayoutIssue(severity="error", message="X out"),
            LayoutIssue(severity="warning", message="overlap"),
        ]
        text = format_layout_issues(issues)
        assert "[ERROR]" in text
        assert "[WARN]" in text


class TestManimLayoutChecker:
    """AST 解析细节测试。"""

    def _check(self, code: str) -> ManimLayoutChecker:
        import ast
        tree = ast.parse(code)
        checker = ManimLayoutChecker()
        checker.visit(tree)
        return checker

    def test_chained_shift(self):
        checker = self._check("s = Square().shift(RIGHT * 3)")
        assert len(checker.objects) == 1
        assert checker.objects[0].positions == [(3.0, 0.0)]

    def test_compound_vector(self):
        checker = self._check("c = Circle().shift(RIGHT * 2 + UP * 1)")
        assert checker.objects[0].positions == [(2.0, 1.0)]

    def test_move_to_array(self):
        checker = self._check("t = Text('hi').move_to([3, -2, 0])")
        assert checker.objects[0].positions == [(3.0, -2.0)]

    def test_np_array(self):
        checker = self._check("d = Dot().move_to(np.array([1, 2, 0]))")
        assert checker.objects[0].positions == [(1.0, 2.0)]

    def test_to_edge(self):
        checker = self._check("a = Arrow().to_edge(UP)")
        pos = checker.objects[0].positions[0]
        assert pos[1] == 3.5  # FRAME_Y_MAX

    def test_standalone_method_call(self):
        code = "c = Circle()\nc.shift(LEFT * 4)"
        checker = self._check(code)
        assert checker.objects[0].positions == [(-4.0, 0.0)]

    def test_unknown_class_ignored(self):
        checker = self._check("x = MyCustomThing()")
        assert len(checker.objects) == 0

    def test_negative_scalar(self):
        checker = self._check("c = Circle().shift(RIGHT * -3)")
        assert checker.objects[0].positions == [(-3.0, 0.0)]
