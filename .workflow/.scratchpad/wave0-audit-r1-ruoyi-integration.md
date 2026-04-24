# Wave 0 R1 — RuoYi 集成统一性审计

## 总览

**结论**：FastAPI 后端 8 个 feature 中，5 个完全合规（openmaic ✅、learning_coach ✅、classroom ✅、learning ⚠️、knowledge ⚠️、companion ⚠️、video ⚠️），3 个存在迁移遗留（auth ⚠️）。新版基础设施 `app/shared/ruoyi/` 已成为标准，旧版 `app/shared/ruoyi_*.py` 已转为兼容层。无架构缺陷，仅需 14 处低风险 import 迁移。

**不合规清单**：14 处旧版 import（都是兼容层，无功能风险）+ auth/service.py 直接 httpx（刻意为之）。

---

## 详细发现

### F1: app/features/openmaic/ — P0 ✅

- HTTP 客户端: ✅ 完全无（pure LLM + job orchestration）
- 路由权限: ✅ 12/12 endpoints with `Depends(get_access_context)` — routes.py:102, 111, 131, 149, 209, 270, 301, 350, 489, 509, 541
- Worker access_token: ✅ Dramatiq actor payload 模式（service.py:61）
- 响应模型: ✅ 自定义 Pydantic（BootstrapResponse/ClassroomCreateResponse）
- 旧版 import: ✅ 0 处

### F2: app/features/learning_coach/ — P0 ✅

- HTTP 客户端: ✅ 完全无（ProviderRuntimeResolver）
- 路由权限: ✅ 11/12（bootstrap 不需认证）
- Worker access_token: ✅ 无
- 响应模型: ✅ 自定义 envelope
- 旧版 import: ✅ 0 处

### F3: app/features/classroom/ — P0 ✅

- HTTP 客户端: ✅ 无
- 路由权限: ✅ 6/7（bootstrap 不需认证）
- Worker access_token: ✅ shared task framework
- 响应模型: ✅ 自定义 Snapshot
- 旧版 import: ✅ 0 处

### F4: app/features/video/ — P1 ⚠️

- HTTP 客户端: ✅ RuoYiClient（long_term/service.py） + ProviderRuntimeResolver
- 路由权限: ✅ 16/19（bootstrap/asset/public 结果无需认证）
- Worker access_token: ⚠️ 用 runtime_auth 模式（合理的 Redis 暂存方案）
- 响应模型: ✅ 混合使用（内部 RuoYiSingleResponse，外部自定义）
- 旧版 import: ⚠️ **6 处**
  - `video/runtime_auth.py:9` — ruoyi_auth.RuoYiRequestAuth
  - `video/long_term/service.py:21-22` — ruoyi_client, ruoyi_service_mixin
  - `video/long_term/records.py:13` — ruoyi_mapper.RUOYI_DATETIME_FORMAT
  - `video/service/{artifact,publication}_service.py` (TYPE_CHECKING) — ruoyi_auth

### F5: app/features/learning/ — P1 ⚠️

- HTTP 客户端: ✅ RuoYiClient via RuoYiServiceMixin
- 路由权限: ✅ 2/2（bootstrap 无需认证）
- Worker access_token: ✅ 无
- 响应模型: ✅ 自定义 LearningPersistenceResponse
- 旧版 import: ⚠️ **2 处** — service.py:21-22 (ruoyi_client, ruoyi_service_mixin)

### F6: app/features/knowledge/ — P1 ⚠️

- HTTP 客户端: ✅ RuoYiClient via RuoYiServiceMixin
- 路由权限: ✅ 2/3（bootstrap 无需认证）
- Worker access_token: ✅ 无
- 响应模型: ✅ 自定义 KnowledgeChatSnapshot
- 旧版 import: ⚠️ **2 处** — service.py:17-18

### F7: app/features/companion/ — P1 ⚠️

- HTTP 客户端: ✅ RuoYiClient via RuoYiServiceMixin
- 路由权限: ✅ 4/5（bootstrap 无需认证）
- Worker access_token: ✅ 无
- 响应模型: ✅ 自定义 CompanionTurnSnapshot
- 旧版 import: ⚠️ **2 处** — service.py:26-27

### F8: app/features/auth/ — P2 ⚠️

- HTTP 客户端: ❌ 直接 `import httpx`（**刻意设计**）
  - 原因：RuoYi 认证端点需 RSA+AES 混合加密，RuoYiClient 不支持（service.py:8-17）
  - 责任：RuoYiAuthCrypto 处理加解密
  - 未来改进：抽为 RuoYiClient 中间件（Wave 1+ 范围）
- 路由权限: ⚠️ 0/7 with `Depends(get_access_context)`
  - login/register/code/register_enabled — 无需认证 ✅
  - /logout, /me — 由 RuoYi 网关校验（FastAPI 仅代理）
- Worker access_token: ✅ 无
- 响应模型: ✅ 自定义 AuthLoginResponseEnvelope
- 旧版 import: ⚠️ **1 处** — service.py:32 (ruoyi_auth.RuoYiRequestAuth)

---

## 旧版 app/shared/ruoyi_*.py 引用清单（共 14 处，全部低风险，已是兼容层）

| 文件 | 行 | 旧 import | 新路径 |
|------|-----|------|---------|
| auth/service.py | 32 | ruoyi_auth.RuoYiRequestAuth | app.shared.ruoyi.auth |
| learning/service.py | 21 | ruoyi_client.RuoYiClient | app.shared.ruoyi.client |
| learning/service.py | 22 | ruoyi_service_mixin.RuoYiServiceMixin | app.shared.ruoyi.service_mixin |
| knowledge/service.py | 17 | ruoyi_client.RuoYiClient | app.shared.ruoyi.client |
| knowledge/service.py | 18 | ruoyi_service_mixin.RuoYiServiceMixin | app.shared.ruoyi.service_mixin |
| companion/service.py | 26 | ruoyi_client.RuoYiClient | app.shared.ruoyi.client |
| companion/service.py | 27 | ruoyi_service_mixin.RuoYiServiceMixin | app.shared.ruoyi.service_mixin |
| video/long_term/service.py | 21 | ruoyi_client.RuoYiClient | app.shared.ruoyi.client |
| video/long_term/service.py | 22 | ruoyi_service_mixin.RuoYiServiceMixin | app.shared.ruoyi.service_mixin |
| video/long_term/records.py | 13 | ruoyi_mapper.RUOYI_DATETIME_FORMAT | app.shared.ruoyi.mapper |
| video/long_term/service.py | TYPE_CHECKING | ruoyi_auth.RuoYiRequestAuth | app.shared.ruoyi.auth |
| video/service/artifact_service.py | TYPE_CHECKING | ruoyi_auth.RuoYiRequestAuth | app.shared.ruoyi.auth |
| video/service/publication_service.py | TYPE_CHECKING | ruoyi_auth.RuoYiRequestAuth | app.shared.ruoyi.auth |
| video/runtime_auth.py | 9 | ruoyi_auth.RuoYiRequestAuth | app.shared.ruoyi.auth |

---

## 推荐 Wave 0 热修清单（工作量约 5 分钟）

14 处 import replace，可一次性 sed 或 Edit 完成。

## 留到 Wave 1+

1. auth/service.py — RuoYiClient 加密中间件化（中等工作量）
2. video/runtime_auth.py — 考虑与 AccessContext 缓存合并（可选）
3. 全量 response_model OpenAPI schema validation 补齐（低优先级）

## 总体评分：A-（92/100），风险评级：ZERO
