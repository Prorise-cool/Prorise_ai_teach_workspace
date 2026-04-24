# Wave 0 A5 — 前后端契约一致性审计

## 总览

1. **API path 基本对齐** — 后端 snake_case + `alias="camelCase"`，前端 camelCase 调用
2. **camelCase/snake_case 约定已建立** — `app/schemas/_camel.py CamelCaseModel`：learning_coach/openmaic 已采纳；classroom/video/companion/knowledge **未采纳**
3. **Envelope 包装不一致** — 大部分 `build_success_envelope()` 或 `*Envelope`；OpenMAIC 部分 POST 返回 `{success, data}` 不是 `{code, msg, data}`
4. **分页约定分化** — 多数 `pageNum/pageSize`，**video published 用 `page`** 是异常
5. **ID 类型一致** — 全 str，无大整数精度风险
6. **datetime 格式混杂** — task 元数据用 RuoYi `"%Y-%m-%d %H:%M:%S"`；视频管道 ISO8601；维护成本高
7. **SSE event 名基本统一** — OpenMAIC 用 `ready/error` 不在前端 `TaskEventName` 中会被静默丢弃
8. **HTTP 方法规范** — 全 REST 风格，无 RPC 异常

---

## 关键失配清单

### P0 严重失配（影响功能）

| # | 问题 | 后端位置 | 偏差 |
|---|---|---|---|
| 1 | video DELETE /tasks/{task_id} | video/routes.py:314-321 | 自定义 dict 不走 build_success_envelope |
| 2 | OpenMAIC POST /generate/* /quiz-grade /parse-pdf /web-search | openmaic/routes.py:286-565 | 返回 `{success: True, data}` 非标准 `{code, msg, data}` |
| 3 | OpenMAIC /bootstrap + /classroom | openmaic/routes.py:105/122 | 无 envelope |
| 4 | companion AskRequest 未继承 CamelCaseModel | companion/schemas.py:46 | 前端 adapter 手工转 snake_case 兜底 |
| 5 | learning_coach Query 缺 alias | learning_coach/routes.py:88-92 | source_type/source_session_id 无 `alias="sourceType"` |

### P1 中等问题

| # | 问题 | 位置 |
|---|---|---|
| 1 | video published 分页用 `page` 应改 `pageNum` | video/routes.py:488 |
| 2 | classroom 与 video 路由重复 `/tasks` `/tasks/{id}/status` `/tasks/{id}/events` | 命名冲突可能 |
| 3 | OpenMAIC schemas 多数未继承 CamelCaseModel | openmaic/schemas.py |
| 4 | datetime 格式 RuoYi vs ISO8601 混用 | shared/task/metadata.py + shared/ruoyi/mapper.py |
| 5 | SSE 解析器对未知 event 静默丢弃 | services/sse/parsers.ts:70 |

### 失配清单
- 后端有前端未调用：classroom 缺 /tasks/metadata、/voices、/public/{id}（仅 video 有）
- 前端 adapter 手工转 snake_case 的兜底应在后端统一后移除（companion-adapter / learning-coach-adapter）

---

## 各 feature schema 基类采纳情况

| Feature | Schema Base | alias_generator | populate_by_name | by_alias 序列化 | 评价 |
|---|---|---|---|---|---|
| learning_coach | ✅ CamelCaseModel | ✅ | ✅ | ✅ | 完全统一 |
| openmaic | ⚠️ 部分 | ⚠️ | ✅ | ❌ 部分 JSONResponse 直返 | 部分不统一 |
| learning | ✅ CamelCaseModel | ✅ | ✅ | ✅ | 完全统一 |
| companion | ❌ BaseModel | ❌ | ❌ | adapter 手工转 | 未采纳 |
| classroom | ❌ TaskMetadata 基 | ❌ | ❌ | build_success_envelope | 未采纳 |
| video | ⚠️ 混合 | ⚠️ | ⚠️ | routes 显式 by_alias | 混合 |
| knowledge | ❌ BaseModel | ❌ | ❌ | 无需 | 未采纳 |
| auth | RuoYi 代理 | N/A | N/A | N/A | 由 RuoYi 处理 |

---

## 5 对核心契约配对结论

| 契约 | 状态 |
|---|---|
| Learning Coach Entry | ✅ 字段名/类型/可选性全对齐 |
| Video Task Create | ✅ 通过 routes 显式 `by_alias=True` 兜底 |
| Learning Coach Quiz Submit | ✅ Envelope+字段全对齐 |
| Companion Ask | ❌ 后端未继承 CamelCaseModel，前端 adapter 手工转 |
| OpenMAIC Classroom Create | ❌ 后端无 `by_alias=True`，前端期望 jobId/pollUrl 实际收 job_id/poll_url（**P0 已生效 bug 风险**） |

---

## SSE event 命名

| 后端事件 | 前端 TaskEventName 对应 |
|---|---|
| connected | ✅ |
| progress | ✅ |
| section_progress | ✅ |
| section_ready | ✅ |
| provider_switch | ✅ |
| completed | ✅ |
| failed | ✅ |
| cancelled | ✅ |
| heartbeat | ✅ |
| snapshot | ✅ |
| **ready** (OpenMAIC) | ❌ 不在前端定义会被丢弃 |
| **error** (OpenMAIC) | ❌ 不在前端定义会被丢弃 |

---

## 推荐统一基准

1. **所有 schema 必须继承 `CamelCaseModel`**（含 request/response/snapshot/page）
2. **所有业务 endpoint 必须用 `build_success_envelope()` 或自定义 `*Envelope`**
3. **Query 参数必须用 `alias="camelCase"` 标注**（snake_case Python 名 + alias）
4. **datetime 统一 ISO8601 with Z**：`YYYY-MM-DDTHH:MM:SSZ`（UTC）
5. **分页统一**：`pageNum/pageSize` Query + `{total, rows, pageNum, pageSize}` 响应
6. **SSE event 补全 `ready/error`** 到前端 `TaskEventName`，未知事件记 warning 不丢弃

---

## 不一致项分类

### P0 现在改（< 30 min/项，共 5 项 ≈ 25 min）
- video DELETE /tasks/{id} → build_success_envelope
- OpenMAIC POST endpoints 4-5 处 `{success, data}` → build_success_envelope
- OpenMAIC /bootstrap + /classroom 加 envelope
- companion AskRequest 加 CamelCaseModel
- learning_coach Query 加 alias

### P1 Wave 1 期间
- video published 分页 page → pageNum
- 全 schemas 补 CamelCaseModel 继承
- datetime 格式 RuoYi → ISO8601 全局替换
- 前端 adapter 手工 snake_case 转换移除

### P2 独立收口
- OpenMAIC SSE event 名（ready/error）补全前端定义
- SSE parser 未知 event 改记 warning
- API 规范化文档生成

---

## 总耗时估算
- P0 25 min（5 项各 5 min）
- P1 1.5-3h（6 项 15-30 min）
- P2 1.5-3h
