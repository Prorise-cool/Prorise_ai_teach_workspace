# FastAPI 视频管道模块完整审查报告

**审查日期**: 2026-04-14  
**项目路径**: `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/packages/fastapi-backend`  
**总代码行数**: 9,188 行

---

## 1. 完整文件树与行数统计

### 1.1 视频模块顶级结构

```
app/features/video/
├── __init__.py (19行)
├── routes.py (410行) - API 路由入口
├── schemas.py (26行) - 请求/响应 schema
├── runtime_auth.py (76行) - 运行时认证
│
├── models/ (151行) - 模型定义
│   ├── __init__.py (29行)
│   ├── base.py (12行)
│   ├── create_task.py (64行)
│   ├── preprocess.py (30行)
│   └── voice.py (48行)
│
├── service/ (1,250行) - 业务逻辑服务层
│   ├── __init__.py (31行)
│   ├── base_service.py (86行)
│   ├── _helpers.py (127行)
│   ├── create_task.py (341行)
│   ├── preprocess.py (323行)
│   ├── artifact_service.py (51行)
│   ├── result_service.py (170行)
│   ├── publication_service.py (214行)
│   └── voice_catalog.py (40行)
│
├── long_term/ (523行) - 长期记录与存储
│   ├── __init__.py (19行)
│   ├── records.py (336行)
│   └── service.py (187行)
│
├── providers/ (234行) - 第三方集成
│   ├── image_storage.py (121行)
│   └── ocr.py (113行)
│
├── pipeline/ (5,888行) - 核心渲染管道
│   ├── __init__.py (2行)
│   ├── models.py (562行) - 管道数据模型
│   ├── errors.py (118行) - 错误定义
│   ├── protocols.py (43行) - 协议接口
│   │
│   ├── engine/ (3,196行) - 渲染引擎核心
│   │   ├── __init__.py (8行)
│   │   ├── agent.py (1,408行) - 🔥 主要 Manim 代理逻辑
│   │   ├── gpt_request.py (563行) - LLM 请求代理
│   │   ├── scope_refine.py (801行) - scope 精化
│   │   ├── c2v_utils.py (224行) - Code2Video 工具
│   │   └── external_assets.py (208行) - 外部资源管理
│   │
│   ├── orchestration/ (751行) - 流程编排
│   │   ├── __init__.py (21行)
│   │   ├── orchestrator.py (1,254行) - 🔥 管道协调器
│   │   ├── runtime.py (282行) - 运行时状态
│   │   ├── assets.py (117行) - 资源存储
│   │   └── upload.py (79行) - 上传服务
│   │
│   └── prompts/ (642行) - 提示词系统
│       ├── __init__.py (24行)
│       ├── base_class.py (43行)
│       ├── stage1.py (49行)
│       ├── stage2.py (126行)
│       ├── stage3.py (75行)
│       ├── stage4.py (101行)
│       ├── stage5_eva.py (108行)
│       └── stage5_unlearning.py (59行)
│
└── tasks/ (40行) - 异步任务
    └── video_task_actor.py (40行) - Dramatiq 任务定义
```

### 1.2 文件行数Top 10

| 排名 | 文件 | 行数 | 功能 |
|------|------|------|------|
| 1 | `engine/agent.py` | 1,408 | Manim 代理 + 代码生成 + 自动修复 |
| 2 | `orchestration/orchestrator.py` | 1,254 | 流程编排核心 |
| 3 | `engine/scope_refine.py` | 801 | Scope 精化与内容规划 |
| 4 | `engine/gpt_request.py` | 563 | LLM 请求代理 |
| 5 | `pipeline/models.py` | 562 | 数据模型定义 |
| 6 | `routes.py` | 410 | API 路由 |
| 7 | `service/create_task.py` | 341 | 创建任务服务 |
| 8 | `long_term/records.py` | 336 | 历史记录管理 |
| 9 | `service/preprocess.py` | 323 | 预处理服务 |
| 10 | `orchestration/runtime.py` | 282 | 运行时状态管理 |

---

## 2. API 端点与路由

### 2.1 视频模块路由（routes.py 410行）

主要路由入口：`/api/v1/videos/`

**核心端点**:
- `POST /create` - 创建视频任务
- `GET /{task_id}/result` - 获取视频生成结果
- `GET /{task_id}/result-detail` - 获取详细结果
- `GET /{task_id}/preview` - 获取 section 级别预览
- `POST /{task_id}/publish` - 发布视频
- `GET /public-videos` - 查询公开视频
- `POST /preprocess` - 视频预处理
- `GET /voices` - 获取语音列表
- `GET /assets/{path}` - 获取资源文件
- `POST /metadata` - 任务元数据持久化
- SSE 端点：`/events/{task_id}` - 任务进度流

### 2.2 路由注册

**文件**: `app/api/router.py` (第14行、第25行)

```python
from app.features.video.routes import router as video_router
v1_router.include_router(video_router)
```

---

## 3. 模型与 Schema

### 3.1 核心数据模型（pipeline/models.py 562行）

**主要 Pydantic 模型**:
- `VideoStage` - 阶段枚举（理解、分镜、代码、Manim、合成等）
- `VideoResultDetail` - 结果详情
- `VideoResult` - 完整结果
- `VideoArtifactGraph` - 制品图
- `ArtifactPayload` - 制品负载
- `ArtifactType` - 制品类型枚举
- `PublishState` - 发布状态
- `VideoPreviewSectionStatus` - section 预览状态

### 3.2 请求/响应 Schema（schemas.py 26行）

- `VideoTaskMetadataCreateRequest` - 元数据创建请求
- `VideoTaskMetadataSnapshot` - 元数据快照
- `VideoTaskMetadataPageResponse` - 分页响应
- `VideoTaskMetadataPreviewResponse` - 预览响应

### 3.3 创建任务模型（models/create_task.py 64行）

- `CreateVideoTaskRequest` - 创建请求
- `CreateVideoTaskSuccessEnvelope` - 成功响应
- `IdempotentConflictEnvelope` - 幂等冲突响应

---

## 4. 服务层架构

### 4.1 VideoService（service/__init__.py 导出）

**核心职责**:
- 任务生命周期管理
- 结果持久化
- 发布管理
- 元数据查询

**主要类/函数**:
- `VideoService` - 主服务类
- `create_video_task()` - 任务创建
- `ensure_video_task_create_permission()` - 权限检查

### 4.2 各服务模块

| 模块 | 行数 | 职责 |
|------|------|------|
| `create_task.py` | 341 | 幂等任务创建、权限检查、Dramatiq 分发 |
| `preprocess.py` | 323 | 代码预处理、OCR、图像存储 |
| `result_service.py` | 170 | 结果查询、状态聚合 |
| `publication_service.py` | 214 | 发布到 RuoYi、权限管理 |
| `artifact_service.py` | 51 | 制品管理 |
| `voice_catalog.py` | 40 | 语音选项管理 |
| `base_service.py` | 86 | 基础服务类 |
| `_helpers.py` | 127 | 辅助函数 |

---

## 5. 核心管道架构（pipeline/ 5,888行）

### 5.1 三层管道设计

```
routes.py (410行)
    ↓
VideoService (service/)
    ↓
VideoPipelineService (orchestration/orchestrator.py 1,254行)
    ↓
[engine: agent.py, gpt_request.py, scope_refine.py, ...]
    ↓
LocalAssetStore + VideoRuntimeStateStore
    ↓
[prompts/ - LLM 指令]
```

### 5.2 关键组件

#### a) 编排器（orchestration/orchestrator.py 1,254行）

**主要类**: `VideoPipelineService`

**10 阶段流程**:
1. 理解阶段 (understanding)
2. 分镜规划 (storyboarding)
3. 代码生成 (code_generation)
4. Manim 渲染 (manim_render)
5. 布局检查 (layout_check)
6. 修复循环 (auto_fix)
7. TTS 合成 (tts_synthesis)
8. 视觉验证 (render_verify)
9. 音视频合成 (compose)
10. 上传结果 (upload)

#### b) 运行时状态（orchestration/runtime.py 282行）

**主要类**: `VideoRuntimeStateStore`

**职责**:
- 状态持久化 (Redis/SQLite)
- 进度跟踪
- 错误恢复

#### c) 引擎核心（engine/ 3,196行）

| 文件 | 行数 | 职责 |
|------|------|------|
| `agent.py` | 1,408 | Manim 代码执行、自动修复、问题诊断 |
| `gpt_request.py` | 563 | LLM 调用、重试、流式处理、null 内容处理 |
| `scope_refine.py` | 801 | 内容精化、自动修复循环 |
| `c2v_utils.py` | 224 | 代码到视频工具、主题安全化 |
| `external_assets.py` | 208 | 外部资源加载、缓存 |

#### d) 提示词系统（prompts/ 642行）

**5 个阶段的提示词**:
1. `stage1.py` - 初始化提示
2. `stage2.py` - 内容生成
3. `stage3.py` - 分镜拆解
4. `stage4.py` - 代码优化
5. `stage5_eva.py` + `stage5_unlearning.py` - 评估与知识分解

---

## 6. 任务调度系统

### 6.1 异步任务（tasks/video_task_actor.py 40行）

**Dramatiq Actor**: `VideoTask`

**触发链**:
1. `routes.py` → `create_video_task()` 
2. → `VideoService.create()` 
3. → `video_task.send()` (Dramatiq)
4. → `app/worker.py` 消费

### 6.2 Worker 集成（app/worker.py）

**关键导入**:
```python
from app.features.video.pipeline.models import VideoResultDetail, VideoStage
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.features.video.service import VideoService
from app.features.video.tasks.video_task_actor import VideoTask
```

**职责**:
- Dramatiq 消息消费
- 管道执行
- 状态更新

---

## 7. 配置与环境

### 7.1 Settings（app/core/config.py）

**视频相关配置项** (171-194行):

```python
video_asset_root: str                          # 资源根目录
video_render_quality: str                      # 渲染质量 (m/h)
video_fix_max_attempts: int                    # 自动修复最大尝试次数
video_upload_retry_attempts: int               # 上传重试次数
video_sandbox_cpu_count: float                 # 沙箱 CPU 分配
video_sandbox_memory_mb: int                   # 沙箱内存 (2048MB)
video_sandbox_timeout_seconds: int             # 沙箱超时 (120s → 900s)
video_sandbox_tmp_size_mb: int                 # 临时目录大小
video_sandbox_allow_local_fallback: bool       # 本地 fallback
```

### 7.2 环境文件（.env.example）

```
FASTAPI_VIDEO_ASSET_ROOT=.runtime/video-assets
FASTAPI_VIDEO_RENDER_QUALITY=m
FASTAPI_VIDEO_FIX_MAX_ATTEMPTS=2
FASTAPI_VIDEO_UPLOAD_RETRY_ATTEMPTS=2
FASTAPI_VIDEO_SANDBOX_CPU_COUNT=1.0
FASTAPI_VIDEO_SANDBOX_MEMORY_MB=2048
FASTAPI_VIDEO_SANDBOX_TIMEOUT_SECONDS=120
FASTAPI_VIDEO_SANDBOX_TMP_SIZE_MB=1024
FASTAPI_VIDEO_SANDBOX_ALLOW_LOCAL_FALLBACK=false
```

---

## 8. 测试覆盖

### 8.1 单元测试（tests/unit/video/ 11 个文件）

- `test_video_create_task.py` - 任务创建逻辑
- `test_video_preprocess.py` - 预处理
- `test_video_long_term_records.py` - 历史记录
- `test_video_pipeline_engine.py` - 引擎
- `test_video_pipeline_models.py` - 模型
- `test_video_pipeline_orchestrator_runtime.py` - 编排与运行时
- `test_video_pipeline_services.py` - 管道服务
- `test_video_result_service.py` - 结果服务
- `test_video_ruoyi_auth_paths.py` - RuoYi 权限
- `test_video_worker_timeout.py` - Worker 超时

### 8.2 集成测试（tests/integration/video/ 2 个文件）

- `test_video_pipeline_api.py` - API 集成
- `test_video_assets_route.py` - 资源路由

### 8.3 API 测试（tests/api/video/ 1 个文件）

- `test_video_preview_route.py` - 预览 API

### 8.4 共享测试（引用视频模块）

- `tests/unit/shared/test_task_metadata_persistence.py`
- `tests/integration/tasks/test_task_metadata_persistence.py`

---

## 9. 依赖关系分析

### 9.1 内部依赖（video/ → video/）

```
routes.py
  ├→ models/ (create_task, preprocess, voice)
  ├→ service/ (VideoService, create_task, preprocess)
  ├→ long_term/ (records, service)
  ├→ providers/ (image_storage, ocr)
  └→ pipeline/orchestration/ (LocalAssetStore)

VideoService
  ├→ service/ (各子服务)
  ├→ long_term/ (records, service)
  └→ pipeline/orchestration/ (VideoPipelineService)

orchestrator.py (编排器)
  ├→ engine/ (agent, gpt_request, scope_refine, etc.)
  ├→ prompts/
  ├→ orchestration/runtime
  └→ orchestration/assets
```

### 9.2 外部依赖（video/ ← 其他）

**直接导入 video 模块的文件** (共 24 个):

**关键外部导入者**:
1. `app/api/router.py` - 路由注册
2. `app/worker.py` - Dramatiq 消费
3. `app/main.py` - 主应用声明
4. 16 个测试文件

**导入的主要类**:
- `VideoService` (6 个导入)
- `VideoTask` (2 个导入)
- `VideoRuntimeStateStore` (5 个导入)
- `LocalAssetStore` (5 个导入)
- `VideoPipelineService` (3 个导入)
- `VideoStage` + `VideoResultDetail` (worker + tests)

### 9.3 跨模块依赖

**video/ 导出给其他模块**:
- `app/shared/task_framework/` - 任务类型注册
  - TaskType.VIDEO (schemas.py)
  - TaskContext (context.py)

---

## 10. 删除影响分析

### 10.1 必删除文件清单（共 48 个）

**app/features/video/ 下全部 48 个 Python 文件** (9,188 行):
- 主模块: routes.py, schemas.py, runtime_auth.py (3 个)
- models/: 5 个文件
- service/: 8 个文件
- long_term/: 3 个文件
- providers/: 2 个文件
- pipeline/: 29 个文件 (models, errors, protocols, engine/, orchestration/, prompts/)
- tasks/: 1 个文件

### 10.2 必修改的外部文件

#### a) 路由注册（CRITICAL）

**文件**: `app/api/router.py` (第 14、25 行)

**修改**:
```diff
- from app.features.video.routes import router as video_router
  ...
- v1_router.include_router(video_router)
```

#### b) Worker 集成（CRITICAL）

**文件**: `app/worker.py` (第 21-28 行)

**修改**:
```diff
- from app.features.video.pipeline.models import VideoResultDetail, VideoStage
- from app.features.video.pipeline.orchestration.runtime import (
-     VideoRuntimeStateStore,
-     build_failure,
-     merge_result_detail,
- )
- from app.features.video.service import VideoService
- from app.features.video.tasks.video_task_actor import VideoTask

# 以及 worker.py 中的全部视频任务消费逻辑
```

#### c) 主应用声明（IMPORTANT）

**文件**: `app/main.py` (第 30 行)

**修改**:
```diff
- {"name": "video", "description": "视频功能域骨架。"},
```

#### d) 配置文件（IMPORTANT）

**文件**: `app/core/config.py` (第 171-194 行)

**删除** 9 个视频相关 Settings 字段:
- video_asset_root
- video_render_quality
- video_fix_max_attempts
- video_upload_retry_attempts
- video_sandbox_cpu_count
- video_sandbox_memory_mb
- video_sandbox_timeout_seconds
- video_sandbox_tmp_size_mb
- video_sandbox_allow_local_fallback

#### e) 环境文件（IMPORTANT）

**文件**: `.env.example`, `.env.local.example`, `.env.production.example`, `.env.staging.example`

**删除** 9 行 FASTAPI_VIDEO_* 配置

### 10.3 可选：测试文件删除

**要删除的测试文件** (共 16 个，~600 行):
- `tests/unit/video/` - 10 个文件
- `tests/api/video/` - 1 个文件
- `tests/integration/video/` - 2 个文件
- 引用 video 的共享测试 - 3 个文件

### 10.4 前端影响

**前端需删除的文件** (`packages/student-web/src/`):

- `features/video/` - 完整目录 (~50 个文件)
- `services/api/adapters/video-*.ts` - 6 个文件
- `services/mock/handlers/video-*.ts` - 4 个文件
- `services/mock/fixtures/video-*.ts` - 4 个文件

**前端需修改的文件** (~10 个):
- 路由定义 (app/routes/index.tsx)
- 导航菜单 (components/navigation/)
- i18n 资源 (app/i18n/resources/)
- mock 索引 (services/mock/index.ts)

---

## 11. 依赖包影响

### 11.1 video 专用依赖

**需要检查保留的库**:
- `manim` - 动画库（仅 video 使用）
- `pydantic` - 数据验证（全项目用）
- `dramatiq` - 任务队列（全项目用）

**video 直接使用的库** (gpt_request.py 等):
- `httpx` - HTTP 客户端
- `tenacity` - 重试库
- `PIL` (Pillow) - 图像处理
- `cv2` (opencv) - 视频处理
- `ffmpeg-python` - FFmpeg 包装

---

## 12. 总结

### 12.1 影响范围

| 类别 | 数量 | 严重度 |
|------|------|--------|
| 后端代码文件 | 48 | CRITICAL |
| 后端代码行数 | 9,188 | CRITICAL |
| 外部修改文件 | 4+5 | CRITICAL |
| 测试文件 | 16 | HIGH |
| 前端文件 | ~70 | CRITICAL |
| 配置项 | 9 | HIGH |
| 环境变量 | 9 | HIGH |

### 12.2 删除前检查清单

- [ ] 确认所有视频相关任务已完成或迁移
- [ ] 验证 Dramatiq worker 消息队列为空
- [ ] 确认 Redis 中无运行中的视频任务
- [ ] 备份 `.runtime/video-assets` 目录
- [ ] 备份数据库表（如有视频元数据）
- [ ] 通知前端团队停止使用视频 API
- [ ] 更新 API 文档删除视频端点
- [ ] 检查是否有第三方集成视频功能

### 12.3 删除顺序（推荐）

1. **停用** - 在 routes.py 中注释掉路由
2. **迁移** - 导出现有视频任务数据
3. **清理** - 删除 app/features/video/ 全目录
4. **修改** - 更新 app/api/router.py, app/worker.py, app/main.py
5. **配置** - 删除 app/core/config.py 中视频字段
6. **环境** - 清理所有 .env 文件中的 FASTAPI_VIDEO_* 变量
7. **测试** - 删除/更新测试文件
8. **前端** - 删除前端视频模块（分开处理）
9. **验证** - 运行测试套件，启动应用验证

### 12.4 关键里程碑

- **代码行数减少**: 9,188 行 → 0（删除视频模块）
- **文件数减少**: 48 个 → 0（视频模块）
- **API 端点减少**: ~15 个（视频端点）
- **Settings 字段减少**: 9 个
- **Dramatiq actors 减少**: 1 个 (VideoTask)

---

## 13. 附表：完整文件清单

### 13.1 所有视频模块 Python 文件（48 个）

```
app/features/video/__init__.py
app/features/video/routes.py
app/features/video/schemas.py
app/features/video/runtime_auth.py

app/features/video/models/__init__.py
app/features/video/models/base.py
app/features/video/models/create_task.py
app/features/video/models/preprocess.py
app/features/video/models/voice.py

app/features/video/service/__init__.py
app/features/video/service/base_service.py
app/features/video/service/_helpers.py
app/features/video/service/create_task.py
app/features/video/service/preprocess.py
app/features/video/service/artifact_service.py
app/features/video/service/result_service.py
app/features/video/service/publication_service.py
app/features/video/service/voice_catalog.py

app/features/video/long_term/__init__.py
app/features/video/long_term/records.py
app/features/video/long_term/service.py

app/features/video/providers/image_storage.py
app/features/video/providers/ocr.py

app/features/video/pipeline/__init__.py
app/features/video/pipeline/models.py
app/features/video/pipeline/errors.py
app/features/video/pipeline/protocols.py

app/features/video/pipeline/engine/__init__.py
app/features/video/pipeline/engine/agent.py
app/features/video/pipeline/engine/gpt_request.py
app/features/video/pipeline/engine/scope_refine.py
app/features/video/pipeline/engine/c2v_utils.py
app/features/video/pipeline/engine/external_assets.py

app/features/video/pipeline/orchestration/__init__.py
app/features/video/pipeline/orchestration/orchestrator.py
app/features/video/pipeline/orchestration/runtime.py
app/features/video/pipeline/orchestration/assets.py
app/features/video/pipeline/orchestration/upload.py

app/features/video/pipeline/prompts/__init__.py
app/features/video/pipeline/prompts/base_class.py
app/features/video/pipeline/prompts/stage1.py
app/features/video/pipeline/prompts/stage2.py
app/features/video/pipeline/prompts/stage3.py
app/features/video/pipeline/prompts/stage4.py
app/features/video/pipeline/prompts/stage5_eva.py
app/features/video/pipeline/prompts/stage5_unlearning.py

app/features/video/tasks/video_task_actor.py
```

