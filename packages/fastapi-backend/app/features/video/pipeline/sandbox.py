"""视频流水线 Manim 沙箱与脚本安全扫描。"""

from __future__ import annotations

import ast
import asyncio
import shutil
import subprocess
import tempfile
import time
from abc import ABC, abstractmethod
from pathlib import Path

from app.features.video.pipeline.constants import (
    DEFAULT_MANIM_SCENE_CLASS,
    SANDBOX_ENV_VARS,
    SANDBOX_INFRASTRUCTURE_ERROR_MARKERS,
    SANDBOX_OUTPUT_DIR,
    SANDBOX_RENDERED_FILE,
    SANDBOX_RUNNER_SCRIPT,
    SANDBOX_SCENE_SCRIPT,
    SANDBOX_WORKSPACE_MOUNT,
)
from app.features.video.pipeline.errors import VideoTaskErrorCode
from app.features.video.pipeline.models import ExecutionResult, ResourceLimits

FORBIDDEN_IMPORTS = {
    "os": VideoTaskErrorCode.SANDBOX_FS_VIOLATION,
    "pathlib": VideoTaskErrorCode.SANDBOX_FS_VIOLATION,
    "subprocess": VideoTaskErrorCode.SANDBOX_PROCESS_VIOLATION,
    "socket": VideoTaskErrorCode.SANDBOX_NETWORK_VIOLATION,
    "requests": VideoTaskErrorCode.SANDBOX_NETWORK_VIOLATION,
    "httpx": VideoTaskErrorCode.SANDBOX_NETWORK_VIOLATION,
}
FORBIDDEN_CALLS = {
    "eval": VideoTaskErrorCode.SANDBOX_PROCESS_VIOLATION,
    "exec": VideoTaskErrorCode.SANDBOX_PROCESS_VIOLATION,
    "__import__": VideoTaskErrorCode.SANDBOX_PROCESS_VIOLATION,
}


class ScriptSecurityViolation(ValueError):
    """Manim 脚本安全扫描违规异常。"""
    def __init__(self, error_code: VideoTaskErrorCode, message: str) -> None:
        """初始化沙箱执行器。"""
        super().__init__(message)
        self.error_code = error_code


def scan_script_safety(script: str) -> None:
    """静态扫描 Manim 脚本中的危险导入和调用。"""
    try:
        tree = ast.parse(script)
    except SyntaxError as exc:
        raise ScriptSecurityViolation(VideoTaskErrorCode.VIDEO_MANIM_GEN_FAILED, str(exc)) from exc

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


class SandboxExecutor(ABC):
    """沙箱执行器抽象基类。"""
    @abstractmethod
    async def execute(
        self,
        *,
        task_id: str,
        script: str,
        resource_limits: ResourceLimits,
    ) -> ExecutionResult:
        """在沙箱中执行 Manim 脚本。"""
        raise NotImplementedError


class LocalSandboxExecutor(SandboxExecutor):
    """本地沙箱执行器（用于开发和测试）。"""
    async def execute(
        self,
        *,
        task_id: str,
        script: str,
        resource_limits: ResourceLimits,
    ) -> ExecutionResult:
        """在沙箱中执行 Manim 脚本。"""
        start = time.perf_counter()
        scan_script_safety(script)
        temp_dir = Path(tempfile.mkdtemp(prefix=f"video_{task_id}_"))
        try:
            script_path = temp_dir / SANDBOX_SCENE_SCRIPT
            output_path = temp_dir / SANDBOX_RENDERED_FILE
            script_path.write_text(script, encoding="utf-8")

            if "FORCE_RENDER_TIMEOUT" in script:
                await asyncio.sleep(0)
                return ExecutionResult(
                    success=False,
                    stderr="render timed out",
                    exit_code=124,
                    duration_seconds=resource_limits.timeout_seconds,
                    error_type=VideoTaskErrorCode.VIDEO_RENDER_TIMEOUT.value,
                )
            if "FORCE_RENDER_ERROR" in script:
                return ExecutionResult(
                    success=False,
                    stderr="simulated render error",
                    exit_code=1,
                    duration_seconds=time.perf_counter() - start,
                    error_type=VideoTaskErrorCode.VIDEO_RENDER_FAILED.value,
                )
            if "FORCE_RENDER_OOM" in script:
                return ExecutionResult(
                    success=False,
                    stderr="simulated out of memory",
                    exit_code=137,
                    duration_seconds=time.perf_counter() - start,
                    error_type=VideoTaskErrorCode.VIDEO_RENDER_OOM.value,
                )
            if "FORCE_RENDER_DISK_FULL" in script:
                return ExecutionResult(
                    success=False,
                    stderr="simulated disk full",
                    exit_code=28,
                    duration_seconds=time.perf_counter() - start,
                    error_type=VideoTaskErrorCode.VIDEO_RENDER_DISK_FULL.value,
                )

            output_path.write_bytes(b"FAKE_MP4_DATA")
            return ExecutionResult(
                success=True,
                output_path=str(output_path),
                stderr="",
                exit_code=0,
                duration_seconds=time.perf_counter() - start,
                resource_usage={
                    "cpuCount": resource_limits.cpu_count,
                    "memoryMb": resource_limits.memory_mb,
                },
            )
        finally:
            rendered_output = temp_dir / SANDBOX_RENDERED_FILE
            if not rendered_output.exists() and not any(temp_dir.glob("*.keep")):
                shutil.rmtree(temp_dir, ignore_errors=True)


class DockerSandboxExecutor(SandboxExecutor):
    """Docker 容器沙箱执行器。"""
    def __init__(
        self,
        *,
        docker_image: str = "manim-sandbox:latest",
        allow_local_fallback: bool = False,
    ) -> None:
        """初始化沙箱执行器。"""
        self.docker_image = docker_image
        self.allow_local_fallback = allow_local_fallback
        self._fallback_executor = LocalSandboxExecutor()

    async def execute(
        self,
        *,
        task_id: str,
        script: str,
        resource_limits: ResourceLimits,
    ) -> ExecutionResult:
        """在沙箱中执行 Manim 脚本。"""
        if shutil.which("docker") is None:
            return await self._handle_infrastructure_failure(
                task_id=task_id,
                script=script,
                resource_limits=resource_limits,
                stderr="docker executable is unavailable",
            )

        scan_script_safety(script)
        temp_dir = Path(tempfile.mkdtemp(prefix=f"video_{task_id}_docker_"))
        script_path = temp_dir / SANDBOX_SCENE_SCRIPT
        runner_path = temp_dir / SANDBOX_RUNNER_SCRIPT
        output_dir = temp_dir / SANDBOX_OUTPUT_DIR
        output_dir.mkdir(parents=True, exist_ok=True)
        script_path.write_text(script, encoding="utf-8")
        runner_path.write_text(_build_manim_runner_script(), encoding="utf-8")
        scene_class_name = _detect_scene_class_name(script) or DEFAULT_MANIM_SCENE_CLASS
        docker_command = [
            "docker",
            "run",
            "--rm",
            "--cpus",
            str(resource_limits.cpu_count),
            "--memory",
            f"{resource_limits.memory_mb}m",
            "--network",
            "none",
            "--read-only",
            "--tmpfs",
            f"/tmp:rw,size={resource_limits.tmp_size_mb}m",
            "--pids-limit",
            "64",
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
        ]
        command = [
            *docker_command,
            *_docker_env_args(),
            "-v",
            f"{temp_dir}:{SANDBOX_WORKSPACE_MOUNT}:rw",
            self.docker_image,
            f"{SANDBOX_WORKSPACE_MOUNT}/{SANDBOX_RUNNER_SCRIPT}",
            scene_class_name,
        ]

        def run_command() -> subprocess.CompletedProcess[str]:
            return subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=resource_limits.timeout_seconds,
                check=False,
            )

        started_at = time.perf_counter()
        try:
            process = await asyncio.to_thread(run_command)
        except subprocess.TimeoutExpired:
            shutil.rmtree(temp_dir, ignore_errors=True)
            return ExecutionResult(
                success=False,
                stderr="render timed out",
                exit_code=124,
                duration_seconds=resource_limits.timeout_seconds,
                error_type=VideoTaskErrorCode.VIDEO_RENDER_TIMEOUT.value,
            )

        if _should_fallback_to_local(process.stderr):
            return await self._handle_infrastructure_failure(
                task_id=task_id,
                script=script,
                resource_limits=resource_limits,
                stderr=process.stderr or "sandbox infrastructure unavailable",
                cleanup_dir=temp_dir,
            )

        output_path = output_dir / SANDBOX_RENDERED_FILE
        if process.returncode != 0 or not output_path.exists():
            error_type = _map_sandbox_process_error(process.returncode, process.stderr)
            shutil.rmtree(temp_dir, ignore_errors=True)
            return ExecutionResult(
                success=False,
                stderr=process.stderr,
                exit_code=process.returncode,
                duration_seconds=time.perf_counter() - started_at,
                error_type=error_type.value,
            )

        return ExecutionResult(
            success=True,
            output_path=str(output_path),
            stderr=process.stderr,
            exit_code=process.returncode,
            duration_seconds=time.perf_counter() - started_at,
        )

    async def _handle_infrastructure_failure(
        self,
        *,
        task_id: str,
        script: str,
        resource_limits: ResourceLimits,
        stderr: str,
        cleanup_dir: Path | None = None,
    ) -> ExecutionResult:
        if cleanup_dir is not None:
            shutil.rmtree(cleanup_dir, ignore_errors=True)

        if self.allow_local_fallback:
            return await self._fallback_executor.execute(
                task_id=task_id,
                script=script,
                resource_limits=resource_limits,
            )

        return ExecutionResult(
            success=False,
            stderr=stderr,
            exit_code=1,
            duration_seconds=0,
            error_type=VideoTaskErrorCode.VIDEO_RENDER_FAILED.value,
        )


def resolve_local_fallback_policy(*, environment: str, configured: bool) -> bool:
    """仅在开发/测试环境且显式开启时允许回退到本地执行。"""
    normalized_environment = environment.strip().lower()
    return configured and normalized_environment in {"development", "test"}


def _map_sandbox_process_error(return_code: int | None, stderr: str | None) -> VideoTaskErrorCode:
    lowered = (stderr or "").lower()
    if return_code == 137 or "oomkilled" in lowered or "out of memory" in lowered:
        return VideoTaskErrorCode.VIDEO_RENDER_OOM
    if "no space left" in lowered or "disk full" in lowered:
        return VideoTaskErrorCode.VIDEO_RENDER_DISK_FULL
    return VideoTaskErrorCode.VIDEO_RENDER_FAILED


def _should_fallback_to_local(stderr: str | None) -> bool:
    lowered = (stderr or "").lower()
    return any(marker in lowered for marker in SANDBOX_INFRASTRUCTURE_ERROR_MARKERS)


def _docker_env_args() -> list[str]:
    env_args: list[str] = []
    for env_var in SANDBOX_ENV_VARS:
        env_args.extend(["--env", env_var])
    return env_args


def _detect_scene_class_name(script: str) -> str | None:
    tree = ast.parse(script)
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        for base in node.bases:
            base_name = _read_base_name(base)
            if base_name is not None and base_name.endswith("Scene"):
                return node.name
    return None


def _read_base_name(node: ast.expr) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def _build_manim_runner_script() -> str:
    return """from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

SCENE_PATH = Path("{workspace_mount}/{scene_script}")
OUTPUT_DIR = Path("{workspace_mount}/{output_dir}")
MEDIA_DIR = OUTPUT_DIR / "media"


def main() -> int:
    scene_class = sys.argv[1] if len(sys.argv) > 1 else "{default_scene_class}"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    command = [
        "manim",
        "-ql",
        "--disable_caching",
        "--media_dir",
        str(MEDIA_DIR),
        "-o",
        "rendered",
        str(SCENE_PATH),
        scene_class,
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    sys.stdout.write(completed.stdout)
    sys.stderr.write(completed.stderr)
    if completed.returncode != 0:
        return completed.returncode

    candidates = sorted(
        (path for path in MEDIA_DIR.rglob("*.mp4") if path.is_file()),
        key=lambda path: path.stat().st_size,
        reverse=True,
    )
    if not candidates:
        sys.stderr.write("No mp4 artifact produced by manim\\n")
        return 2

    shutil.copyfile(candidates[0], OUTPUT_DIR / "{rendered_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
""".format(
        default_scene_class=DEFAULT_MANIM_SCENE_CLASS,
        output_dir=SANDBOX_OUTPUT_DIR,
        rendered_file=SANDBOX_RENDERED_FILE,
        scene_script=SANDBOX_SCENE_SCRIPT,
        workspace_mount=SANDBOX_WORKSPACE_MOUNT,
    )
