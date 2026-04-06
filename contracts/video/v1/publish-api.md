# Publish API

Story 4.10 冻结的视频公开发布 API。

## POST `/api/v1/video/tasks/{taskId}/publish`

### Behavior

- 仅任务创建者可执行。
- 仅 `completed` 且存在结果详情的任务可公开。
- 成功后返回最小公开卡片元数据。

### Response

```json
{
  "code": 200,
  "msg": "公开发布成功",
  "data": {
    "taskId": "video_pipeline_api_001",
    "published": true,
    "publishedAt": "2026-04-06T12:10:00Z",
    "card": {
      "resultId": "video_result_video_pipeline_api_001",
      "title": "证明勾股定理",
      "summary": "证明勾股定理，并解释为什么这个方法成立。",
      "knowledgePoints": ["math 核心概念", "题干信息提取"],
      "coverUrl": "https://cos.example.local/video/video_pipeline_api_001/cover.jpg",
      "duration": 120,
      "publishedAt": "2026-04-06T12:10:00Z",
      "authorName": "student_demo"
    }
  }
}
```

## DELETE `/api/v1/video/tasks/{taskId}/publish`

- 仅任务创建者可执行。
- 未公开任务允许幂等取消。

## GET `/api/v1/video/published?page=1&pageSize=12`

- 默认按 `publishedAt DESC` 排序。
- 仅返回最小卡片元数据，不包含结果详情与内部 artifact。

### Card Fields

| field | type | description |
|------|------|-------------|
| `resultId` | `string` | 稳定结果标识 |
| `title` | `string` | 卡片标题 |
| `summary` | `string` | 结果摘要 |
| `knowledgePoints` | `string[]` | 知识点列表 |
| `coverUrl` | `string` | 封面地址 |
| `duration` | `integer` | 视频时长（秒） |
| `publishedAt` | `string(date-time)` | 发布时间 |
| `authorName` | `string \| null` | 发布人展示名 |
