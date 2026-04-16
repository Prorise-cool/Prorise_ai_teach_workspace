# Story 4.3 大 Prompt Stream 524 修复记录（2026-04-16）

## 背景

- 分支：`feature/video-pipeline-manimcat-optimize`
- 上下文来源：`docs/视频管道待修复问题-20260415.md`
- 真实症状：`manim_gen` 阶段在 full-code generation 上间歇性失败，错误最终收敛为 `Code generation LLM call returned None`
- 已知根因：`synai996.space` 这类 CDN 代理在大 payload 建立 stream 连接时容易直接返回 `524 A Timeout Occurred`，而当前 `gpt_request -> openai_stream` 默认始终 `stream first`

## 本轮修复目标

不改动视频编排主链，不重新打开旧的 per-section repair 风暴，只在 LLM 请求层补齐一个“对大 payload 跳过 stream”的防御策略，避免在还没收到首个 chunk 之前就被 CDN 截断。

## 代码改动

### 1. `gpt_request.py` 增加 payload 大小估算与 stream 策略判断

- 文件：`packages/fastapi-backend/app/features/video/pipeline/engine/gpt_request.py`
- 新增 `_estimate_message_chars()`，递归统计 message payload 中的文本、data URL 与嵌套结构总字符数。
- 新增 `_should_prefer_stream()`：
  - 默认读取 `FASTAPI_VIDEO_LLM_STREAM_MAX_INPUT_CHARS`
  - 当输入字符数超过阈值时，返回 `prefer_stream=False`
  - 当阈值 `<= 0` 时，视为禁用该保护，保持原有总是 stream 的行为
- `_call_openai_compatible()` 现在会把 `prefer_stream` 传给底层 `create_chat_completion_text()`，并在 debug log 中记录 `estimated_chars`

### 2. `openai_stream.py` 支持 direct non-stream

- 文件：`packages/fastapi-backend/app/features/video/pipeline/engine/openai_stream.py`
- `create_chat_completion_text()` 新增 `prefer_stream: bool = True`
- 当 `prefer_stream=False` 时：
  - 不再先发 `stream=True`
  - 直接走原来的 non-stream 请求路径
  - 保持返回 `mode="non-stream"`，因此上层兼容逻辑不需要修改
- 原有 “stream 失败后 fallback 到 non-stream” 的逻辑保留，成功/失败日志也继续保留

### 3. 配置项补齐

- 文件：`packages/fastapi-backend/app/core/config.py`
- 文件：`packages/fastapi-backend/.env.example`
- 新增配置：
  - `FASTAPI_VIDEO_LLM_STREAM_MAX_INPUT_CHARS=12000`
- 设计意图：
  - 让短 prompt 继续享受 stream + partial recovery
  - 让 code generation 这类 system prompt + codebook + user prompt 合并后的大 payload 默认直接走 non-stream

## 验证

### 单元测试

- `python -m pytest packages/fastapi-backend/tests/unit/video/test_create_chat_completion_text.py -q`
  - 结果：`8 passed`
- `python -m pytest packages/fastapi-backend/tests/unit/video/test_gpt_request_sdk.py -q`
  - 结果：`9 passed`

### 新增覆盖点

- `prefer_stream=False` 时只发一次 `stream=False` 请求，不会先尝试 stream
- 大 payload 会把 `prefer_stream=False` 传到底层请求函数
- 嵌套 multimodal message 的字符数估算可覆盖 `text + data URL`

## 影响与边界

- 本轮没有改动 orchestrator、VideoTask 生命周期或 preview/SSE 语义，因此不会重新打开 2026-04-14 / 2026-04-15 已收口的 bulk render、fatal failure、preview failedSections 与 errorCode 透传问题。
- `docs/视频管道待修复问题-20260415.md` 里提到的 `VideoTask.finalize()` 回写 DB status 现已在代码中存在，不属于本轮新增改动。
- 由于真实 provider 仍依赖外部 token 与代理环境，本轮只完成了请求层单测闭环，尚未在真实 token 下重新跑一次端到端视频生成。

## 结论

- Story 4.3 继续保持 `review`
- 本轮已把 “大 prompt 建 stream 连接直接 524” 这类确定性风险前移到请求层规避
- 下一轮若仍有 `manim_gen` 超时失败，应优先排查：
  1. non-stream 响应耗时是否仍超过代理容忍范围
  2. code generation prompt 是否还能继续瘦身
  3. provider/runtime 配置是否需要切换到更稳定的上游
