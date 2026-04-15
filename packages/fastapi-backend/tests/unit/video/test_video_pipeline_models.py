import asyncio
import subprocess
from pathlib import Path
from types import SimpleNamespace

from app.features.video.pipeline.models import (
    ExecutionResult,
    ManimCodeResult,
    ResourceLimits,
    UnderstandingResult,
    VIDEO_STAGE_PROFILES,
    VideoStage,
    build_stage_snapshot,
)
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.orchestration.orchestrator import VideoPipelineService
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.features.video.pipeline.sandbox import (
    DockerSandboxExecutor,
    LocalSandboxExecutor,
    ScriptSecurityViolation,
    _build_manim_runner_script,
    _detect_scene_class_name,
    resolve_local_fallback_policy,
    scan_script_safety,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.services import _cleanup_pipeline_temp_dirs
from app.features.video.service import VideoService
from app.infra.redis_client import RuntimeStore
from app.providers.factory import ProviderFactory, build_default_registry
from app.shared.cos_client import CosClient


def test_video_stage_profiles_are_contiguous_and_cover_full_progress_range() -> None:
    assert [profile.stage for profile in VIDEO_STAGE_PROFILES] == [
        VideoStage.UNDERSTANDING,
        VideoStage.SOLVE,
        VideoStage.STORYBOARD,
        VideoStage.MANIM_GEN,
        VideoStage.TTS,
        VideoStage.MANIM_FIX,
        VideoStage.RENDER,
        VideoStage.RENDER_VERIFY,
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
    assert snapshot.progress == 66


def test_video_pipeline_service_clamps_regressive_parallel_progress_events_without_hiding_stage(tmp_path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    service = VideoPipelineService(
        runtime_store=RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory"),
        metadata_service=VideoService(asset_store=asset_store),
        provider_factory=ProviderFactory(build_default_registry()),
        settings=SimpleNamespace(
            environment="test",
            provider_runtime_source="settings",
            default_llm_provider="stub-llm",
            default_tts_provider="stub-tts",
            video_sandbox_allow_local_fallback=True,
            video_render_quality="l",
        ),
        asset_store=asset_store,
    )

    class _RecordingTask:
        def __init__(self) -> None:
            self.context = SimpleNamespace(task_id="video_progress_guard_case")
            self.snapshots: list[dict[str, object]] = []

        async def emit_runtime_snapshot(self, **payload) -> None:  # noqa: ANN003
            self.snapshots.append(payload)

    task = _RecordingTask()

    asyncio.run(service._emit_stage(task, VideoStage.TTS, 1.0, "旁白生成完成"))
    asyncio.run(service._emit_stage(task, VideoStage.MANIM_GEN, 1.0, "生成动画脚本完成"))

    assert [snapshot["progress"] for snapshot in task.snapshots] == [55, 55]
    assert task.snapshots[0]["context"]["stage"] == VideoStage.TTS.value
    assert task.snapshots[-1]["context"]["stage"] == VideoStage.MANIM_GEN.value
    assert task.snapshots[-1]["context"]["stageProgress"] == 100


def test_video_pipeline_service_clamps_fix_stage_progress_without_hiding_fix_state(tmp_path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    service = VideoPipelineService(
        runtime_store=RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory"),
        metadata_service=VideoService(asset_store=asset_store),
        provider_factory=ProviderFactory(build_default_registry()),
        settings=SimpleNamespace(
            environment="test",
            provider_runtime_source="settings",
            default_llm_provider="stub-llm",
            default_tts_provider="stub-tts",
            video_sandbox_allow_local_fallback=True,
            video_render_quality="l",
        ),
        asset_store=asset_store,
    )

    class _RecordingTask:
        def __init__(self) -> None:
            self.context = SimpleNamespace(task_id="video_fix_guard_case")
            self.snapshots: list[dict[str, object]] = []

        async def emit_runtime_snapshot(self, **payload) -> None:  # noqa: ANN003
            self.snapshots.append(payload)

    task = _RecordingTask()

    asyncio.run(service._emit_stage(task, VideoStage.RENDER, 0.0, "正在渲染动画"))
    asyncio.run(
        service._emit_stage(
            task,
            VideoStage.MANIM_FIX,
            0.4,
            "开始第 1 次自动修复",
            extra={"attemptNo": 1, "fixEvent": "fix_attempt_start"},
        )
    )

    assert [snapshot["progress"] for snapshot in task.snapshots] == [61, 61]
    assert task.snapshots[-1]["context"]["stage"] == VideoStage.MANIM_FIX.value
    assert task.snapshots[-1]["context"]["stageProgress"] == 40


def test_video_pipeline_service_clamps_failed_terminal_progress_without_hiding_failed_stage(tmp_path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    service = VideoPipelineService(
        runtime_store=RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory"),
        metadata_service=VideoService(asset_store=asset_store),
        provider_factory=ProviderFactory(build_default_registry()),
        settings=SimpleNamespace(
            environment="test",
            provider_runtime_source="settings",
            default_llm_provider="stub-llm",
            default_tts_provider="stub-tts",
            video_sandbox_allow_local_fallback=True,
            video_render_quality="l",
        ),
        asset_store=asset_store,
    )
    service._max_emitted_progress = 58
    task_runtime = VideoRuntimeStateStore(
        RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory"),
        "video_failed_guard_case",
    )

    result = asyncio.run(
        service._handle_pipeline_failure(
            SimpleNamespace(task_id="video_failed_guard_case", user_id="u_1"),
            task_runtime,
            VideoPipelineError(
                stage=VideoStage.MANIM_GEN,
                error_code=VideoTaskErrorCode.VIDEO_MANIM_GEN_FAILED,
                message="全部 Provider 均不可用：TimeoutError",
            ),
        )
    )

    assert result.progress == 58
    assert result.context["stage"] == VideoStage.MANIM_GEN.value
    assert result.context["failedStage"] == VideoStage.MANIM_GEN.value
    assert result.context["progress"] == 58



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


def test_docker_sandbox_fails_closed_when_image_runtime_is_unavailable(monkeypatch) -> None:
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

    assert result.success is False
    assert result.output_path is None
    assert result.error_type == "VIDEO_RENDER_FAILED"
    assert "Unable to find image" in result.stderr


def test_docker_sandbox_fails_closed_when_docker_executable_is_missing(monkeypatch) -> None:
    executor = DockerSandboxExecutor(docker_image="manim-sandbox:latest")
    limits = ResourceLimits()

    monkeypatch.setattr("app.features.video.pipeline.sandbox.shutil.which", lambda command: None)

    result = asyncio.run(
        executor.execute(task_id="video_docker_missing_case", script="from manim import *", resource_limits=limits)
    )

    assert result.success is False
    assert result.output_path is None
    assert result.error_type == "VIDEO_RENDER_FAILED"
    assert "docker executable is unavailable" in (result.stderr or "")


def test_docker_sandbox_allows_explicit_local_fallback_for_dev_and_test(monkeypatch) -> None:
    executor = DockerSandboxExecutor(
        docker_image="manim-sandbox:latest",
        allow_local_fallback=True,
    )
    limits = ResourceLimits()

    monkeypatch.setattr("app.features.video.pipeline.sandbox.shutil.which", lambda command: None)

    result = asyncio.run(
        executor.execute(task_id="video_docker_fallback_case", script="from manim import *", resource_limits=limits)
    )

    assert result.success is True
    assert result.output_path is not None


def test_resolve_local_fallback_policy_requires_supported_environment() -> None:
    assert resolve_local_fallback_policy(environment="development", configured=True) is True
    assert resolve_local_fallback_policy(environment="test", configured=True) is True
    assert resolve_local_fallback_policy(environment="production", configured=True) is False
    assert resolve_local_fallback_policy(environment="development", configured=False) is False


def test_video_pipeline_service_wires_local_fallback_policy_from_settings(tmp_path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    service = VideoPipelineService(
        runtime_store=RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory"),
        metadata_service=VideoService(asset_store=asset_store),
        provider_factory=ProviderFactory(build_default_registry()),
        settings=SimpleNamespace(
            environment="development",
            provider_runtime_source="settings",
            default_llm_provider="stub-llm",
            default_tts_provider="stub-tts",
            video_sandbox_allow_local_fallback=True,
            video_render_quality="l",
        ),
        asset_store=asset_store,
    )

    assert isinstance(service.sandbox_executor, DockerSandboxExecutor)
    assert service.sandbox_executor.allow_local_fallback is True
    assert service.sandbox_executor.render_quality == "l"


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
                "class FlexibleElementsScene(MovingCameraScene):\n"
                "    def helper(self):\n"
                "        return None\n\n"
                "class DemoScene(FlexibleElementsScene):\n"
                "    def construct(self):\n"
                "        self.wait(1)\n"
            ),
            resource_limits=limits,
        )
    )

    assert result.success is True
    assert result.output_path is not None
    assert Path(result.output_path).read_bytes() == b"REAL_MP4_DATA"


def test_build_manim_runner_script_uses_configured_quality_flag() -> None:
    script = _build_manim_runner_script("h")

    assert '"-qh"' in script
    assert '"-ql"' not in script


def test_detect_scene_class_name_prefers_concrete_scene_with_construct() -> None:
    script = (
        "from manim import *\n\n"
        "class FlexibleElementsScene(MovingCameraScene):\n"
        "    def helper(self):\n"
        "        return None\n\n"
        "class DemoScene(FlexibleElementsScene):\n"
        "    def construct(self):\n"
        "        self.wait(1)\n"
    )

    assert _detect_scene_class_name(script) == "DemoScene"


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
