# Story 4.3 ManimCat 审查与兼容修复记录（2026-04-15）

## 背景

- 审查基准：`references/ManimCat-main`
- 触发原因：`docs/审查报告.md` 结论与当前工作区实现不完全一致，同时 `packages/fastapi-backend/tests/unit/video` 已出现导入层断裂，无法作为稳定回归面。

## 本轮确认的问题

1. `sandbox.py` 仍引用旧的 `TaskErrorCode.SANDBOX_*`，与当前 `VideoTaskErrorCode` 注册体系脱节，导致 video unit tests 在 collection 阶段直接失败。
2. 旧测试与部分文档仍依赖 `app.features.video.pipeline.auto_fix`、`services.py`、`manim_runtime_prelude.py`、`script_templates.py` 等稳定入口，但当前代码已重构到 `engine/` 与 `orchestration/`，缺少兼容 façade。
3. `orchestrator._run_finalize()` 在完成态仍直接基于 `tts.preview_state` 回写 preview，覆盖了 render 阶段已经写入的 `READY/FAILED` section 状态。
4. 原 `docs/审查报告.md` 混合了 gap 列表、方案草案和未完成团队笔记，不满足“发现 / 证据 / 影响 / 建议”的审查文档结构。

## 已完成修复

- 错误码对齐：
  - `packages/fastapi-backend/app/features/video/pipeline/sandbox.py`
  - `SANDBOX_*` 映射已切换到当前 `VideoTaskErrorCode`。
- 兼容层恢复：
  - `packages/fastapi-backend/app/features/video/pipeline/auto_fix.py`
  - `packages/fastapi-backend/app/features/video/pipeline/manim_runtime_prelude.py`
  - `packages/fastapi-backend/app/features/video/pipeline/script_templates.py`
  - `packages/fastapi-backend/app/features/video/pipeline/services.py`
  - 以上入口保留旧测试/旧导入路径，但内部不回滚到旧架构，而是包装当前 `engine/` / `orchestration/` 能力。
- Preview 收口修复：
  - `packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py`
  - 完成态现在优先读取 `runtime.load_preview()`，不再覆盖 render 阶段的 section 状态。
- 旧 helper 兼容：
  - `VideoPipelineService` 已恢复 `_emit_stage`、`_handle_pipeline_failure`、`_run_understanding`、`_run_render_verify` 等旧测试入口，并保留 progress 单调性。
- 多模态链路补齐：
  - `packages/fastapi-backend/app/features/video/pipeline/engine/scene_designer.py`
  - `packages/fastapi-backend/app/features/video/pipeline/engine/gpt_request.py`
  - `reference_images` 构造出的 multimodal messages 现已真实透传到底层 provider。
- 沙箱质量档位补齐：
  - `packages/fastapi-backend/app/features/video/pipeline/sandbox.py`
  - `render_quality` 已真正写入 runner 脚本生成的 Manim 命令。
- 回归测试补齐：
  - `packages/fastapi-backend/tests/unit/video/test_video_pipeline_engine.py`
  - `packages/fastapi-backend/tests/unit/video/test_video_pipeline_models.py`
  - 已新增 multimodal message 透传与 runner quality flag 的单测覆盖。

## 回归验证

- `packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests/unit/video -q`
  - 结果：`100 passed`
- `packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests/api/video packages/fastapi-backend/tests/contracts/test_openapi_contracts.py -q`
  - 结果：`3 passed`

## 2026-04-16 补充收口

- 死代码继续收敛：
  - `packages/fastapi-backend/app/features/video/pipeline/services.py`
  - 已删除不再被当前 DOM 字幕链路使用的 `build_subtitle_command`、`build_subtitle_entries`、`write_srt`。
- 现架构口径统一：
  - `packages/fastapi-backend/app/features/video/pipeline/models.py`
  - `packages/fastapi-backend/app/features/video/pipeline/engine/agent.py`
  - `packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py`
  - `packages/fastapi-backend/app/features/video/pipeline/orchestration/upload.py`
  - `packages/fastapi-backend/app/features/video/pipeline/services.py`
  - 已移除仅被旧测试引用的 `ResourceLimits` / `ExecutionResult`，并把 bulk render、preview clip、最终上传结果统一改走 `VIDEO_OUTPUT_FORMAT`，避免 `webm/mp4` 常量散落。
- 旧 sandbox 假设退场：
  - `packages/fastapi-backend/tests/unit/video/test_video_pipeline_models.py`
  - `packages/fastapi-backend/tests/unit/video/test_video_pipeline_services.py`
  - 已删除对 `DockerSandboxExecutor` / `LocalSandboxExecutor` 的过期断言，改为覆盖当前真实的“本地 `manim` 渲染 + 静态脚本安全扫描”实现。
- 透明导出注释修正：
  - `packages/fastapi-backend/app/features/video/pipeline/prompts/base_class.py`
  - 现明确说明透明导出依赖 Manim CLI `--transparent`，而不是 `background_color` 本身。
- FFmpeg 降级可观测性补齐：
  - `packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py`
  - 当 `libvorbis` 音频合成失败并回退为 silent clip copy 时，现会先打 warning，避免静默吞掉诊断线索。

## 2026-04-16 补充验证

- `python -m pytest tests/unit/video/ -q`
  - 结果：`105 passed in 2.01s`

## 与 524 修复的关系

- `2026-04-16` 同日落地的“大 prompt stream 524 修复”集中在 `gpt_request.py`、`openai_stream.py` 与配置阈值判断，目的是对大 payload 跳过 `stream first`。
- 本次补充收口集中在死代码清理、输出格式统一与测试对齐，没有回滚或重写那条请求层策略。
- 两批改动的关注面解耦；本次 `tests/unit/video` 全绿也说明 review cleanup 没有把 `524` 热修链路带偏。

## 与 ManimCat 仍存在的剩余差距

1. 当前仓库已具备 render failure 持久化与 sanitize 能力，但仍缺少类似 `ManimCat` 的 failure admin/export route，问题排查入口偏内聚。
2. `orchestrator.py`、`routes.py`、`models.py` 体量仍偏大，虽然功能可用，但与 `ManimCat` 的职责拆分粒度相比还有拆分空间。

## 结论

- Story 4.3 当前状态继续保持 `review`。
- 本轮目标不是再做一轮大重构，而是先让“现有实现 + 现有测试 + 审查文档”重新对齐，并把真正剩余的基线差距收敛到少数可执行项。
