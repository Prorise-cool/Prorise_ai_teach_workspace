# Wave 0 A1 — 后端 feature 横向架构一致性审计

## 总览

8 个后端 feature 横向不一致：目录拆分粒度差异大（auth 4 文件 vs openmaic 40+/video 60+ 文件）；路由命名混杂 REST 资源风格与动作动词风格；依赖注入模式分化（@lru_cache 缓存 vs 动态解析 vs 工厂链）；响应模型既用 envelope 又直接返回；错误处理既有 HTTPException 又有 try/except + JSONResponse + 泛 Exception 捕获。

---

## 维度 1：目录结构

| Feature | 文件数 | 拆分粒度 |
|---|---|---|
| auth | 4 | 简洁 |
| classroom | 4 | 简洁 |
| knowledge | 4 | 简洁 |
| learning | 4 | 简洁 |
| companion | 9 | 中等（context_adapter/whiteboard 子包）|
| learning_coach | 6 | 中等（llm_generator + rate_limit）|
| openmaic | 40+ | 重（generation/orchestration/jobs/pdf/search 子包）|
| video | 60+ | 重（pipeline/service/long_term/models/tasks）|

**推荐基准**：轻量（4 文件）/ 中量（6-8 文件按关注点）/ 重量（子包 ≤2 层 ≤10 .py）

---

## 维度 2：路由命名

| Feature | prefix | 风格 | 一致性 |
|---|---|---|---|
| auth | /auth | 混合 verb+resource | 低 |
| classroom | /classroom | REST + bootstrap | 中 |
| companion | /companion | 混合 | 中 |
| knowledge | /knowledge | kebab-case 资源 | 高 |
| learning | /learning | verb 动作 | 低 |
| learning_coach | /learning-coach | 嵌套 resource/verb | 中 |
| openmaic | /openmaic | 混合 | 低 |
| video | /video | REST + metadata subtypes | 中 |

**推荐基准**：
- 资源 CRUD：kebab-case + REST（GET/POST/DELETE）
- 非 CRUD 动作：优先 HTTP verb，其次嵌套 verb
- 分页：snake_case + alias camelCase

---

## 维度 3：依赖注入

| Feature | 模式 |
|---|---|
| auth/classroom/companion/knowledge/learning/video | @lru_cache + get_xxx_service() 全局缓存 |
| learning_coach | async 动态解析（每请求 provider chain）|
| openmaic | 无装饰器，工厂链 _get_job_store → _get_service |

**推荐基准**：
```python
# 无参单例
@lru_cache
def get_xxx_service() -> XxxService: ...

# 动态解析（provider chain 等）
async def get_xxx_service(access_context: AccessContext = Depends(get_access_context)) -> XxxService: ...

# 复杂依赖（限一层链）
def _build_dep() -> Dep: ...
def get_xxx_service(dep: Dep = Depends(_build_dep)) -> XxxService: ...
```

---

## 维度 4：错误处理

| Feature | 模式 |
|---|---|
| auth | try/except + JSONResponse |
| classroom/companion/knowledge/video | HTTPException 直接抛 |
| learning | 无显式错误处理 |
| learning_coach | HTTPException + try/except |
| openmaic | try/except Exception 泛捕获 |

**推荐基准**：HTTPException + 全局 ExceptionHandler；禁止 try/except Exception 泛捕获

---

## 维度 5：响应模型

| Feature | 成功响应 | 一致性 |
|---|---|---|
| auth | 自定义 *ResponseEnvelope | 低 |
| classroom/companion/knowledge/learning | build_success_envelope | 中 |
| learning_coach | 自定义 *Envelope | 低 |
| openmaic | 自定义 BootstrapResponse/JobStatusResponse | 低 |
| video | 混合（FeatureBootstrapResponseEnvelope + 自定义）| 低 |

**推荐基准**：统一 `SuccessEnvelope[T]` 或 `build_success_envelope(data)`，列表用 `PageResponse{total, pageNum, pageSize, items}`

---

## 维度 6：日志

| Feature | 状态 |
|---|---|
| companion / learning_coach / openmaic | 已有 `logging.getLogger(__name__)` |
| auth / classroom / knowledge / learning / video routes | 缺失 |

**推荐基准**：所有 feature service 必有 logger；info 成功 / warning 降级 / exception 异常

---

## 维度 7：Docstring

- routes 普遍一行简短中文 ✅
- service 大多缺失（learning_coach/openmaic 较详细）⚠️
- openmaic 文件级是英文（不符主语言）⚠️

**推荐基准**：routes 一行中文；service 详细 Args/Returns/Raises；文件级仅复杂模块需要（中文）

---

## 维度 8：测试

| Feature | 覆盖 |
|---|---|
| video | 20+ 文件（最好）|
| auth/classroom/companion/learning | 少量 |
| openmaic | 仅 orchestration/tests/ 1 文件 |
| knowledge/learning_coach | **无测试** |

**推荐基准**：集中式 tests/api + tests/unit；每 feature 至少有 routes + service + schemas 三层覆盖

---

## 维度 9：Settings

| Feature | 模式 |
|---|---|
| auth/learning_coach/video | 显式 get_settings 在 routes/service |
| classroom/companion/knowledge/learning | 隐式（依赖注入或继承）|
| openmaic | 无配置使用 |

**推荐基准**：service 初始化注入 settings，routes 中不可见（_build_service 工厂隐藏）

---

## 维度 10：常量提取

| Feature | 程度 |
|---|---|
| learning_coach | 重度（PRELOADED_*_KEY、RATE_LIMIT_*、TTL）|
| video | 重度（pipeline/constants.py 集中）|
| openmaic | 轻度（仅 MAX_PDF_CONTENT_CHARS）|
| auth/classroom/companion/knowledge/learning | 几乎无 |

**推荐基准**：所有魔法数字/字符串提取 ALL_CAPS，多个时建 feature/constants.py

---

## 模范评选

- **最规范**：classroom（4 文件、REST 命名、@lru_cache、HTTPException、build_success_envelope）
- **最不规范**：openmaic（40+ 文件、命名混杂、工厂链、try/except Exception、无统一 envelope）
- **中庸**：learning_coach（设计好但 docstring 复杂）、video（重但子域拆分有逻辑）

---

## 不一致项分类

### 现在改（< 30 min/项，0 风险）
1. 响应模型统一 SuccessEnvelope（5 features × 30 min）
2. 添加缺失日志（5 features × 20 min）
3. 常量提取（4 features × 15 min）
4. openmaic try/except Exception 改具体异常（20 min）
5. 补 docstring（10 min）

### Wave 1 改（与功能重构同期）
1. openmaic 子包划分优化（generation/prompts 展平）
2. learning/learning_coach 端点命名 RESTful 化
3. learning_coach 依赖注入从动态改为 lru_cache + async（provider 稳定后）
4. settings 获取位置标准化（auth/learning_coach/video）

### Wave 2 改（独立技术债收口）
1. 集中式错误处理中间件（全局 ExceptionHandler）
2. 结构化日志迁移（structlog + request_id/user_id）
3. 全局 docstring 补全（service 函数 Args/Returns/Raises）
4. 统一测试 fixture（tests/conftest.py + helpers/）
5. 各 feature 建 constants.py 收口

---

## 总结表

| 维度 | 现状 | 推荐基准 | 优先级 |
|---|---|---|---|
| 目录结构 | 差异大 4-60 文件 | 轻/中/重三分法 | Wave 1 |
| 路由命名 | 混杂 | REST 资源优先 | Wave 1 |
| 依赖注入 | 分化 | @lru_cache 或 async 动态 | Wave 1 |
| 错误处理 | 分化 | HTTPException + 全局 handler | Wave 0 |
| 响应模型 | 分化 | 统一 SuccessEnvelope | Wave 0 |
| 日志 | 50% 缺失 | 全 feature 有 logger | Wave 0 |
| Docstring | 变化 | 一行 routes + 详细 service | Wave 0 |
| 测试 | 不均 | 集中式、分层、全覆盖 | Wave 2 |
| Settings | 显式/隐式混 | 工厂隐藏 | Wave 1 |
| 常量提取 | 不均 | 所有魔法数字提取 | Wave 0 |
