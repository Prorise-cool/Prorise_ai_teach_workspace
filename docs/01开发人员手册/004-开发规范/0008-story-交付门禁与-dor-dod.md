# Story 交付门禁与 DoR / DoD

> **状态**: 已冻结
> **负责人**: PM / Scrum Master / Tech Lead / Reviewer
> **最后更新**: 2026-03-29

---

## 适用范围

- 本规范适用于 `_bmad-output/implementation-artifacts/` 下的全部 Story。
- 所有 Story 的 `Ready`、`In Progress`、`Review`、`Done` 判定，必须以本文为准。
- 若 Story 本身写有更严格门禁，可以在不低于本文的前提下补充，不能放宽。

## 术语说明

- **DoR（Definition of Ready）**：Story 可以进入开发的最小输入条件。
- **DoD（Definition of Done）**：Story 可以被判定为完成的最小输出条件。
- **伪完成**：看起来“做了点东西”，但尚未满足 Story 的验收、测试、文档或状态闭环要求。

## 通用 DoR

任意 Story 进入开发前，至少满足以下条件：

1. Story ID、Story Type、Depends On、Blocks 已明确。
2. 验收标准（Acceptance Criteria）已冻结，且能直接判断通过或失败。
3. 依赖与边界已识别，不存在“开发中再猜职责”的情况。
4. Contract Asset Path、Mock Asset Path、API / Event / Schema Impact、Persistence Impact 已补齐。
5. Frontend States Covered、Error States Covered、Acceptance Test Notes 已补齐。
6. 需求已能拆解为可执行任务，不存在“先做一半看看”的模糊描述。

## Story Type 对应 DoR

### Contract Story

Ready 必须具备：

- 契约资产落点已确定。
- 字段、状态枚举、错误码、示例 payload、版本口径已明确。
- 上下游消费者已识别，禁止“谁来用以后再说”。
- 若需要 mock，必须同步明确 mock 样例与状态机覆盖范围。

### Infrastructure Story

Ready 必须具备：

- 影响范围、受影响模块与架构边界已明确。
- 最小验证方式已明确，例如测试命令、脚本校验或运行态证据。
- 是否允许以“文档 / 规范交付”为完成形态已在 Story 中明确。

### Backend Story

Ready 必须具备：

- 路由、请求 / 响应结构、状态码、错误码与数据归属已明确。
- 上下游依赖、测试夹具、鉴权边界与运行态边界已明确。
- 若引用前端场景，至少能说明触发路径与关键状态。

### Frontend Story

Ready 必须具备：

- 已有批准的高保真视觉稿，不能只有线框图。
- 已覆盖空态、错态、加载态、禁用态与关键交互说明。
- 对应 API 契约、错误码、状态枚举、示例 payload 与 mock 样例已稳定。
- 已明确路由、组件边界、可访问性要求与验收截图范围。
- 已能基于 `adapter + mock handler` 完成页面状态闭环。

### Persistence Story

Ready 必须具备：

- 数据宿主已明确属于 RuoYi / MySQL、Redis 运行态或 COS。
- 表结构 / 字段、索引、TTL、回写时机、回滚策略已明确。
- 禁止出现“先放 Redis，后面再落库”的模糊表述。

### Integration Story

Ready 必须具备：

- 上下游契约已经冻结。
- 环境变量、联调对象、失败降级与观测字段已明确。
- 联调前门禁与联调后验证范围已明确。

## 通用 DoD

任意 Story 判定完成前，至少满足以下条件：

1. 交付物与全部 AC 已闭环，不存在只完成 happy path 的情况。
2. 受影响范围的代码、测试、文档已同步更新。
3. 必要测试或验证命令已执行，并能给出证据。
4. Story 状态、Sprint 状态与 PR 状态保持一致，不存在“代码完成但状态未更新”。
5. 不违反 FastAPI / RuoYi / Redis / COS / Provider 的既有边界。
6. 不存在未关闭的 Blocker 级问题。

## Story Type 对应 DoD

### Contract Story

Done 必须具备：

- 契约文档、示例、schema / mock 资产已落盘。
- 字段、状态枚举、错误码与版本说明可被前后端 / 测试直接消费。
- 禁止只在 README 或聊天记录中口头描述。

### Infrastructure Story

Done 必须具备：

- 基础能力已经落地到目标目录或规范文档。
- 验证命令、边界说明、回退策略或限制条件已记录。
- 若影响后续 Story，必须提供可复用入口或清单。

### Backend Story

Done 必须具备：

- 真实 handler / service / scheduler 等实现已落地，不得只有路由空壳。
- 成功路径、失败路径、错误码、状态推进与边界行为已验证。
- 契约与实现保持一致，文档未漂移。

### Frontend Story

Done 必须具备：

- 页面或组件达到正式交付要求，不能只有结构壳或 demo 文案。
- 关键状态闭环已完成，至少 mock 可运行；若 Story 目标包含联调，则真实接口已验证。
- 验收截图或交互证据已可提供。

### Persistence Story

Done 必须具备：

- 数据模型、迁移、TTL 或回写逻辑已实际落地。
- 数据边界、清理策略、回滚说明已明确。
- 禁止“结构先占位，后续再补字段”直接判定完成。

### Integration Story

Done 必须具备：

- 联调链路、失败回退、鉴权 / 权限或运行态恢复已验证。
- 必要的日志、request_id / task_id、错误码或调试证据可用于排障。
- 不允许只验证单端成功而忽略另一端状态闭环。

## 允许的文档型完成形态

以下 Story 可以以文档 / 契约交付为完成形态，但必须有可直接复用的明确产物：

- Contract Story
- 部分 Infrastructure Story
- 纯流程 / 规范类 Story

即使是文档型 Story，也必须满足：

- 文件已进入仓库。
- 引用路径与资产落点明确。
- 后续团队可以直接照表执行，而不是继续口头解释。

## 明确的伪完成模式

以下情况一律不得判定为 Done：

1. 只有页面壳，没有关键状态与错误态。
2. 只有接口路由，没有真实处理逻辑或失败路径。
3. 只有 README，没有正式规范 / 契约资产。
4. 只有 mock JSON，没有可驱动页面状态机的 mock handler 或 adapter。
5. “等后端好了前端再做”。
6. “先把页面画出来，联调时再改结构”。
7. “这个先不定义 schema，到时候按返回改”。
8. “先做 happy path，错误态后面补”。
9. “先直接调厂商 SDK，后面再抽象 Provider”。
10. “先放 Redis，后面再落库”。

## 使用方式

- Story 评审前：先对照本文完成 Ready 检查。
- Dev Story 完成后：对照本文完成 Done 检查。
- Code Review 阶段：Reviewer 以本文和 `0009-并行开发联调门禁.md` 为主审口径。
