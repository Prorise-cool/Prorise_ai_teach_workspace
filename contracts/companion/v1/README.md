# Companion 契约 v1

## 概述

伴学（Companion）域提供视频播放页的即时问答能力，围绕当前播放时间点持续追问。

## Ask API

### POST /api/v1/companion/ask

#### Request

```json
{
  "session_id": "string",
  "anchor": {
    "context_type": "video",
    "anchor_kind": "video_timestamp",
    "anchor_ref": "{task_id}@{seconds}",
    "scope_summary": "optional",
    "scope_window": "optional"
  },
  "question_text": "这一步是怎么推导的？",
  "parent_turn_id": "optional-turn-id-for-follow-up"
}
```

#### Response

```json
{
  "turn_id": "string",
  "answer_text": "这一步使用了...",
  "anchor": { ... },
  "whiteboard_actions": [],
  "source_refs": [],
  "persistence_status": "complete_success",
  "context_source_hit": "redis"
}
```

## CompanionContextSource 枚举

| 值 | 说明 |
|---|---|
| `redis` | Redis 运行态缓存命中（最快） |
| `local_file` | 本地 artifact-graph.json 命中 |
| `cos` | COS 远端文件命中 |
| `degraded` | 三级全部失败，仅返回 task_id + 题目文本 |

## artifact-graph.json Companion 消费字段

| 路径 | 说明 |
|---|---|
| `artifacts[timeline].scenes[].sceneId` | 分段 ID |
| `artifacts[timeline].scenes[].startTime` | 分段起始秒数 |
| `artifacts[timeline].scenes[].endTime` | 分段结束秒数 |
| `artifacts[timeline].scenes[].title` | 分段标题 |
| `artifacts[narration].segments[].sceneId` | 对应分段 ID |
| `artifacts[narration].segments[].text` | 旁白文本 |
| `artifacts[narration].segments[].startTime` | 旁白起始秒数 |
| `artifacts[narration].segments[].endTime` | 旁白结束秒数 |
| `artifacts[knowledge_points].items[]` | 知识点列表 |
| `artifacts[solution_steps].steps[].title` | 解题步骤标题 |
| `artifacts[solution_steps].steps[].explanation` | 解题步骤说明 |
| `artifacts[storyboard].topic_summary` | 主题摘要 |

## PersistenceStatus 枚举

| 值 | 说明 |
|---|---|
| `complete_success` | 完全成功 |
| `whiteboard_degraded` | 白板降级，文本解释替代 |
| `reference_missing` | 引用来源缺失 |
| `partial_failure` | 部分失败 |
| `overall_failure` | 整轮失败 |
