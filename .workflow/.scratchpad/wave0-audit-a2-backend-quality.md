# Wave 0 A2 — 后端代码品质扫描

## 总览

| 指标 | 数值 |
|---|---|
| 总 .py 文件 | 230 |
| > 500 行文件 | 9 |
| > 300 行文件 | 34 |
| **ruff F401 未用 import** | **159** |
| NotImplementedError 半成品 | 7 |
| TYPE_CHECKING 循环避免 | 20 处 |
| 旧版兼容层（ruoyi_*.py）双份 | 6 个旧文件 + ruoyi/ 包 |

---

## 1. 超长文件 (>500 行) Top 9

| 文件 | 行数 | 职责 | 推荐拆分 |
|---|---|---|---|
| **video/pipeline/orchestration/orchestrator.py** | **2923** | SSE 驱动视频生成编排（LLM Bridge → 设计/代码 → 渲染 → TTS → FFmpeg）| design_phase / render_orchestration / composition_orchestration / progress_events |
| learning_coach/service.py | 1266 | 题目生成/解题/反馈生成混合 | quiz_generator / step_solver / feedback_generator |
| video/pipeline/services.py | 1082 | 视频处理服务集合 | UploadService 重复定义需合并 |
| video/pipeline/engine/agent.py | 977 | TeachingVideoAgent | prompt_builder / code_executor / failure_handler |
| providers/runtime_config_service.py | 870 | 运行时配置解析（LLM/TTS/RuoYi/Env）| provider_resolver / ruoyi_config_mapper |
| learning_coach/llm_generator.py | 600 | LLM 题目/反馈生成 | prompt_templates / output_parser |
| video/pipeline/models.py | 599 | 视频 pipeline 数据模型 | 32 处未用 import 需先清 |
| **openmaic/routes.py** | **566** | 12+ endpoints + SSE + PDF + Quiz | routes_generation / routes_chat / routes_analysis / sse_handlers |
| video/routes.py | 511 | 视频 endpoints | routes_task_management / routes_result_streaming |

---

## 2. 未使用 import （159 处）

### 重灾区（>10 处）
| 文件 | 未用数 | 问题 |
|---|---|---|
| `shared/long_term/__init__.py` | 32 | 再出口批量未用（50 行 noqa F401，外部只用 2-3 个）|
| `shared/long_term/records.py` | 32 | 包级导出继承自 __init__.py |
| `shared/ruoyi/__init__.py` | 17 | 同样再出口（13 个 symbols 实际用 4 个）|
| `shared/task/__init__.py` | 10 | TaskMetadata* 全未用 |

### 按 feature 分组
| Feature | 未用 import 数 |
|---|---|
| video | 48 (orchestrator/services/engine/models/routes/helpers) |
| openmaic | 22 (routes/director_graph/test_director_graph) |
| shared/ruoyi | 17 |
| infra | 12 |
| companion | 9 |
| 其他 | 51 |

### Wildcard import（应清理）
- `shared/task_metadata_service.py:2` from app.shared.task.metadata_service import *
- `shared/task_metadata.py:2` from app.shared.task.metadata import *

---

## 3. 跨 feature 重复定义

### 关键重复
| 名称 | 位置 1 | 位置 2 | 应统一到 |
|---|---|---|---|
| **AgentProfile** | features/openmaic/schemas.py | features/openmaic/orchestration/schemas.py + shared/agent_config.py | shared/agent_config.py（3 处定义）|
| **UploadService** | video/pipeline/orchestration/upload.py | video/pipeline/services.py | 选一删一 |
| Scene | 2 处 | - | - |
| ChatMessage | 2 处 | - | - |
| WhiteboardActionRecord | 2 处 | - | - |
| DoomLoopError | 2 处 | - | - |

### 重复函数
| 函数 | 位置 |
|---|---|
| `_parse_datetime()` | video/long_term/records.py:35 + shared/ruoyi/mapper.py:12 |
| `_coerce_int()` | providers/tts/doubao_provider.py:25 + video/service/_helpers.py:474 + companion/context_adapter/video_adapter.py:234 |
| `_format_ruoyi_datetime()` | shared/ruoyi/mapper.py:28 + shared/long_term/mapper.py |

---

## 4. 循环 import 风险（20 处 TYPE_CHECKING）

合理：infra/redis_token_store.py / providers/llm/factory.py / video/service/cancel_task.py / shared/task_framework/base.py
可疑：shared/ruoyi/auth.py（运行时也需要）/ video/long_term/service.py

---

## 5. 半成品 NotImplementedError（7 处）

| 位置 | 性质 |
|---|---|
| video/providers/ocr.py:34/39 | OCR 抽象方法（合理）|
| video/providers/image_storage.py:37/42 | ImageStorage 抽象方法（合理）|
| video/providers/image_storage.py:102/106 | **CosImageStorage 待实现** |
| shared/task_framework/base.py:168 | BaseTask.execute 抽象（合理）|

**评估**：CosImageStorage 是真实"待补"，应标注 deadline / owner

---

## 6. 死代码 / 孤儿模块

### 旧版兼容层双份存在 ⚠️

`app/shared/` 同时有：
- **包版（新）**: ruoyi/ 子包（auth/mapper/client/...，8 文件）
- **单文件版（旧）**: ruoyi_auth.py / ruoyi_client.py / ruoyi_mapper.py / ruoyi_models.py / ruoyi_service_mixin.py / ruoyi_ai_runtime_client.py

**导入现状**: 31 文件用新包；**16 文件还用旧单文件** — 双版本并存

---

## 7. 测试覆盖空洞

| Feature | 单测 | 集成 |
|---|---|---|
| video | 9 文件独立 | tests/api/video/ |
| openmaic | 1 (orchestration/tests/) | 无 |
| auth | 2 | tests/api/auth/ |
| tasks | 1 | tests/api/tasks/ |
| **learning_coach** | **0** | 无 |
| **companion** | **0** | 无 |
| **knowledge** | **0** | 无 |
| **learning** | **0** | 无 |
| **classroom** | **0** | 无 |

**关键无单测**:
- learning_coach/llm_generator.py 600 行 0 单测
- companion/context_adapter/video_adapter.py 240+ 行 0 单测
- video/pipeline/services.py 1082 行 仅 2 测试
- openmaic/orchestration/director_graph.py 488 行 仅 1 测试

---

## 8. 模块级副作用

@lru_cache 装饰器均为函数级缓存，合理。

`infra/redis_client.py:22` 模块加载时 import StubBroker — 测试可能受影响

---

## 优先级清单

### P0 立即处理（< 30 min，0 风险）
1. **删 159 处未用 import**（核心：long_term/__init__.py 32 个 + ruoyi/__init__.py 17 个）
2. **清理 wildcard import** (shared/task_metadata_service.py:2 + shared/task_metadata.py:2)

### P1 与 Wave 1 同期
1. **拆超长文件**（按职责分子模块）
   - orchestrator.py (2923) → 4 子模块（6h）
   - learning_coach/service.py (1266) → 3 子模块（4h）
   - video/pipeline/services.py (1082) → 3 子模块（4h）
   - openmaic/routes.py (566) → 3 路由文件（3h）
2. **统一重复定义**
   - AgentProfile → shared/agent_config.py
   - UploadService 选一删一
   - _parse_datetime / _coerce_int / _format_ruoyi_datetime → shared/datetime_utils.py
3. **删旧版 ruoyi_*.py 兼容层**（前提：16 文件先迁到新包）

### P2 独立技术债（1-2 周）
1. 补全测试（learning_coach/companion/knowledge/classroom service 单测）
2. 补充 NotImplementedError 文档（deadline/owner）
3. 循环 import 审查

---

## 关键指标汇总

| 项 | 数值 | 优先级 |
|---|---|---|
| 超长文件 | 9 个 | P1 |
| 未用 import | 159 处 | P0 |
| 重复类定义 | 7 处 | P1 |
| 重复函数 | 3 处 | P1 |
| 旧版兼容层 | 6 文件 + 双重导入 | P1 |
| 无单测 feature | 4 个 | P2 |
| CosImageStorage stub | 2 处 | P2 |

**处理顺序**：P0（30 min）→ P1（2 天）→ P2（1-2 周）
