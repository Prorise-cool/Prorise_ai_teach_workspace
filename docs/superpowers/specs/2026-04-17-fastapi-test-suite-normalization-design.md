---
title: FastAPI 测试体系一次性重排设计
date: 2026-04-17
status: drafted
owner: Quinn
scope: packages/fastapi-backend
---

# FastAPI 测试体系一次性重排设计

## 1. 背景

当前 `packages/fastapi-backend/tests` 已经积累出相当数量的测试，但存在以下结构性问题：

- 测试目录分层不彻底，既有 `unit / api / integration / contracts`，又混有根级散文件与非自动化资产。
- 全局 fixture、分层 fixture、域内 helper 没有清晰边界，导致测试写法逐步漂移。
- `pytest` 执行模型不完整，缺少统一 marker 体系，`--collect-only` 已暴露 `UnknownMarkWarning`。
- 低价值旧测试、临时脚本、被跟踪的缓存类资产仍混在仓库中。
- GitHub Actions 尚未形成真正执行 FastAPI 测试的标准工作流，本地与 CI 入口未对齐。

这轮工作不做零散修补，而是把 FastAPI 测试体系视为一个独立治理任务，一次性收成可维护、可扩展、可在 CI 中稳定执行的标准结构。

## 2. 目标

本次设计的目标如下：

1. 把 FastAPI 测试目录重排为稳定、可解释的层级结构。
2. 建立统一的 `pytest` marker、fixture 分层和 helper 组织方式。
3. 删除低价值旧测试、临时脚本、根级散文件和测试目录中的噪音资产。
4. 把本地命令入口、README、开发手册和 GitHub Actions 对齐到同一套执行模型。
5. 为后续新增测试建立明确约束，避免重新滑回“哪里方便就写哪里”的状态。

## 3. 非目标

本轮不包含以下内容：

- 不顺带修改 FastAPI 业务语义或接口契约，除非测试规范化所必需。
- 不把 student-web、RuoYi 或其他子项目的测试一起拉入治理范围。
- 不做“为了测试而测试”的覆盖率冲高，不额外制造低信号测试。
- 不保留仅为兼容历史路径存在的空壳结构。

## 4. 事实基线

设计与实施必须遵守以下已确认事实：

- `_bmad-output/` 是仓库规划事实源。
- FastAPI 测试规范化是独立任务，不复用 `Issue #166` 的验收口径，但需在新 issue 中引用 `#166` 作为相关背景。
- 根级 `AGENTS.md` 要求临时脚本显式临时命名并在收口前删除。
- `project-context.md` 要求任务状态、SSE、认证和运行态逻辑必须覆盖关键失败路径，且测试需围绕真实契约组织。

## 5. 当前问题归纳

### 5.1 结构问题

- 根级存在 `test_llm_minimal.py` 这类明显临时排查脚本。
- `tests/e2e/` 当前仅承载静态 HTML 文件，不属于可执行自动化测试。
- 测试层级与业务域两套分类标准混用，导致同类测试写法和落点不一致。

### 5.2 执行模型问题

- `pytest` 只配置了 `testpaths` 与 `pythonpath`，没有形成完整 marker 注册和默认选项。
- 现存 `pytest.mark.asyncio` 已触发 unknown marker 警告。
- 根级 `package.json` 有基础命令，但缺少覆盖率、慢测、CI 对齐等规范入口。

### 5.3 可维护性问题

- helper、payload builder、断言函数散落在各测试文件中，重复逻辑较多。
- fixture 只在根级 `conftest.py` 中起步，尚未形成按测试层级拆分的治理模型。
- 目录中被跟踪的 `__pycache__` 与历史路径噪音削弱了测试目录的可读性。

### 5.4 CI 问题

- 仓库当前没有真正执行 FastAPI 测试的 GitHub Actions 工作流。
- PR 上无法稳定看到 FastAPI 分层测试结果，也无法验证本地与 CI 是否一致。

## 6. 目标结构

FastAPI 测试目录重排后的目标结构如下：

```text
packages/fastapi-backend/
├── tests/
│   ├── conftest.py
│   ├── helpers/
│   │   ├── factories/
│   │   ├── assertions/
│   │   └── fixtures/
│   ├── unit/
│   │   ├── core/
│   │   ├── auth/
│   │   ├── providers/
│   │   ├── shared/
│   │   ├── task_framework/
│   │   ├── video/
│   │   ├── learning/
│   │   └── companion/
│   ├── api/
│   │   ├── system/
│   │   ├── auth/
│   │   ├── tasks/
│   │   └── video/
│   ├── integration/
│   │   ├── tasks/
│   │   ├── ruoyi/
│   │   ├── learning/
│   │   ├── companion/
│   │   └── video/
│   ├── contracts/
│   └── e2e/
├── pytest.ini
└── README.md
```

### 结构原则

- 顶层先按测试层级分区，再在层级内部按业务域拆分。
- `tests/` 根目录不再放单个 `test_*.py`。
- `helpers/` 承接可复用 builder、断言与测试工具，不允许继续把复杂辅助逻辑散在业务测试文件中。
- `e2e/` 只保留真正可执行自动化测试；无法执行的静态资产移出测试层语义。

## 7. Fixture 分层设计

Fixture 采用三级分层：

### 7.1 全局最小层

位置：`tests/conftest.py`

职责：

- 提供真正跨层共享的最小基础件。
- 统一构造认证覆盖、基础 access context、通用 `httpx.MockTransport` 工厂。
- 管理与环境隔离直接相关的 fixture。

限制：

- 不承载特定业务域的复杂组装。
- 不直接塞入大段 fake payload 或领域逻辑。

### 7.2 分层 fixture

位置示例：

- `tests/unit/conftest.py`
- `tests/api/conftest.py`
- `tests/integration/conftest.py`

职责：

- `unit` 层负责最薄的纯内存依赖。
- `api` 层负责 FastAPI app、dependency override、TestClient 组装。
- `integration` 层负责 Redis、Dramatiq、RuoYi mock upstream、文件系统等组合场景。

### 7.3 域内 helper / factory

位置示例：

- `tests/helpers/factories/task_events.py`
- `tests/helpers/factories/video_payloads.py`
- `tests/helpers/assertions/sse.py`

职责：

- 承接跨多个文件复用的 builder、payload factory、断言模板。
- 为 SSE、任务状态、视频 preview、RuoYi 响应等高重复对象提供统一生成方式。

## 8. Marker 与执行模型

将补齐并强制使用以下 marker：

- `unit`
- `api`
- `integration`
- `contract`
- `e2e`
- `slow`
- `redis`
- `external`

规则如下：

- 每个测试文件必须至少有一个主层级 marker。
- 涉及 Redis、外部 upstream、长耗时场景时，再额外叠加能力 marker。
- `pytest --collect-only` 不允许再出现 unknown marker 警告。

同时新增或收敛以下命令入口：

- `pnpm test:fastapi-backend`
- `pnpm test:fastapi-backend:unit`
- `pnpm test:fastapi-backend:api`
- `pnpm test:fastapi-backend:integration`
- `pnpm test:fastapi-backend:contracts`
- `pnpm test:fastapi-backend:coverage`
- `pnpm test:fastapi-backend:ci`

原则：

- README、开发手册与 GitHub Actions 只使用这些标准入口。
- CI 不直接拼接新的 `pytest` 路径命令，避免本地与 CI 漂移。

## 9. 删除与迁移策略

本轮采取强治理策略。

### 9.1 直接删除

以下资产直接删除，不保留兼容壳：

- 临时排查脚本，例如 `test_llm_minimal.py`
- 被跟踪的 `__pycache__`
- 没有真实自动化执行链的“伪测试资产”
- 与新结构重复、低价值或长期不稳定的旧测试

### 9.2 迁移或降级

- 若 `tests/e2e/` 内资产仍有参考价值，但不属于自动化测试，则移出 `e2e` 语义目录。
- 若旧测试具有业务价值但结构不合格，则重写到新目录，不保留历史路径。

### 9.3 不做的妥协

- 不为历史 import 路径保留空目录。
- 不为了“少改动”而继续容忍根级散文件。
- 不让 README、CI、package.json 各讲各的话。

## 10. CI 设计

新增专门的 GitHub Actions 工作流，例如：

- `.github/workflows/fastapi-backend-tests.yml`

推荐 job 结构：

1. 安装 Python 3.11
2. 缓存 pip 依赖
3. 安装 `packages/fastapi-backend[dev]`
4. 执行 `pytest --collect-only`
5. 执行分层测试命令
6. 执行覆盖率命令

CI 基线要求：

- `collect-only` 干净通过
- 不允许 unknown marker 警告
- `unit / api / integration / contracts` 分层通过
- 全量命令可在 CI 中复现

`e2e` 是否进强制 job 的判断规则：

- 仅当其成为真正自动化测试后才纳入强制门禁。
- 本轮若无法形成真实后端 E2E 自动化，则不把静态文件伪装成测试通过项。

## 11. 文档与项目管理回写

本轮除了代码与测试文件，还要同步更新：

- `packages/fastapi-backend/README.md`
- 根级 `package.json`
- `docs/01开发人员手册/009-里程碑与进度/`
- `_bmad-output/INDEX.md`
- `_bmad-output/implementation-artifacts/index.md`
- `sprint-status.yaml`

此外，需新建一个独立 GitHub Issue 承接本任务，并从该 issue 切出短分支与 Draft PR。

## 12. 实施步骤

### 阶段 1：盘点

- 标记每个现有测试属于哪一层、哪个业务域、是否保留。
- 找出重复覆盖、低信号测试、无执行入口资产和垃圾文件。

### 阶段 2：搭骨架

- 新建 `pytest.ini` 或强化现有 pytest 配置。
- 建立 marker 注册与 helpers 目录。
- 收敛标准命令入口。

### 阶段 3：迁移与重写

- 文件搬迁到新结构。
- 抽离 helper / factory / assertion。
- 删除旧测试、临时脚本与缓存噪音。

### 阶段 4：CI 与文档

- 新增 FastAPI 测试 GitHub Actions。
- 更新 README、开发手册、_bmad-output 和 sprint 状态。
- 运行完整验证并准备 Draft PR。

## 13. 验收标准

任务完成时，以下条件必须全部满足：

1. `packages/fastapi-backend/tests` 不再有根级散测试文件、`__pycache__`、临时脚本或伪测试资产。
2. `pytest --collect-only` 结果干净，无 unknown marker 警告。
3. `unit / api / integration / contracts` 分层测试能独立执行。
4. 全量命令、覆盖率命令和 CI 命令统一使用同一套入口。
5. GitHub Actions 能稳定跑通 FastAPI 测试工作流。
6. README、开发手册和 `_bmad-output` 状态已同步回写。
7. 独立 issue、独立分支、Draft PR 流程完整建立。

## 14. 风险与控制

### 风险 1：一次性重排 diff 较大

控制：

- 先做盘点映射表，保证每个保留测试有明确新归属。
- 迁移后先跑 collect-only，再跑分层，再跑全量。

### 风险 2：测试在迁移中失去真实业务覆盖

控制：

- 不按“文件数量”保留测试，而按“关键行为面”保留测试。
- 以业务域与层级双视角做回归核对。

### 风险 3：CI 与本地再度漂移

控制：

- 强制 CI 仅调用标准命令入口。
- README 与 package.json 同步更新。

## 15. 结论

本次最佳路径是“全量重构 + 强清理 + CI 同步治理”。相比兼容式收口，这种方案一次性成本更高，但能最快把 FastAPI 测试体系拉回到可维护状态，也最符合当前仓库已经暴露出的结构与执行模型问题。
