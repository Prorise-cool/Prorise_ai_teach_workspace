# 视频管道 Review 修复进度

**分支**: `feature/video-pipeline-manimcat-optimize`
**日期**: 2026-04-16

## 已完成

| # | 任务 | 状态 |
|---|------|------|
| 1 | 删除死代码 stage1-5.py + __init__.py 导出 | ✅ 已删6个文件，__init__.py已清理 |
| 2 | 删除 DockerSandboxExecutor（agent.py改用本地manim） | ✅ 当前架构已明确改为本地 `manim` 渲染，`sandbox.py` 仅保留静态脚本安全扫描，旧 Docker 假设已从测试中移除 |
| 3 | constants.py 添加 VIDEO_OUTPUT_FORMAT 常量 | ✅ 已添加 |
| 4 | constants.py 删除 SANDBOX_* 死常量 | ✅ 已清理 |
| 5 | 删除 services.py 中 build_subtitle_command + build_subtitle_entries + write_srt | ✅ 已删除未使用字幕 helper，现有 DOM 字幕链路不再保留旧 SRT 兼容死代码 |
| 6 | agent.py 中 "webm" 替换为 VIDEO_OUTPUT_FORMAT 常量 | ✅ `agent.py`、`orchestrator.py`、`upload.py`、`services.py` 已统一改走 `VIDEO_OUTPUT_FORMAT` |
| 7 | 测试文件 .mp4 → .webm 同步 | ✅ 相关 unit tests 已同步为 `.webm` 产物断言 |
| 8 | sandbox.py 相关测试清理 | ✅ 已删除/改写 `DockerSandboxExecutor`、`LocalSandboxExecutor` 等过期测试假设 |
| 9 | orchestrator.py 中删除 sandbox_executor 属性 | ✅ 已删除残留 import 与实例化代码，编排层不再持有旧 sandbox executor |
| 10 | models.py 中 ResourceLimits / ExecutionResult | ✅ 已确认无生产引用并删除 |
| 11 | base_class.py 注释修正 | ✅ 已改为明确说明透明导出依赖 Manim CLI `--transparent`，不是 `background_color` |
| 12 | FAKE_MP4_DATA → 已不存在（sandbox.py已重写） | ✅ 自动完成，无残留引用 |
| 13 | FFmpeg libvorbis 降级时加日志警告 | ✅ `_compose_section_with_audio()` 已补 warning，再回退到 silent clip copy |
| 14 | 跑全量测试验证 | ✅ `python -m pytest tests/unit/video/ -q` → `105 passed in 2.01s` |

## 收口结论

1. 本轮 review cleanup 已完成；没有恢复旧 Docker sandbox 架构，而是把实现、测试与文档统一对齐到当前真实的“本地 `manim` + 静态脚本安全扫描”路径。
2. 先前的 `524` 修复只落在 `gpt_request/openai_stream/config` 请求层，这次 cleanup 主要落在死代码清理、输出格式统一与测试对齐，两者解耦，不构成互相覆盖。
3. Story 4.3 当前仍保持 `review`；剩余差距已回归实施文档中的长期项，不再是这份 scratchpad 的阻塞。

## 剩余观察

1. 当前运行前提已明确依赖服务器可直接执行本地 `manim`，不再假设 Docker sandbox 可用。
2. 与 `ManimCat` 的剩余基线差距主要还是 failure admin/export route 与大文件模块继续拆分，属于后续优化，不影响这次收口。
