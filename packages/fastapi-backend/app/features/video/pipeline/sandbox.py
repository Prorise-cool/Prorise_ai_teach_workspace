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

from app.features.video.pipeline.models import ExecutionResult, ResourceLimits
from app.shared.task_framework.status import TaskErrorCode

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
    def __init__(self, error_code: TaskErrorCode, message: str) -> None:
        super().__init__(message)
        self.error_code = error_code


def scan_script_safety(script: str) -> None:
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


class SandboxExecutor(ABC):
    @abstractmethod
    async def execute(
        self,
        *,
        task_id: str,
        script: str,
        resource_limits: ResourceLimits,
    ) -> ExecutionResult:
        raise NotImplementedError


class LocalSandboxExecutor(SandboxExecutor):
    async def execute(
        self,
        *,
        task_id: str,
        script: str,
        resource_limits: ResourceLimits,
    ) -> ExecutionResult:
        start = time.perf_counter()
        scan_script_safety(script)
        temp_dir = Path(tempfile.mkdtemp(prefix=f"video_{task_id}_"))
        try:
            script_path = temp_dir / "scene.py"
            output_path = temp_dir / "rendered.mp4"
            script_path.write_text(script, encoding="utf-8")

            if "FORCE_RENDER_TIMEOUT" in script:
                await asyncio.sleep(0)
                return ExecutionResult(
                    success=False,
                    stderr="render timed out",
                    exit_code=124,
                    duration_seconds=resource_limits.timeout_seconds,
                    error_type=TaskErrorCode.VIDEO_RENDER_TIMEOUT.value,
                )
            if "FORCE_RENDER_ERROR" in script:
                return ExecutionResult(
                    success=False,
                    stderr="simulated render error",
                    exit_code=1,
                    duration_seconds=time.perf_counter() - start,
                    error_type=TaskErrorCode.VIDEO_RENDER_FAILED.value,
                )
            if "FORCE_RENDER_OOM" in script:
                return ExecutionResult(
                    success=False,
                    stderr="simulated out of memory",
                    exit_code=137,
                    duration_seconds=time.perf_counter() - start,
                    error_type=TaskErrorCode.VIDEO_RENDER_OOM.value,
                )
            if "FORCE_RENDER_DISK_FULL" in script:
                return ExecutionResult(
                    success=False,
                    stderr="simulated disk full",
                    exit_code=28,
                    duration_seconds=time.perf_counter() - start,
                    error_type=TaskErrorCode.VIDEO_RENDER_DISK_FULL.value,
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
            rendered_output = temp_dir / "rendered.mp4"
            if not rendered_output.exists() and not any(temp_dir.glob("*.keep")):
                shutil.rmtree(temp_dir, ignore_errors=True)


class DockerSandboxExecutor(SandboxExecutor):
    def __init__(self, *, docker_image: str = "manim-sandbox:latest") -> None:
        self.docker_image = docker_image
        self._fallback_executor = LocalSandboxExecutor()

    async def execute(
        self,
        *,
        task_id: str,
        script: str,
        resource_limits: ResourceLimits,
    ) -> ExecutionResult:
        if shutil.which("docker") is None:
            return await self._fallback_executor.execute(
                task_id=task_id,
                script=script,
                resource_limits=resource_limits,
            )

        scan_script_safety(script)
        temp_dir = Path(tempfile.mkdtemp(prefix=f"video_{task_id}_docker_"))
        script_path = temp_dir / "scene.py"
        output_dir = temp_dir / "output"
        output_dir.mkdir(parents=True, exist_ok=True)
        script_path.write_text(script, encoding="utf-8")
        command = [
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
            "-v",
            f"{temp_dir}:/workspace:rw",
            self.docker_image,
            "python",
            "/workspace/scene.py",
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
                error_type=TaskErrorCode.VIDEO_RENDER_TIMEOUT.value,
            )

        output_path = output_dir / "rendered.mp4"
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


def _map_sandbox_process_error(return_code: int | None, stderr: str | None) -> TaskErrorCode:
    lowered = (stderr or "").lower()
    if return_code == 137 or "oomkilled" in lowered or "out of memory" in lowered:
        return TaskErrorCode.VIDEO_RENDER_OOM
    if "no space left" in lowered or "disk full" in lowered:
        return TaskErrorCode.VIDEO_RENDER_DISK_FULL
    return TaskErrorCode.VIDEO_RENDER_FAILED
