# TASK-003: 新增 LLM provider chain 诊断端点 /learning-coach/_diagnostics

## Changes
- `packages/fastapi-backend/app/features/learning_coach/routes.py`: 新增 `GET /_diagnostics` 路由、白名单解析辅助 `_parse_diagnostics_allowlist`、访问守卫 `_ensure_diagnostics_access`；补充 `time / HTTPException / get_settings` 等 import。
- `packages/fastapi-backend/app/core/config.py`: 新增 `diagnostics_allowlist` Settings 字段（alias `FASTAPI_DIAGNOSTICS_ALLOWLIST`，默认空串）。
- `packages/fastapi-backend/.env.example`: 追加 `FASTAPI_DIAGNOSTICS_ALLOWLIST=` 注释与占位。
- `packages/fastapi-backend/tests/unit/learning_coach/test_routes_diagnostics.py`: 新增 6 个单测覆盖空链、非空链、probe 成功 / 失败、非 admin 403、白名单放行。

## Auth Approach
`app/core/security.py` 未提供 admin/role 辅助（仅 `has_permission` 通用通配），因此采用任务文档允许的备选方案：
1. 若 `access_context.permissions` 含 `*` 或 `*:*:*`（RuoYi 超级管理员），放行。
2. 否则读取 `settings.diagnostics_allowlist`（逗号分隔 user_id 集合），user_id 命中即放行。
3. 其他一律 `HTTPException 403`。默认白名单为空 → 默认拒绝，符合最小权限。

## Verification
- [x] routes.py 包含 `@router.get("/_diagnostics"`：grep 命中。
- [x] routes.py 包含 `chainLength` / `probe`：两个 key 已体现在返回字典。
- [x] `cd packages/fastapi-backend && uv run pytest tests/unit/learning_coach -x` → 19 passed（含 6 新）in 0.67s。

## Tests
- [x] `test_diagnostics_empty_chain_returns_zero`
- [x] `test_diagnostics_non_empty_chain_reports_structure`
- [x] `test_diagnostics_probe_true_success_path`
- [x] `test_diagnostics_probe_true_failure_path`
- [x] `test_diagnostics_non_admin_user_gets_403`
- [x] `test_diagnostics_allowlist_user_allowed`

## Deviations
- 未使用 RuoYi 权限串（如 `learning:coach:diagnostics`）做守卫——项目目前没有声明该权限，引入会要求后台同步配置；白名单方案更轻量、可独立启用。超级管理员仍可直通，保证既有运维账号不被误伤。
- 使用 `LearningCoachService.__new__` + 手动注入 `_provider_chain`，避开构造器对真实 runtime_store 的依赖，不影响业务行为。

## Notes
- 运行中 curl 验证需启动 FastAPI（convergence 第五条属手动验证），在单测层已通过 TestClient + ASGI 覆盖等价路径。
- 运维启用此端点时需在 `.env` 中显式配置 `FASTAPI_DIAGNOSTICS_ALLOWLIST=<user_id,...>` 或使用超级管理员账号。
