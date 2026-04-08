# Test Automation Summary

## 本次收口

- 重排 `packages/student-web` 测试目录，业务测试与 `features / services / stores / shared / styles` 共置。
- 收缩 `packages/student-web/src/test/`，仅保留 `setup.ts` 与公共测试工具。
- 新增前端公共测试工具：
  - `src/test/utils/render-app.tsx`
  - `src/test/utils/session.ts`
  - `src/test/utils/msw-server.ts`
- 将 `packages/fastapi-backend/tests` 重排为：
  - `tests/api/`
  - `tests/contracts/`
  - `tests/integration/<domain>/`
  - `tests/unit/<domain>/`
- 为新 pytest 子目录补齐 `__init__.py`，避免重名测试文件收集冲突。
- 修复后端一条既有失败用例：
  - `tests/integration/tasks/test_dramatiq_broker.py`
  - 原因：任务 owner 与覆盖后的 `AccessContext.user_id` 不匹配，导致 `/events` 访问返回 `403`

## 执行结果

### Frontend

- `pnpm test:student-web`
  - 结果：`32` 个测试文件，`183` 个测试，全部通过
- `pnpm test:student-web:coverage`
  - 结果：`32` 个测试文件，`183` 个测试，全部通过
  - `v8` 总覆盖率：
    - Statements：`72.97%`
    - Branches：`60.13%`
    - Functions：`76.90%`
    - Lines：`73.02%`

### Backend

- `pnpm test:fastapi-backend:api`
  - 结果：`21` 个测试，全部通过
- `pnpm test:fastapi-backend:integration`
  - 结果：`25` 个测试，全部通过
- `pnpm test:fastapi-backend:unit`
  - 结果：`163` 个测试，全部通过
- `pnpm test:fastapi-backend`
  - 结果：`209` 个测试，全部通过
- `pytest packages/fastapi-backend/tests --cov=app --cov-report=term`
  - 结果：总覆盖率 `86%`

## 新命令入口

- 根目录 `package.json`
  - `test:student-web:coverage`
  - `test:fastapi-backend:api`
  - `test:fastapi-backend:integration`
  - `test:fastapi-backend:unit`
- `packages/student-web/package.json`
  - `test:coverage`

## 当前残留风险

- `pnpm lint:student-web` 仍未通过。
- 当前 lint 失败主要来自仓库既有问题，不是本次测试结构重排本身，例如：
  - 生产代码中的 `react-hooks/set-state-in-effect`
  - 生产代码中的 `no-floating-promises`
  - 若干历史测试中的 `no-unsafe-return`、`testing-library/no-node-access`
- 因此本次收口以“测试结构统一 + 全量测试通过 + coverage 命令可跑通”为主，未扩展到 student-web 全仓 lint 治理。
