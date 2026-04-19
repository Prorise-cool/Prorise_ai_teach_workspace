# Story 6.5: 连续追问与 Redis 上下文窗口

Status: ready-for-dev

## Story

As a 想继续追问的用户，
I want 进行连续追问并继承上一轮上下文，
So that 我不需要每次都重复描述前文。

## Acceptance Criteria

1. 用户携带 `parent_turn_id` 发起追问时，系统从 Redis 加载上一轮上下文窗口，继承当前锚点和对话历史，LLM prompt 包含上一轮问答摘要。
2. 多轮追问接近 10 轮边界时，系统保留当前锚点、最近 3 轮问答摘要与必要会话元信息，不因窗口截断导致回答脱节。
3. Redis 上下文窗口 Key 使用 `xm_companion_ctx:{session_id}`，TTL 为 24 小时。
4. 用户切换锚点（不同 anchor_ref）时，系统保留对话历史但更新锚点为新位置。

## Tasks / Subtasks

- [ ] Redis 上下文窗口设计（AC: 3）
  - [ ] 定义 Key schema：`xm_companion_ctx:{session_id}`
  - [ ] TTL：24 小时（86400 秒）
  - [ ] Value 结构：`{ "session_id", "anchor": {...}, "turns": [...], "updated_at" }`
  - [ ] 每轮写入后刷新 TTL
- [ ] 上下文窗口读写（AC: 1, 3）
  - [ ] 在 `companion/service.py` 或新建 `companion/context_window.py` 中实现
  - [ ] `save_context(session_id, anchor, turn_summary)` — 保存/更新窗口
  - [ ] `load_context(session_id) -> ContextWindow | None` — 加载窗口
  - [ ] 使用 `redis_client.py` 执行 JSON 序列化/反序列化
- [ ] 多轮追问继承逻辑（AC: 1, 2）
  - [ ] Ask API 中检测 `parent_turn_id` 是否存在
  - [ ] 存在时从 Redis 加载上下文窗口
  - [ ] 将窗口中的历史问答摘要注入 LLM prompt
  - [ ] 窗口裁剪规则：保留最近 3 轮完整摘要 + 当前锚点 + session 元信息
  - [ ] 更新窗口：追加本轮问答摘要，刷新 TTL
- [ ] 锚点切换处理（AC: 4）
  - [ ] 新提问携带不同 anchor_ref 时，更新窗口中的 anchor 为新位置
  - [ ] 保留对话历史不变（不删除已有 turns）
  - [ ] LLM prompt 使用新锚点的上下文数据
- [ ] Ask API 集成（AC: 1, 2, 4）
  - [ ] 修改 Story 6.4 的 ask 逻辑，增加上下文窗口读写
  - [ ] 有 parent_turn_id → 加载窗口 → 注入历史 → 生成回答 → 更新窗口
  - [ ] 无 parent_turn_id → 创建新窗口（首次提问）
- [ ] 单元测试（AC: 1-4）
  - [ ] 测试首次提问创建新窗口
  - [ ] 测试追问继承上下文
  - [ ] 测试窗口边界裁剪（超过 10 轮）
  - [ ] 测试锚点切换保留历史
  - [ ] 测试 TTL 刷新
  - [ ] 测试 Redis 不可用时优雅降级（不影响首次提问）

### Story Metadata

- Story ID: `6.5`
- Story Type: `Backend Story`
- Epic: `Epic 6`
- Depends On: `6.4` Ask API
- Blocks: 无
- FRs: FR-CP-004

## Dev Notes

### 上下文窗口数据结构

```python
class ContextWindow(BaseModel):
    session_id: str
    anchor: AnchorContext
    turns: list[TurnSummary]
    updated_at: datetime

class TurnSummary(BaseModel):
    turn_id: str
    question_summary: str       # 截断到 200 字
    answer_summary: str         # 截断到 300 字
    anchor_ref: str
    timestamp: datetime
```

### Redis Key 设计

- Key: `xm_companion_ctx:{session_id}`
- TTL: 86400 秒（24 小时）
- 每次 save_context 时刷新 TTL（EXPIRE 重置）
- 值为 JSON 序列化的 ContextWindow

### 窗口裁剪规则

```python
MAX_WINDOW_TURNS = 10
PRESERVED_RECENT_TURNS = 3

def trim_window(window: ContextWindow) -> ContextWindow:
    if len(window.turns) <= MAX_WINDOW_TURNS:
        return window
    # 保留最近 3 轮 + 当前锚点
    window.turns = window.turns[-PRESERVED_RECENT_TURNS:]
    return window
```

### LLM Prompt 中的历史注入

```
## 对话历史
以下是之前几轮问答的摘要，请保持上下文连贯：

1. 学生问：{question_1}
   回答摘要：{answer_1}

2. 学生问：{question_2}
   回答摘要：{answer_2}

## 当前提问
{current_question}
```

### Redis 不可用降级

- Redis 连接失败时，上下文窗口操作静默跳过
- Ask API 仍正常工作（不注入历史），降级为无上下文追问
- log warning 记录 Redis 不可用事件

### 技术约束

- Redis 仅存运行态数据（NFR-AR-003），TTL 必须 24h
- 不使用 Redis 的 STREAM 或 PUBSUB，仅用简单的 GET/SET + TTL
- 窗口数据不进入 RuoYi 长期存储（长期数据走 Story 6.7 的 persist_turn）
- 序列化使用 `model_dump(mode="json")` + `json.dumps()`

### Suggested File Targets

- `packages/fastapi-backend/app/features/companion/context_window.py` — 新建
- `packages/fastapi-backend/app/features/companion/schemas.py` — 新增 ContextWindow, TurnSummary
- `packages/fastapi-backend/app/features/companion/service.py` — 修改 ask 逻辑
- `packages/fastapi-backend/tests/unit/test_companion_context_window.py` — 单元测试

### References

- [Source: _bmad-output/planning-artifacts/epics/23-epic-6.md#Story 6.5]
- [Source: packages/fastapi-backend/app/infra/redis_client.py]
- [Source: packages/fastapi-backend/app/shared/long_term/models.py#AnchorContext]
