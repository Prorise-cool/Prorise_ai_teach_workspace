# Test Automation Summary

## 本次收口

- 重排 `packages/student-web` 测试目录，业务测试与 `features / services / stores / shared / styles` 共置。
- 收缩 `packages/student-web/src/test/`，仅保留 `setup.ts` 与公共测试工具。
- 新增前端公共测试工具：
  - `src/test/utils/render-app.tsx`
  - `src/test/utils/session.ts`
  - `src/test/utils/msw-server.ts`
- 新增前端浏览器级测试层：
  - `src/test/browser/setup.ts`
  - `src/test/browser/render-app.tsx`
  - `src/**/*.browser.test.tsx`
- 新增前端浏览器级命令入口：
  - 根目录：`pnpm test:student-web:e2e`
  - `packages/student-web`：`pnpm test:e2e` / `pnpm test:browser`
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
- `pnpm test:student-web:e2e`
  - 结果：`2` 个浏览器级测试文件，`2` 个测试，全部通过
  - 覆盖关键链路：
    - 未登录访问受保护视频页，跳转 `/login` 并保留 `returnTo`
    - 登录成功后恢复回跳到 `/video/input`
    - 已登录用户提交视频输入，跳转 `/video/:id/generating`
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
  - `test:student-web:e2e`
  - `test:student-web:coverage`
  - `test:fastapi-backend:api`
  - `test:fastapi-backend:integration`
  - `test:fastapi-backend:unit`
- `packages/student-web/package.json`
  - `test:browser`
  - `test:e2e`
  - `test:coverage`

## 当前残留风险

- 浏览器级用例当前仍是“真实浏览器 + mock runtime + 真实路由”层，不等同于联真实 RuoYi / FastAPI 的全环境联调冒烟。
- 若后续要覆盖跨域登录、真实代理、第三方 OAuth 回调、文件下载与发布链路，建议在此基础上再补一层环境级 smoke suite。
