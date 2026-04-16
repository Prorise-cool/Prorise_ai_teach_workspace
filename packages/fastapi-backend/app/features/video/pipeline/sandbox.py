"""视频流水线 Manim 脚本安全扫描。

渲染直接通过本地 manim 执行（与 ManimCat 对齐），
不再使用 Docker 沙箱或本地沙箱执行器。
"""

from __future__ import annotations

import ast

from app.features.video.pipeline.errors import VideoTaskErrorCode as TaskErrorCode

FORBIDDEN_IMPORTS = {
    "os": TaskErrorCode.SANDBOX_FS_VIOLATION,
    "pathlib": TaskErrorCode.SANDBOX_FS_VIOLATION,
    "subprocess": TaskErrorCode.SANDBOX_PROCESS_VIOLATION,
    "socket": TaskErrorCode.SANDBOX_NETWORK_VIOLATION,
    "requests": TaskErrorCode.SANDBOX_NETWORK_VIOLATION,
    "httpx": TaskErrorCode.SANDBOX_NETWORK_VIOLATION,
}
FORBIDDEN_CALLS = {
    "eval": TaskErrorCode.SANDBOX_PROCESS_VIOLATION,
    "exec": TaskErrorCode.SANDBOX_PROCESS_VIOLATION,
    "__import__": TaskErrorCode.SANDBOX_PROCESS_VIOLATION,
}


class ScriptSecurityViolation(ValueError):
    """Manim 脚本安全扫描违规异常。"""
    def __init__(self, error_code: TaskErrorCode, message: str) -> None:
        super().__init__(message)
        self.error_code = error_code


def scan_script_safety(script: str) -> None:
    """静态扫描 Manim 脚本中的危险导入和调用。"""
    try:
        tree = ast.parse(script)
    except SyntaxError as exc:
        raise ScriptSecurityViolation(TaskErrorCode.VIDEO_MANIM_GEN_FAILED, str(exc)) from exc

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_name = alias.name.split(".", 1)[0]
                if root_name in FORBIDDEN_IMPORTS:
                    raise ScriptSecurityViolation(
                        FORBIDDEN_IMPORTS[root_name],
                        f"forbidden import detected: {alias.name}",
                    )
        elif isinstance(node, ast.ImportFrom):
            module_name = (node.module or "").split(".", 1)[0]
            if module_name in FORBIDDEN_IMPORTS:
                raise ScriptSecurityViolation(
                    FORBIDDEN_IMPORTS[module_name],
                    f"forbidden import detected: {node.module}",
                )
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in FORBIDDEN_CALLS:
                raise ScriptSecurityViolation(
                    FORBIDDEN_CALLS[node.func.id],
                    f"forbidden call detected: {node.func.id}",
                )
