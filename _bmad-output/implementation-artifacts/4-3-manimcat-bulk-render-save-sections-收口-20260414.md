# Story 4.3 补充收口：ManimCat bulk render + save_sections 落地

## 背景

`2026-04-14` 在 `feature/video-pipeline-manimcat-optimize` 分支继续验证 ManimCat 迁移后，发现当前实现虽然已经把 `outline + storyboard` 收敛为 `generate_design()`，也把 `N 次 section code generation` 收敛为 `generate_all_code()`，但运行主链仍会在 bulk code 之后掉回旧的 `section_*.py + SectionNScene + scope_refine` 修复路径，导致：

- `bulk code -> static guard -> section_1 LLM 修复 -> section_2 ...` 的旧风暴仍然存在
- 日志中依然出现 `Debugging section_1 (attempt x/y)`，实际调用次数远高于预期
- `manimcat_full_code.py` 的 response wrapper / markdown fence 没有被完全清洗，第一轮静态检查就会被语法错误打断
- 旧渲染器仍依赖 `section_1.py` / `Section1Scene` 约定，与 `MainScene + self.next_section()` 的 ManimCat bulk code 契约不一致

## 结论

本轮执行不再采用“bulk prompt + per-section 渲染器”的混合形态，而是切换为真正贴近 ManimCat 的 bulk render 路径：

1. `generate_design()`：一次 LLM 生成完整 design / storyboard
2. `generate_all_code()`：一次 LLM 生成完整 `MainScene`
3. 本地清洗：提取 fenced code、清洗 wrapper、补齐 `MainScene`
4. `manim --save_sections`：一次渲染产出完整 silent video 与每个 `section_N` 的片段
5. 仅在 bulk render 失败时，使用 `SEARCH/REPLACE` patch repair 做有限次数修复

默认 LLM 调用预算被收敛到：

- 成功路径：`2` 次（design + full code）
- 失败含修复路径：`<= 5` 次（design + full code + 最多 3 次 patch repair）

## 代码变更

### 1. `TeachingVideoAgent` 新增真实 bulk render 路径

- 新增 full-code 正规化逻辑，渲染前强制：
  - 去掉 markdown fence / response wrapper
  - 再次运行 `clean_manim_code`
  - 若缺失 `MainScene`，把首个 Scene 类统一改写为 `MainScene`
- 新增 `render_full_video_with_sections()`：
  - 渲染目标固定为 `MainScene`
  - 使用 `manim -ql --save_sections manimcat_full_code.py MainScene`
  - 成功后从 Manim sections index (`MainScene.json`) 读取每个 `section_N` 的视频路径
  - 失败时只进入 patch repair，不会回退到逐 section 全量重生

### 2. 编排器改成 bulk render 优先

- `VideoPipelineService.run()` 在 `design_text` 存在且 agent 支持 `render_full_video_with_sections()` 时：
  - 不再执行 `generate_section_code()` / `render_section()`
  - 直接执行 `generate_all_code()` → `render_full_video_with_sections()`
  - 再把导出的 section 片段与 TTS 音频做合成与发布
- bulk path 失败会直接报 `VIDEO_MANIM_GEN_FAILED` 或 `VIDEO_RENDER_FAILED`
- 不再把 bulk 代码静默降级为旧的高调用 per-section repair 路径

### 3. 调用预算默认值下调

- `FASTAPI_VIDEO_PATCH_RETRY_MAX_RETRIES` 默认值从 `4` 改为 `3`
- `RunConfig` 默认关闭 MLLM feedback
- legacy per-section 路径的 `max_fix_bug_tries / max_regenerate_tries` 下调为 `1`

## 验证

### 定向测试

- `pytest -q packages/fastapi-backend/tests/unit/video/test_video_pipeline_orchestrator_runtime.py packages/fastapi-backend/tests/unit/video/test_video_pipeline_code_cleaner.py`
  - 结果：`3 passed`
- `python -m compileall packages/fastapi-backend/app/features/video/pipeline/engine packages/fastapi-backend/app/features/video/pipeline/orchestration`
  - 结果：通过

### 本地 smoke

对最小 `MainScene + self.next_section("section_1/2")` 样例直接调用新的 bulk render 方法，已确认本地 Manim `0.20.1` 会导出：

- `MainScene_0000_section_1.mp4`
- `MainScene_0001_section_2.mp4`

说明 `save_sections` 路径可被当前后端直接消费，不需要再把 full code 拆回 `section_1.py`

### 2026-04-14 晚间实机复验

- 管理员 token 样本：`vtask_20260414154217_5be3741d`
- 实际阶段耗时：
  - `understanding`: `49s`
  - `storyboard`: 与 `generate_design()` 同一时间片完成
  - `tts`: `39s`
  - `manim_gen`: `378s`
  - 总耗时：`466s` 后失败
- 最终失败结果：
  - `failedStage=manim_gen`
  - `errorCode=VIDEO_MANIM_GEN_FAILED`
  - `errorMessage=ManimCat 全量代码生成失败: Code generation LLM call failed`
- 产物目录证据：
  - 只生成了 `0-video/manimcat_design.txt`
  - 只生成了 `tts_audio/section_*.mp3`
  - **没有** `manimcat_full_code.py`
  - **没有** `section_*.py`
  - **没有**任何渲染产出的 `mp4`

这说明本轮改造已经把旧的 “bulk prompt 后又掉回逐 section LLM 修复风暴” 阻断掉了，但当前新的主瓶颈已经收敛为 **单次 full-code LLM 调用本身过慢/失败率过高**，还不能说 Story 4.3 已达到可接受的真实链路表现。

### 额外观察

- preview/SSE 目前会先发 10 条 `section_progress`（`正在生成第 N/10 段动画脚本`），随后才发 `ManimCat 全量代码生成...`，并把全局 progress 从 `89` 回落到 `26`。
- 从 case 目录与 Redis 事件看，这批 `section_progress` 更像是 section 预占位事件，而不是真实发生了 10 次 section 级代码生成；但它会误导前端与验收判断，后续仍需调整事件顺序和语义。

### 2026-04-15 厚修复补丁

- 已修正 bulk fatal failure 的 preview 回写：只要任务以 `VideoPipelineError` 终止，所有未完成 section 会统一收口为 `failed`，并把 task 级错误信息回写到 `section.errorMessage`，不再出现 preview 顶层已失败但 section 还卡在 `generating/rendering` 的状态。
- 已修正任务框架错误码透传：`BaseTask.handle_error()` / `ResultNormalizerMixin` / runtime store 现保留 `VIDEO_*` 域错误码，`/api/v1/tasks/{id}/status` 与 failed SSE 事件不再把 `VIDEO_MANIM_GEN_FAILED` 压扁成 `TASK_UNHANDLED_EXCEPTION`。
- 已修正 bulk path 事件顺序：不再在 `generate_all_code()` 前预发 section 级 `generating` 事件；bulk render 路径改为先发顶层 `manim_gen/render` 进度，再按 section 顺序发 `rendering -> ready/failed`，全局 progress 保持单调不回退。
- 定向验证：
  - `pytest -q packages/fastapi-backend/tests/unit/video/test_video_pipeline_orchestrator_runtime.py`
  - `pytest -q packages/fastapi-backend/tests/unit/task_framework/test_scheduler.py packages/fastapi-backend/tests/unit/core/test_task_trace.py`
  - 结果：`15 passed`

### 2026-04-15 上午真实 token 全量复验

- 管理员 token 样本：`vtask_20260415013544_1914f169`
- 实际阶段耗时：
  - `understanding`: `53s`（`01:35:44Z -> 01:36:37Z`）
  - `storyboard`: 与 `generate_design()` 同一时间片完成
  - `tts`: `10s`（`01:36:37Z -> 01:36:47Z`）
  - `manim_gen`: `261s`（`01:36:47Z -> 01:41:08Z`）
  - 总耗时：约 `324s`（`5m24s`），仍未达成“5 分钟内出成品”目标
- 最终失败结果：
  - `failedStage=manim_gen`
  - `errorCode=VIDEO_MANIM_GEN_FAILED`
  - `errorMessage=ManimCat 全量代码生成失败: Code generation LLM call failed`
- 运行态与事件语义验证：
  - `GET /api/v1/tasks/{id}/events` 回放仅出现 `understanding -> storyboard -> tts -> manim_gen -> failed`，没有再出现 bulk full-code 前的伪 `section_progress` 风暴，也没有全局 progress 倒退
  - `GET /api/v1/video/tasks/{id}/preview` 返回 `totalSections=10`、`readySections=0`、`failedSections=10`，且所有 `section.errorMessage` 已同步 task 级错误，说明厚修复后的 preview 收口在真实链路已生效
- 产物目录证据：
  - 生成了 `0-video/manimcat_design.txt`
  - 生成了 `tts_audio/section_*.mp3`
  - **没有** `manimcat_full_code.py`
  - **没有**任何 `mp4` 渲染产物
- 结论：
  - 从事件序列与 case 产物推断，本次失败路径实际只消耗了 `design + full code` 两次 LLM 调用，没有重新掉回 patch repair / per-section 修复风暴
  - 当前主瓶颈已经进一步收敛为“单次 full-code LLM 调用本身耗时过长且失败率高”，而不是旧架构的多轮 section 级调用爆炸

### 当前已知限制

- `tests/unit/video` 全量集合在收集阶段仍有与本次无关的历史问题：
  - `pipeline/sandbox.py` 依赖的 `TaskErrorCode.SANDBOX_FS_VIOLATION` 缺失
  - `tests/unit/video/test_video_pipeline_services.py` 仍 import 已不存在的 `auto_fix`
- 这两项不是本次 bulk render 改动引入的问题，因此未在本轮一并处理

## 影响范围

- `packages/fastapi-backend/app/features/video/pipeline/engine/agent.py`
- `packages/fastapi-backend/app/features/video/pipeline/engine/code_cleaner.py`
- `packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py`
- `packages/fastapi-backend/app/core/config.py`
- `packages/fastapi-backend/.env.example`
- `packages/fastapi-backend/tests/unit/video/test_video_pipeline_orchestrator_runtime.py`
- `packages/fastapi-backend/tests/unit/video/test_video_pipeline_code_cleaner.py`
