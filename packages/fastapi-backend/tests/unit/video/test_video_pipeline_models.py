import asyncio
import subprocess
from pathlib import Path

from app.features.video.pipeline.models import ResourceLimits, VIDEO_STAGE_PROFILES, VideoStage, build_stage_snapshot
from app.features.video.pipeline.sandbox import (
    DockerSandboxExecutor,
    LocalSandboxExecutor,
    ScriptSecurityViolation,
    scan_script_safety,
)
from app.features.video.pipeline.services import _cleanup_pipeline_temp_dirs


def test_video_stage_profiles_are_contiguous_and_cover_full_progress_range() -> None:
    assert [profile.stage for profile in VIDEO_STAGE_PROFILES] == [
        VideoStage.UNDERSTANDING,
        VideoStage.STORYBOARD,
        VideoStage.MANIM_GEN,
        VideoStage.MANIM_FIX,
        VideoStage.RENDER,
        VideoStage.TTS,
        VideoStage.COMPOSE,
        VideoStage.UPLOAD,
    ]

    previous_end = -1
    for profile in VIDEO_STAGE_PROFILES:
        assert profile.progress_start == previous_end + 1
        assert profile.progress_end >= profile.progress_start
        previous_end = profile.progress_end

    assert VIDEO_STAGE_PROFILES[0].progress_start == 0
    assert VIDEO_STAGE_PROFILES[-1].progress_end == 100


def test_build_stage_snapshot_exposes_current_stage_label_and_stage_progress() -> None:
    snapshot = build_stage_snapshot(VideoStage.RENDER, 0.5)

    assert snapshot.stage == VideoStage.RENDER
    assert snapshot.current_stage == VideoStage.RENDER
    assert snapshot.stage_label == "渲染动画"
    assert snapshot.stage_progress == 50
    assert snapshot.progress == 63


def test_script_scanner_blocks_forbidden_imports() -> None:
    script = "import subprocess\nprint('unsafe')\n"

    try:
        scan_script_safety(script)
    except ScriptSecurityViolation as exc:
        assert exc.error_code.value == "SANDBOX_PROCESS_VIOLATION"
    else:  # pragma: no cover
        raise AssertionError("expected ScriptSecurityViolation")


def test_local_sandbox_maps_oom_and_disk_full_markers() -> None:
    executor = LocalSandboxExecutor()
    limits = ResourceLimits()

    oom_result = asyncio.run(
        executor.execute(task_id="video_oom_case", script="FORCE_RENDER_OOM", resource_limits=limits)
    )
    disk_full_result = asyncio.run(
        executor.execute(task_id="video_disk_case", script="FORCE_RENDER_DISK_FULL", resource_limits=limits)
    )

    assert oom_result.success is False
    assert oom_result.error_type == "VIDEO_RENDER_OOM"
    assert disk_full_result.success is False
    assert disk_full_result.error_type == "VIDEO_RENDER_DISK_FULL"


def test_docker_sandbox_falls_back_to_local_executor_when_image_runtime_is_unavailable(monkeypatch) -> None:
    executor = DockerSandboxExecutor(docker_image="manim-sandbox:latest")
    limits = ResourceLimits()

    monkeypatch.setattr("app.features.video.pipeline.sandbox.shutil.which", lambda command: "/usr/bin/docker")

    def fake_run(*args, **kwargs):
        return subprocess.CompletedProcess(
            args=args[0],
            returncode=1,
            stdout="",
            stderr=(
                "Unable to find image 'manim-sandbox:latest' locally\n"
                "docker: Error response from daemon: tls: first record does not look like a TLS handshake"
            ),
        )

    monkeypatch.setattr("app.features.video.pipeline.sandbox.subprocess.run", fake_run)

    result = asyncio.run(
        executor.execute(task_id="video_docker_fallback_case", script="from manim import *", resource_limits=limits)
    )

    assert result.success is True
    assert result.output_path is not None


def test_docker_sandbox_runs_wrapper_and_collects_rendered_mp4(monkeypatch) -> None:
    executor = DockerSandboxExecutor(docker_image="manim-sandbox:latest")
    limits = ResourceLimits()

    monkeypatch.setattr("app.features.video.pipeline.sandbox.shutil.which", lambda command: "/usr/bin/docker")

    def fake_run(command, **kwargs):  # noqa: ANN001
        assert command[-2] == "/workspace/run_manim.py"
        assert command[-1] == "DemoScene"
        mount_arg = command[command.index("-v") + 1]
        host_workspace = Path(mount_arg.split(":", 1)[0])
        output_path = host_workspace / "output" / "rendered.mp4"
        output_path.write_bytes(b"REAL_MP4_DATA")
        return subprocess.CompletedProcess(args=command, returncode=0, stdout="", stderr="")

    monkeypatch.setattr("app.features.video.pipeline.sandbox.subprocess.run", fake_run)

    result = asyncio.run(
        executor.execute(
            task_id="video_docker_success_case",
            script=(
                "from manim import *\n\n"
                "class DemoScene(Scene):\n"
                "    def construct(self):\n"
                "        self.wait(1)\n"
            ),
            resource_limits=limits,
        )
    )

    assert result.success is True
    assert result.output_path is not None
    assert Path(result.output_path).read_bytes() == b"REAL_MP4_DATA"


def test_cleanup_pipeline_temp_dirs_removes_known_temp_roots(tmp_path) -> None:
    render_dir = tmp_path / "video_render_case"
    tts_dir = tmp_path / "video_tts_case"
    compose_dir = tmp_path / "video_compose_case"
    render_dir.mkdir()
    tts_dir.mkdir()
    compose_dir.mkdir()

    render_path = render_dir / "rendered.mp4"
    audio_path = tts_dir / "narration.mp3"
    compose_path = compose_dir / "output.mp4"
    cover_path = compose_dir / "cover.jpg"
    render_path.write_bytes(b"render")
    audio_path.write_bytes(b"audio")
    compose_path.write_bytes(b"video")
    cover_path.write_bytes(b"cover")

    _cleanup_pipeline_temp_dirs(
        str(render_path),
        str(audio_path),
        str(compose_path),
        str(cover_path),
    )

    assert not render_dir.exists()
    assert not tts_dir.exists()
    assert not compose_dir.exists()
