# FastAPI Backend 结构审查报告

> **状态**：已审查
> **审查对象**：`packages/fastapi-backend/`
> **最后更新**：2026-04-06

---

## 审查目标

本报告用于评估 `packages/fastapi-backend/` 当前后端实现是否满足以下目标：

1. 目录结构是否仍与 `_bmad-output/` 的 FastAPI 架构基线对齐。
2. feature 边界是否清晰，是否已经出现跨模块耦合。
3. 重复代码是否开始积累，并进入后续必须收敛的阶段。
4. 测试与工程运行态是否足以支撑继续迭代。

## 审查依据

1. `_bmad-output/planning-artifacts/architecture/03-3-核心术语与架构原则.md`
2. `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`
3. `_bmad-output/implementation-artifacts/2-6-sse-断线恢复与-status-查询降级.md`
4. `_bmad-output/implementation-artifacts/3-5-创建后跳转等待页与任务上下文承接.md`
5. `packages/fastapi-backend/app/**`
6. `packages/fastapi-backend/tests/**`

## 审查方法

1. 逐层检查 `app/main.py`、`app/api/`、`app/core/`、`app/providers/`、`app/features/`、`app/shared/` 的装配关系。
2. 对照 `_bmad-output/` 中冻结的 feature-module、自主边界和任务路由契约。
3. 检查 `video / classroom / companion / knowledge / learning` 之间的跨模块引用和重复实现。
4. 运行 `cd packages/fastapi-backend && ./.venv/bin/pytest` 验证当前测试可执行性。

## 总体结论

当前后端**基础分层是成立的**，`main -> api -> feature/core/shared/providers/infra` 的主结构没有跑偏，`ProviderFactory`、`task_framework`、`RuoYiClient` 这些基础设施层也已经具备继续演进的形状。

但从模块自治和冗余控制来看，当前代码已经出现了**两类必须尽快收敛的结构性问题**：

1. `video / classroom / companion / knowledge` 之间出现了明显的跨 feature 直接依赖，和架构里要求的 `Feature-Module 自治` 不再完全一致。
2. 任务元数据和长期记录模型的复用方式偏“复制 + 借壳”，而不是稳定抽象，后续再加 Story 时会持续放大维护成本。

结论建议：

- 可以继续迭代，但不建议在当前结构上继续横向铺更多 feature。
- 应先完成一轮“边界收敛 + 契约对齐 + 冗余清理”，再继续扩写业务能力。

## 正向观察

1. `app/main.py` 与 `app/api/router.py` 的应用工厂和路由聚合关系清楚，主入口没有失控。
2. `app/providers/factory.py` 的工厂、注册表、failover 组装方式比较整洁，基础设施层方向是对的。
3. `app/shared/task_framework/` 已经具备任务执行、运行时事件和状态管理的统一骨架，后续扩展空间明确。
4. 测试数量并不低，`pytest` 实际收集到 95 个测试项，说明团队已经在补 unit / integration 覆盖，而不是完全裸奔。

## Findings

### High 1：`classroom` 直接依赖 `video.task_metadata`，已打穿 feature 边界

**证据**

1. `app/features/classroom/service.py:9-13` 直接从 `app.features.video.task_metadata` 导入 `TASK_METADATA_RUOYI_MAPPER`、`TaskType`、`snapshot_from_ruoyi_row`。
2. `app/features/classroom/service.py:136-140` 继续从同一模块导入 `TaskMetadataRepository`。
3. 架构基线 `_bmad-output/planning-artifacts/architecture/03-3-核心术语与架构原则.md:59-67` 已明确要求：`video` 与 `classroom` 共享基础设施和 provider，但 feature 模块应自治。

**影响**

1. `classroom` 的任务元数据模型无法独立演进，任何字段或 mapper 改动都要先看 `video`。
2. 这会把“共享基础设施”误演化成“共享业务模块”，后续再接入第三种任务域时只会继续复制这套耦合方式。
3. code ownership 会越来越模糊，feature review 也会被迫跨目录联动。

**建议**

1. 把任务元数据抽到中性位置，例如 `app/shared/task_metadata/` 或 `app/features/task_metadata/`。
2. 如果 `video` 和 `classroom` 的长期字段未来会分叉，就只保留共享 mapper / snapshot 基类，不共享整个 feature 文件。

### High 2：`knowledge` 通过 `companion/long_term_records.py` 借壳建模，模块自治已经失真

**证据**

1. `app/features/knowledge/service.py:3-8` 直接从 `app.features.companion.long_term_records` 导入 `KnowledgeChatCreateRequest`、`KnowledgeChatSnapshot` 及转换函数。
2. `app/features/knowledge/routes.py:4` 同样从 `companion.long_term_records` 导入 `KnowledgeChatCreateRequest` 与 `KnowledgeChatSnapshot`。
3. `app/features/companion/long_term_records.py` 当前达到 616 行，并同时承载 `Companion`、`Whiteboard`、`Knowledge` 的表结构与转换逻辑；关键入口见 `:14-16`、`:100`、`:108`、`:141`、`:177`、`:197`、`:597`。
4. `_bmad-output/planning-artifacts/architecture/03-3-核心术语与架构原则.md:25`、`:67` 已把 `features/knowledge/` 定义成独立模块语义。

**影响**

1. `knowledge` 的任何模型改动都要进入 `companion` 文件，导致两个 feature 的改动流和冲突面绑在一起。
2. `long_term_records.py` 已经表现出“领域模型垃圾堆”倾向，后续白板、证据、会话回放继续增加时会更难维护。
3. 模块结构看起来分了目录，实际代码边界已经被削弱。

**建议**

1. 拆分 `app/features/companion/long_term_records.py`。
2. 至少拆成：
   - `app/features/companion/models.py`
   - `app/features/companion/whiteboard/models.py`
   - `app/features/knowledge/models.py`
3. 仅把真正跨域可复用的 mapper helper 下沉到 shared 层，不再让 `knowledge` 反向依赖 `companion`。

### Medium 1：任务状态与 SSE 路由实现，已和 `_bmad-output` 的模块级契约发生漂移

**证据**

1. `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md:32-37` 冻结的契约是：
   - `/api/v1/{module}/tasks/{id}/status`
   - `/api/v1/{module}/tasks/{id}/events`
2. `_bmad-output/implementation-artifacts/3-5-创建后跳转等待页与任务上下文承接.md` 与 `4-7-视频等待页前端状态机恢复与降级.md` 也都明确消费 `/api/v1/video/tasks/{id}/status` 和 `/api/v1/video/tasks/{id}/events`。
3. 当前后端实际只在 `app/api/routes/tasks.py:190-260` 提供共享路由：
   - `/api/v1/tasks/{task_id}/status`
   - `/api/v1/tasks/{task_id}/events`
4. 当前测试也已按共享路由编写，例如 `tests/test_task_recovery_routes.py:78`、`:127`。

**影响**

1. 前后端 Story 资产和真实实现已经出现双轨事实，后续 adapter、mock、OpenAPI、验收文档容易继续漂移。
2. 如果后面要做 module-specific 鉴权、指标、审计或路由代理规则，共享 `/tasks/*` 会变成收口障碍。
3. 这类问题短期不会马上报错，但很容易在联调阶段反复返工。

**建议**

1. 二选一，不要继续维持混合状态：
   - 方案 A：补模块级别别名路由，与 `_bmad-output` 契约对齐。
   - 方案 B：正式回写 `_bmad-output`，把 canonical 契约改成共享 `/api/v1/tasks/*`。
2. 在 canonical source 未更新前，不应再新增依赖该路由的前端 Story。

### Medium 2：路由层使用模块级单例 service，导致装配边界不清、测试必须 monkeypatch 全局变量

**证据**

1. `app/features/video/routes.py:33-34`、`app/features/classroom/routes.py:18`、`app/features/companion/routes.py:14`、`app/features/knowledge/routes.py:10`、`app/features/learning/routes.py:13` 都在模块加载时创建 service 单例。
2. 测试为了替换依赖，只能 monkeypatch 路由模块中的全局 `service`：
   - `tests/integration/test_task_metadata_persistence.py:29-31`
   - `tests/integration/test_companion_evidence_api_persistence.py:28-30`
   - `tests/integration/test_learning_result_persistence.py:62`

**影响**

1. `create_app()` 不再是唯一装配入口，依赖对象在 import 时已经部分冻结。
2. 路由测试需要侵入模块全局变量，说明依赖注入边界不够干净。
3. 后续如果 service 需要携带 runtime config、request scope 或 tracing 上下文，这种模式会越来越别扭。

**建议**

1. 为每个 feature 补 `get_*_service()` 工厂函数，通过 `Depends` 注入。
2. 把依赖装配重新收回 app factory 或显式 provider 层，减少 monkeypatch 全局变量的测试手法。

### Medium 3：任务元数据仓储存在“假共享、真闲置”的冗余形态

**证据**

1. `app/features/video/task_metadata.py:283` 暴露了 `shared_task_metadata_repository = TaskMetadataRepository()`。
2. 但生产代码并未真正消费这个共享实例；`rg` 结果显示它只在测试里被引用。
3. `app/features/video/service.py:24-27`、`:135-142` 与 `app/features/classroom/service.py:24-27`、`:135-142` 在未传入 repository 时，会每次新建 `TaskMetadataRepository()`。

**影响**

1. 当前代码同时保留了“可注入 repository”“共享 repository 实例”“实际每次新建 repository”三种思路，但没有统一收敛。
2. 这会误导后续开发者，以为系统仍有共享内存态作为真实依赖。
3. 对“RuoYi 才是长期真值”的架构表达也不够清晰。

**建议**

1. 如果 repository 只用于构造 snapshot，就把它改成纯函数或 builder。
2. 如果确实需要共享内存仓储，就让 app 层显式注入同一个实例。
3. 否则应删除 `shared_task_metadata_repository` 和对应分支，避免冗余抽象继续存在。

### Low 1：包内文档已明显落后于真实实现

**证据**

1. `packages/fastapi-backend/README.md:14-16` 仍写着“当前阶段为 Epic 0 的可启动框架骨架”“当前不包含任何视频、课堂、Companion 或 Learning Coach 业务实现”。
2. 实际代码里已经存在：
   - `video` 任务创建、预处理、元数据读写
   - `classroom` 元数据读写与会话回放
   - `companion / knowledge / learning` 长期数据回写
   - `providers` failover 与 `task_framework` 执行骨架
3. `README.md:30-34` 里列出的测试也只剩最早期的两项，和当前 95 个测试项不一致。

**影响**

1. 新成员会误判模块成熟度和当前边界。
2. 审查、联调、排障时会优先被过期说明带偏。

**建议**

1. 把 `README.md` 与 `packages/fastapi-backend/INDEX.md` 回写到当前真实阶段。
2. 至少同步当前 feature、关键接口、测试入口和运行依赖。

## 验证记录

### 代码结构抽样

本次重点查看了以下文件：

1. `packages/fastapi-backend/app/main.py`
2. `packages/fastapi-backend/app/api/router.py`
3. `packages/fastapi-backend/app/api/routes/tasks.py`
4. `packages/fastapi-backend/app/features/video/service.py`
5. `packages/fastapi-backend/app/features/classroom/service.py`
6. `packages/fastapi-backend/app/features/companion/service.py`
7. `packages/fastapi-backend/app/features/companion/long_term_records.py`
8. `packages/fastapi-backend/app/features/knowledge/service.py`
9. `packages/fastapi-backend/app/features/learning/service.py`
10. `packages/fastapi-backend/app/providers/factory.py`

### 测试执行结果

执行命令：

```bash
cd packages/fastapi-backend && ./.venv/bin/pytest
```

结果：

1. `pytest` 成功收集到 95 个测试项，但在 collection 阶段出现 11 个错误。
2. 直接原因是当前 `.venv` 缺少 `python-multipart` 和 `pytest-asyncio`。
3. 具体现象：
   - FastAPI 在加载 `app/features/video/routes.py` 的文件上传接口时抛出 `Form data requires "python-multipart" to be installed`
   - `tests/unit/test_video_preprocess.py` 中的 `@pytest.mark.asyncio` 出现 `Unknown pytest.mark.asyncio` 警告
4. `pyproject.toml:11-24` 已声明这些依赖，因此这更像是**环境同步问题**，而不是后端代码本身的逻辑错误。

## 优先收敛顺序

1. 先解决 High 1 和 High 2，把 feature 边界重新拉直。
2. 然后解决 Medium 1，把任务路由契约与 `_bmad-output` 对齐。
3. 再处理 Medium 2 和 Medium 3，收回依赖注入与冗余抽象。
4. 最后补 README / INDEX 和环境同步说明，降低团队误判成本。

## 最终判断

`packages/fastapi-backend/` 当前**不是结构失控**，但已经进入“再不收敛，后续每个 Story 都会多付一次复杂度税”的阶段。

最核心的问题不是代码量太大，而是：

1. feature 自治边界开始被跨模块引用打穿。
2. 共享抽象还没稳定，就已经被多个模块半复用、半复制。
3. canonical contract 与真实实现出现漂移。

如果现在进行一轮有边界意识的整理，这个后端还可以保持很好的演进形状；如果继续在现状上叠功能，冗余和耦合会明显加速。
