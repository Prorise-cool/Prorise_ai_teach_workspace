# FastAPI Test Suite Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `packages/fastapi-backend` 的测试体系重排为稳定的分层结构，清理低价值资产测试与伪测试文件，统一 pytest 入口、markers、helpers、CI 和文档。

**Architecture:** 这次改造不动业务语义，重点收敛测试执行模型和测试资产边界。先建立统一 pytest 配置与命令入口，再抽公共测试 helper、删除跨仓库低价值资产测试，最后补 GitHub Actions 和文档回写，使本地与 CI 运行路径一致。

**Tech Stack:** Python 3.11+, pytest 8, pytest-asyncio, FastAPI TestClient, GitHub Actions, pnpm root scripts

---

### Task 1: 建立 pytest 执行契约

**Files:**
- Create: `packages/fastapi-backend/pytest.ini`
- Modify: `packages/fastapi-backend/pyproject.toml`
- Modify: `package.json`
- Test: `packages/fastapi-backend/tests/unit/providers/llm/test_openai_compatible_provider_sdk.py`

- [ ] **Step 1: 先写配置层失败验证**

Run: `packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests --collect-only -q`
Expected: 出现 `PytestUnknownMarkWarning: Unknown pytest.mark.asyncio`

- [ ] **Step 2: 创建 `pytest.ini` 并注册所有测试层级和能力 markers**

```ini
[pytest]
testpaths = tests
pythonpath = .
addopts = -ra --strict-markers
markers =
    unit: fast isolated unit tests
    api: FastAPI route tests with TestClient
    integration: multi-component integration tests
    contract: schema and contract conformance tests
    e2e: executable end-to-end tests only
    slow: long-running tests
    redis: tests that exercise redis-backed runtime behavior
    external: tests that require non-local upstream services
```

- [ ] **Step 3: 移除 `pyproject.toml` 中重复 pytest 配置，只保留构建与依赖定义**

```toml
[tool.setuptools.packages.find]
where = ["."]
include = ["app*"]
```

- [ ] **Step 4: 给分层命令补齐 contracts / coverage / ci 入口**

```json
{
  "scripts": {
    "test:fastapi-backend": "packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests",
    "test:fastapi-backend:unit": "packages/fastapi-backend/.venv/bin/python -m pytest -m unit packages/fastapi-backend/tests/unit",
    "test:fastapi-backend:api": "packages/fastapi-backend/.venv/bin/python -m pytest -m 'api or contract' packages/fastapi-backend/tests/api packages/fastapi-backend/tests/contracts",
    "test:fastapi-backend:integration": "packages/fastapi-backend/.venv/bin/python -m pytest -m integration packages/fastapi-backend/tests/integration",
    "test:fastapi-backend:contracts": "packages/fastapi-backend/.venv/bin/python -m pytest -m contract packages/fastapi-backend/tests/contracts",
    "test:fastapi-backend:coverage": "packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests --cov=app --cov-report=term-missing",
    "test:fastapi-backend:ci": "packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests --collect-only -q && pnpm test:fastapi-backend:unit && pnpm test:fastapi-backend:api && pnpm test:fastapi-backend:integration"
  }
}
```

- [ ] **Step 5: 给现存测试文件补主层级 marker**

```python
import pytest

pytestmark = pytest.mark.api
```

```python
import pytest

pytestmark = pytest.mark.unit
```

- [ ] **Step 6: 运行 collect-only 验证 warning 已消失**

Run: `packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests --collect-only -q`
Expected: `313 tests collected`，无 `UnknownMarkWarning`

- [ ] **Step 7: 提交配置层改造**

```bash
git add packages/fastapi-backend/pytest.ini packages/fastapi-backend/pyproject.toml package.json packages/fastapi-backend/tests
git commit -m "test(fastapi): standardize pytest markers and command entrypoints"
```

### Task 2: 抽公共测试 helper 并统一 app/client 装配

**Files:**
- Create: `packages/fastapi-backend/tests/helpers/__init__.py`
- Create: `packages/fastapi-backend/tests/helpers/app.py`
- Create: `packages/fastapi-backend/tests/helpers/paths.py`
- Modify: `packages/fastapi-backend/tests/conftest.py`
- Modify: `packages/fastapi-backend/tests/api/tasks/test_task_recovery_routes.py`
- Modify: `packages/fastapi-backend/tests/api/video/test_video_preview_route.py`
- Modify: `packages/fastapi-backend/tests/integration/learning/test_learning_result_persistence_api.py`
- Test: `packages/fastapi-backend/tests/api/tasks/test_task_recovery_routes.py`

- [ ] **Step 1: 先为 helper 抽取写一个会失败的路径与 app builder 用例**

```python
from tests.helpers.app import create_authed_app
from tests.helpers.paths import repo_root


def test_repo_root_points_to_workspace_root() -> None:
    assert (repo_root() / "packages/fastapi-backend").exists()


def test_create_authed_app_sets_default_access_context() -> None:
    app = create_authed_app()
    assert app.dependency_overrides
```

- [ ] **Step 2: 运行新 helper 测试并确认失败**

Run: `packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests/unit/core/test_test_helpers.py -q`
Expected: FAIL，提示 `tests.helpers.app` 或 `tests.helpers.paths` 不存在

- [ ] **Step 3: 实现公共路径 helper**

```python
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]
```

- [ ] **Step 4: 实现公共 app builder helper**

```python
from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import override_auth


def create_authed_app(ctx=None):
    app = create_app()
    override_auth(app, ctx)
    return app


def create_authed_client(ctx=None) -> TestClient:
    return TestClient(create_authed_app(ctx))
```

- [ ] **Step 5: 把重复 `create_app + override_auth + TestClient` 装配切到 helper**

```python
from tests.helpers.app import create_authed_app


def _create_test_app(ctx=None):
    return create_authed_app(ctx)
```

```python
from tests.helpers.app import create_authed_client


def test_video_preview_route_returns_progressive_preview_payload() -> None:
    app = create_authed_app()
```

- [ ] **Step 6: 把硬编码 `parents[5]` 路径切到 `repo_root()`**

```python
from tests.helpers.paths import repo_root


REPO_ROOT = repo_root()
```

- [ ] **Step 7: 跑 helper 相关回归**

Run: `packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests/api/tasks/test_task_recovery_routes.py packages/fastapi-backend/tests/api/video/test_video_preview_route.py packages/fastapi-backend/tests/integration/learning/test_learning_result_persistence_api.py -q`
Expected: 全部通过

- [ ] **Step 8: 提交 helper 收敛**

```bash
git add packages/fastapi-backend/tests/helpers packages/fastapi-backend/tests/conftest.py packages/fastapi-backend/tests/api packages/fastapi-backend/tests/integration
git commit -m "test(fastapi): extract shared test app and path helpers"
```

### Task 3: 清理低价值资产测试与伪测试文件

**Files:**
- Delete: `packages/fastapi-backend/test_llm_minimal.py`
- Delete: `packages/fastapi-backend/tests/e2e/video-transparent-test.html`
- Delete: `packages/fastapi-backend/tests/unit/assets/test_epic10_data_boundary_assets.py`
- Delete: `packages/fastapi-backend/tests/unit/assets/test_epic10_ruoyi_xiaomai_module_assets.py`
- Modify: `packages/fastapi-backend/README.md`
- Test: `packages/fastapi-backend/tests`

- [ ] **Step 1: 先用现状命令记录失败基线**

Run: `pnpm test:fastapi-backend`
Expected: FAIL，6 个失败集中在 `tests/unit/assets/*` 缺失 Epic 10 文档和 SQL 资产

- [ ] **Step 2: 删除不属于 FastAPI 可维护测试边界的伪测试与跨仓库资产测试**

```bash
rm packages/fastapi-backend/test_llm_minimal.py
rm packages/fastapi-backend/tests/e2e/video-transparent-test.html
rm packages/fastapi-backend/tests/unit/assets/test_epic10_data_boundary_assets.py
rm packages/fastapi-backend/tests/unit/assets/test_epic10_ruoyi_xiaomai_module_assets.py
```

- [ ] **Step 3: 在 README 中把 `e2e` 改成“仅保留可执行自动化测试”规则**

```md
- `tests/e2e/` 仅保留真正可执行自动化测试；静态样例或人工验收素材不再放入测试层目录。
- FastAPI 测试不再承接跨仓库文档 / SQL 资产存在性断言，此类治理由对应模块文档或实现仓库自测负责。
```

- [ ] **Step 4: 跑全量测试确认红灯已收干净**

Run: `pnpm test:fastapi-backend`
Expected: PASS，且不再出现 Epic 10 资产缺失失败

- [ ] **Step 5: 提交测试资产清理**

```bash
git add packages/fastapi-backend/README.md
git rm packages/fastapi-backend/test_llm_minimal.py packages/fastapi-backend/tests/e2e/video-transparent-test.html packages/fastapi-backend/tests/unit/assets/test_epic10_data_boundary_assets.py packages/fastapi-backend/tests/unit/assets/test_epic10_ruoyi_xiaomai_module_assets.py
git commit -m "test(fastapi): remove pseudo tests and broken asset assertions"
```

### Task 4: 增加 FastAPI GitHub Actions 并对齐 CI 入口

**Files:**
- Create: `.github/workflows/fastapi-backend-tests.yml`
- Modify: `packages/fastapi-backend/README.md`
- Modify: `package.json`
- Test: `.github/workflows/fastapi-backend-tests.yml`

- [ ] **Step 1: 新建后端测试工作流**

```yaml
name: FastAPI Backend Tests

on:
  pull_request:
    paths:
      - "packages/fastapi-backend/**"
      - ".github/workflows/fastapi-backend-tests.yml"
      - "package.json"
  push:
    branches: [master]
    paths:
      - "packages/fastapi-backend/**"
      - ".github/workflows/fastapi-backend-tests.yml"
      - "package.json"

jobs:
  fastapi-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.5.0
      - name: Install backend env
        run: pnpm setup:fastapi-backend
      - name: Run FastAPI CI test command
        run: pnpm test:fastapi-backend:ci
      - name: Run FastAPI coverage
        run: pnpm test:fastapi-backend:coverage
```

- [ ] **Step 2: README 明确本地与 CI 共用同一套入口**

```md
CI 使用 `pnpm test:fastapi-backend:ci` 与 `pnpm test:fastapi-backend:coverage`，本地排查请优先复现这两个命令，不要手写另一套隐藏路径。
```

- [ ] **Step 3: 用 YAML 解析和命令检查做本地验证**

Run: `python3 - <<'PY'\nimport yaml, pathlib\nprint(yaml.safe_load(pathlib.Path('.github/workflows/fastapi-backend-tests.yml').read_text())['name'])\nPY`
Expected: 输出 `FastAPI Backend Tests`

- [ ] **Step 4: 跑一次 CI 等价入口**

Run: `pnpm test:fastapi-backend:ci`
Expected: collect-only、unit、api、integration 全部通过

- [ ] **Step 5: 提交 CI 工作流**

```bash
git add .github/workflows/fastapi-backend-tests.yml packages/fastapi-backend/README.md package.json
git commit -m "ci(fastapi): add backend test workflow"
```

### Task 5: 回写项目文档与 BMAD 状态

**Files:**
- Create: `docs/01开发人员手册/009-里程碑与进度/0030-fastapi-测试体系规范化-20260417.md`
- Modify: `docs/01开发人员手册/009-里程碑与进度/index.md`
- Modify: `_bmad-output/INDEX.md`
- Modify: `_bmad-output/implementation-artifacts/index.md`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Test: `pnpm test:fastapi-backend:coverage`

- [ ] **Step 1: 新增本轮治理记录**

```md
# FastAPI 测试体系规范化 - 2026-04-17

- 清理 `test_llm_minimal.py` 与 `tests/e2e/video-transparent-test.html`
- 删除不再成立的 Epic 10 资产测试
- 新增 pytest markers、CI 入口与 GitHub Actions
- 抽离共享 tests helpers
- 基线从 `313 collected / 6 failed` 收敛为全量通过
```

- [ ] **Step 2: 在进度索引追加条目**

```md
- **[0030-fastapi-测试体系规范化-20260417.md](./0030-fastapi-测试体系规范化-20260417.md)** - FastAPI 测试目录、pytest 执行模型、CI 入口与伪测试资产清理收口
```

- [ ] **Step 3: 在 `_bmad-output` 索引中补实现产物导航**

```md
- [0030-fastapi-测试体系规范化-20260417.md](../docs/01开发人员手册/009-里程碑与进度/0030-fastapi-测试体系规范化-20260417.md) - FastAPI 测试治理收口记录
```

- [ ] **Step 4: 在 `sprint-status.yaml` 或相关说明中更新当前治理状态**

```yaml
notes:
  - 2026-04-17: FastAPI 测试体系规范化已建立统一 pytest/CI 入口，并清理伪测试资产
```

- [ ] **Step 5: 跑最终覆盖率命令**

Run: `pnpm test:fastapi-backend:coverage`
Expected: PASS，并输出覆盖率摘要

- [ ] **Step 6: 提交文档回写**

```bash
git add docs/01开发人员手册/009-里程碑与进度 _bmad-output/INDEX.md _bmad-output/implementation-artifacts/index.md _bmad-output/implementation-artifacts/sprint-status.yaml
git commit -m "docs(fastapi): record test suite normalization rollout"
```

## Self-Review

- Spec coverage: 已覆盖 pytest 入口、fixture/helper 收敛、噪音测试清理、CI、新文档和 `_bmad-output` 回写。
- Placeholder scan: 无 `TODO`、`TBD` 或“类似 Task N”占位描述。
- Type consistency: helper 名称统一为 `create_authed_app`、`create_authed_client`、`repo_root`，命令入口统一使用 `test:fastapi-backend:*` 前缀。
