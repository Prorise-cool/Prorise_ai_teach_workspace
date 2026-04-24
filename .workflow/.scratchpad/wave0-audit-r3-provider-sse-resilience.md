# Wave 0 R3 — Provider/SSE/Resilience 统一性审计

## 总览

| 维度 | 统计 | 状态 |
|------|------|------|
| 用 ProviderRuntimeResolver 的 feature | openmaic, video/pipeline, learning_coach, companion | ✅ |
| 硬编码 model 的 feature | 无 | ✅ |
| 用 asyncio.Queue 自建 SSE 的 | openmaic (director_graph) | ⚠️ P1 |
| 用 sse_broker 的 | video/pipeline (部分) | ⚠️ |
| TTS 已走 provider 的 | video/pipeline | ✅ |
| 仍用前端 speechSynthesis 的 | openmaic SpeechAction | ❌ P1 |

---

## 已注册 xm_ai_module_binding 清单

- **openmaic**：6 stage（outline / scene_content / scene_actions / agent_profiles / director / quiz_grade）
- **video**：7 LLM stage（understanding / solve / storyboard / manim_gen / render_verify / render_fix / manim_fix）+ tts stage
- **learning_coach**：单 LLM chain（无 stage 细分）
- **companion**：单 LLM chain（无 stage 细分）

---

## 详细发现

### F1: openmaic — P0/P1 混合

- LLM 调用: ✅ resolve_openmaic_providers(stage_code)（llm_adapter.py:93-145），routes.py:375-379 chat 用 stage_code="director"
- xm_ai_module_binding: ✅ 6 stage 已注册
- failover/retry: ✅ 用 providers/failover.py（llm_adapter.py:53-78）
- **SSE: ❌ 自建 asyncio.Queue（director_graph.py:79, 437-472），无序列号、无 Last-Event-ID 重放，掉线无法续接**
- **TTS: ❌ SpeechAction(text)（schemas.py:83-85）未预合成 audioUrl，前端走 speechSynthesis fallback**
- httpx: ✅ 无自建

### F2: video — P2

- LLM 调用: ✅ resolver.resolve_video_pipeline → VideoProviderRuntimeAssembly
- xm_ai_module_binding: ✅ 7 LLM stage + tts
- failover/retry: ✅ ProviderFailoverService + engine/code_retry.py 自建 SEARCH/REPLACE 修复（合理，是 LLM 辅助代码修复非 provider 重试）
- SSE: ⚠️ 混合（自建发射 + sse_broker 存储），有序列号有重放，但职责分散
- TTS: ✅ 完全走 provider（VideoProviderRuntimeAssembly.tts_for("tts")）
- httpx: ✅ 无自建

### F3: learning_coach — P2

- LLM 调用: ✅ resolve_learning_coach（routes.py:54-77）
- failover: ⚠️ 自建 _call_with_failover（llm_generator.py:222-269），与 ProviderFailoverService 重复，等价实现可统一
- SSE: ✅ 无（同步 POST）
- httpx: ✅ 无

### F4: companion — P0

- LLM 调用: ✅ resolve_companion（service.py:320-350）
- failover: ✅ ProviderFailoverService（service.py:364）
- SSE: ✅ 无（同步 POST /ask）
- httpx: ✅ 无

### F5: knowledge — P0

- 无 LLM 调用（纯 RuoYi 持久层）

### F6: auth/classroom/learning/tasks — 按设计无 LLM

---

## 推荐 Wave 0 热修清单

### [P1] OpenMAIC chat SSE 迁移 sse_broker
- director_graph.py:437-472 + routes.py:348-439
- 补 event.id/sequence + sse_broker.publish() + 前端 Last-Event-ID
- 工作量 2-3h

### [P1] OpenMAIC SpeechAction 预合成
- schemas.py:83-85 SpeechAction 加 audioUrl 字段
- agent_generate_node 调 TTS provider 合成
- 前端优先 audioUrl，fallback speechSynthesis
- 工作量 3-4h

### [P2] Video SSE 与 sse_broker 完全统一
- 工作量 4-6h

### [P2] Learning Coach 采用 ProviderFailoverService
- llm_generator.py:222-269 改为统一 failover service
- 工作量 2-3h

---

## 留到 Wave 1+ 的大重构

1. OpenMAIC SpeechAction 端到端预合成（多智能体音频编排）
2. Video TTS 多角色配音 + 背景音乐
3. SSE 事件标准化与重放框架（库级抽象）
4. Provider 健康检查与自愈
5. 多 Provider 成本/延迟感知路由

---

## 汇总表

| Feature | LLM resolver | binding | failover | SSE | TTS | httpx | 整体 |
|---------|---------|---------|----------|-----|-----|-------|------|
| openmaic | ✅ | ✅ 6 | ✅ | ❌ asyncio.Queue P1 | ❌ front P1 | ✅ | ⚠️ P1 |
| video | ✅ | ✅ 7+1 | ✅ | ⚠️ 混合 P2 | ✅ | ✅ | ⚠️ P2 |
| learning_coach | ✅ | ✅ 1 | ⚠️ custom P2 | ✅ 无 | ✅ 无 | ✅ | ✅ P0 |
| companion | ✅ | ✅ 1 | ✅ | ✅ 无 | ✅ 无 | ✅ | ✅ P0 |
| knowledge | N/A | N/A | N/A | ✅ 无 | N/A | ✅ | ✅ P0 |

预计 Wave 0 热修工作量：**12-15h**（3 个 P1/P2 项）
