# Story 4.4: Manim 沙箱执行与资源限制

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 平台与用户，
I want Manim 渲染始终在受限沙箱中执行，
so that 系统不会为了提高成功率而突破安全边界。

## Acceptance Criteria

1. 系统执行渲染任务时，Manim 脚本在受限沙箱环境中运行，强制遵循资源约束：`1 vCPU`、`2 GiB RAM`、`120s/attempt` 超时、`1 GiB /tmp` 临时空间、禁止外网访问、进程隔离，这些限制不允许被业务层绕过。
2. 沙箱执行器接收 Manim 脚本内容，在隔离环境中执行渲染，产出视频片段文件（`.mp4` 或等效格式），执行成功后将产物路径写入 Redis 运行态。
3. 渲染脚本尝试访问不允许的外部资源（网络、文件系统越界、子进程创建等）时，安全策略生效并记录明确错误类型（`SANDBOX_NETWORK_VIOLATION`、`SANDBOX_FS_VIOLATION`、`SANDBOX_PROCESS_VIOLATION`），错误结果进入统一失败语义。
4. 渲染超时时，沙箱强制终止执行并返回 `VIDEO_RENDER_TIMEOUT` 错误码；资源耗尽（OOM、磁盘满）时返回对应错误码，前端能看到与沙箱执行有关的明确错误。
5. 渲染失败后，执行结果（含 stderr、exit code、资源使用统计）传递给修复链（Story 4.3），修复链可根据错误类型决定修复策略。
6. 沙箱执行期间通过 SSE `task:progress` 事件推送 `render` 阶段进度，至少包含 stage 状态更新。
7. 沙箱资源限制参数为可配置项（环境变量或配置文件），支持不同部署环境调整，但生产环境不得低于基线约束。

## Tasks / Subtasks

- [x] 设计沙箱执行器抽象层（AC: 1, 7）
  - [x] 在 `packages/fastapi-backend/app/domains/video/sandbox/` 下创建 `sandbox_executor.py`。
  - [x] 定义 `SandboxExecutor` 抽象接口：`execute(script: str, timeout: int, resource_limits: ResourceLimits) -> ExecutionResult`。
  - [x] 定义 `ResourceLimits` 数据模型：`cpu_count`、`memory_mb`、`timeout_seconds`、`tmp_size_mb`、`allow_network`、`allow_subprocess`。
  - [x] 定义 `ExecutionResult` 数据模型：`success`、`output_path`、`stderr`、`exit_code`、`duration_seconds`、`resource_usage`、`error_type`。
  - [x] 从配置文件加载默认 `ResourceLimits`，生产环境最低基线为 `1 vCPU / 2048 MB / 120s / 1024 MB tmp`。
- [x] 实现 Docker/容器化沙箱执行（AC: 1, 2, 3）
  - [x] 实现 `DockerSandboxExecutor`（实现 `SandboxExecutor` 接口）。
  - [x] 将 Manim 脚本写入临时文件，挂载到容器内执行。
  - [x] 容器配置：`--cpus=1`、`--memory=2g`、`--network=none`、`--read-only`（挂载 /tmp 可写）、`--pids-limit`、`--security-opt=no-new-privileges`。
  - [x] 预构建 Manim 执行镜像（含 Manim CE + 依赖），镜像不含任何敏感凭证或网络工具。
  - [x] 渲染产物从容器内 `/tmp/output/` 复制到宿主临时目录。
- [x] 实现安全策略与违规检测（AC: 3）
  - [x] 脚本预检：在执行前用 `ast.parse()` + 自定义 AST visitor 检查是否包含 `import os`、`import subprocess`、`import socket`、`eval`、`exec`、`__import__` 等危险模式。
  - [x] 容器运行时安全：通过 `seccomp` profile 或 `AppArmor` profile 限制系统调用。
  - [x] 违规检测产生对应错误类型并记录到 `ExecutionResult.error_type`。
- [x] 实现超时与资源耗尽处理（AC: 4）
  - [x] 使用 Docker API 的 `timeout` 参数或外部计时器强制终止超时容器。
  - [x] OOM 检测：通过 Docker inspect 检查容器退出原因是否为 OOMKilled。
  - [x] 磁盘满检测：通过 `/tmp` 挂载的 `--storage-opt size` 或执行后检查退出码。
  - [x] 各资源耗尽场景映射到 `VIDEO_RENDER_TIMEOUT`、`VIDEO_RENDER_OOM`、`VIDEO_RENDER_DISK_FULL`。
- [x] 实现渲染结果收集与传递（AC: 2, 5）
  - [x] 渲染成功：将产物 `.mp4` 路径写入 Redis `video:task:{taskId}:render_output`。
  - [x] 渲染失败：将 `ExecutionResult`（含 stderr、exit_code、error_type）传递给 Story 4.3 修复链。
  - [x] 清理临时容器和临时文件，确保不留下僵尸容器或大文件。
- [x] 实现 SSE 事件推送（AC: 6）
  - [x] `render` 阶段开始时发送 `task:progress`（stage: `render`）。
  - [x] 渲染完成（成功或失败）后发送阶段结束事件。
- [x] 建立测试（AC: 1, 2, 3, 4, 5, 7）
  - [x] 沙箱资源限制配置加载测试。
  - [x] 脚本预检 AST 安全扫描测试（危险模式 → 拒绝执行）。
  - [x] 正常渲染成功测试（需要 Docker 环境或 mock）。
  - [x] 超时强制终止测试。
  - [x] OOM 检测测试。
  - [x] 失败结果传递到修复链的接口一致性测试。

## Dev Notes

### Story Metadata

- Story ID: `4.4`
- Story Type: `Backend Story`
- Epic: `Epic 4`
- Depends On: `4.1`（stage 枚举）、`4.3`（Manim 代码生成，提供待执行脚本）、`2.4`（Redis 运行态）
- Blocks: `4.6`（FFmpeg 合成消费渲染产物）、`4.3`（修复链消费失败结果，循环依赖：4.3 生成代码 → 4.4 执行 → 失败回 4.3 修复 → 再回 4.4 执行）
- Contract Asset Path: N/A（内部服务）
- Mock Asset Path: N/A
- API / Event / Schema Impact: 产出 `ExecutionResult`、`ResourceLimits` 数据模型；发送 `render` 阶段 `task:progress` 事件
- Persistence Impact: Redis 运行态（render_output）；渲染产物临时文件
- Frontend States Covered: N/A（后端 Story）
- Error States Covered: 渲染超时、OOM、磁盘满、网络违规、文件系统越界、子进程创建违规、脚本预检失败
- Acceptance Test Notes: 沙箱测试需要 Docker 环境；CI 环境可用 mock executor 替代

### Business Context

- 沙箱安全是平台底线能力，不能因为追求渲染成功率而降低安全标准。
- Manim 脚本由 LLM 生成，内容不可控，沙箱是防止恶意或错误代码影响宿主系统的唯一屏障。
- 资源限制参数（1 vCPU / 2 GiB RAM / 120s）是成本与质量的权衡：更宽松的限制能提高成功率但增加资源消耗和等待时间。
- 沙箱执行器的抽象层设计允许未来替换为 Firecracker、gVisor 等更轻量级方案，而不影响上层业务逻辑。

### Technical Guardrails

- 沙箱容器必须以非 root 用户运行，不得挂载宿主系统敏感目录。
- `--network=none` 是硬约束，即使业务需要（如下载字体），也应在镜像构建时预装，不得运行时联网。
- 沙箱执行器的 `execute` 方法必须是同步阻塞或 async-to-thread 的，不得在 Dramatiq Worker 事件循环中直接 await Docker API（需通过 `run_in_executor` 或 `anyio.to_thread`）。
- 每次渲染尝试后必须清理容器和临时文件，防止磁盘泄漏。
- 脚本预检是防线之一但不是唯一防线，容器运行时安全策略（seccomp/AppArmor）是第二层防线。
- 生产环境不得降低资源限制基线；开发/测试环境可调整但需在日志中标记 `non-production-limits`。

### Suggested File Targets

- `packages/fastapi-backend/app/domains/video/sandbox/__init__.py`
- `packages/fastapi-backend/app/domains/video/sandbox/sandbox_executor.py`（抽象接口）
- `packages/fastapi-backend/app/domains/video/sandbox/docker_executor.py`（Docker 实现）
- `packages/fastapi-backend/app/domains/video/sandbox/script_scanner.py`（AST 安全扫描）
- `packages/fastapi-backend/app/domains/video/sandbox/resource_limits.py`（资源限制模型与配置加载）
- `packages/fastapi-backend/app/domains/video/config.py`（扩展沙箱配置项）
- `packages/fastapi-backend/docker/manim-sandbox/Dockerfile`（Manim 执行镜像）
- `packages/fastapi-backend/tests/domains/video/test_sandbox_executor.py`
- `packages/fastapi-backend/tests/domains/video/test_script_scanner.py`

### Project Structure Notes

- `sandbox/` 作为 `domains/video/` 下的独立子包，封装所有沙箱相关逻辑。
- `docker/manim-sandbox/Dockerfile` 用于构建 Manim 执行镜像，与业务后端镜像分离。
- `script_scanner.py` 独立于沙箱执行器，可被 Story 4.3 的代码生成后检查复用。

### Testing Requirements

- AST 安全扫描测试：包含 `import os` → 拒绝、包含 `subprocess.run` → 拒绝、正常 Manim 代码 → 通过。
- 资源限制配置测试：默认值正确、环境变量覆盖生效、低于基线的生产配置 → 警告或拒绝。
- 沙箱执行集成测试（需 Docker）：简单 Manim 脚本 → 成功产出 .mp4、超时脚本 → `VIDEO_RENDER_TIMEOUT`。
- 沙箱执行 mock 测试（CI 用）：mock DockerClient，验证参数传递与结果处理逻辑。
- 失败传递测试：验证 `ExecutionResult` 的 stderr、exit_code 完整传递到修复链入口。
- 容器清理测试：执行后验证容器和临时文件已清理。

### References

- `_bmad-output/planning-artifacts/epics/17-epic-4.md`：Epic 4 范围、Story 4.4 AC 与 Deliverables。
- `_bmad-output/implementation-artifacts/4-1-视频流水线阶段进度区间与结果契约冻结.md`：stage 枚举。
- `_bmad-output/implementation-artifacts/4-3-manim-代码生成与自动修复链.md`：Manim 代码来源与修复链接口。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：沙箱资源限制参数（1 vCPU / 2 GiB / 120s / 1 GiB tmp）。
- `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`：`NFR-SE-005`（沙箱安全边界）。
- `_bmad-output/planning-artifacts/architecture/08-8-模块划分与实现策略.md`：渲染沙箱架构。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pytest -q packages/fastapi-backend/tests/unit/video/test_video_pipeline_models.py`
- `pytest -q packages/fastapi-backend/tests/unit/video/test_video_pipeline_services.py`
- `pytest -q packages/fastapi-backend/tests/integration/test_video_pipeline_api.py`

### Completion Notes List

- 已实现 `LocalSandboxExecutor` 与 `DockerSandboxExecutor`，补齐 AST 安全扫描、超时、OOM / 磁盘满映射与受限容器参数。
- 已新增 `packages/fastapi-backend/docker/manim-sandbox/Dockerfile`，作为仓库内 Manim 沙箱镜像构建入口。
- 已补充渲染临时目录清理，避免渲染、TTS、合成阶段在成功或失败后遗留大文件。

### File List

- `_bmad-output/implementation-artifacts/4-4-manim-沙箱执行与资源限制.md`
- `packages/fastapi-backend/app/core/config.py`
- `packages/fastapi-backend/app/features/video/pipeline/models.py`
- `packages/fastapi-backend/app/features/video/pipeline/sandbox.py`
- `packages/fastapi-backend/app/features/video/pipeline/services.py`
- `packages/fastapi-backend/docker/manim-sandbox/Dockerfile`
- `packages/fastapi-backend/tests/unit/video/test_video_pipeline_models.py`
- `packages/fastapi-backend/tests/unit/video/test_video_pipeline_services.py`
- `packages/fastapi-backend/tests/integration/test_video_pipeline_api.py`

## Change Log

- 2026-04-06：完成 Story 4.4 后端沙箱执行、资源限制、错误映射、镜像入口与临时文件治理，状态更新为 `review`。
