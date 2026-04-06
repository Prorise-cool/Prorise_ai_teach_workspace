# Video Artifact Graph

Story 4.9 冻结的视频侧 `SessionArtifactGraph` 结构。

## Root

```json
{
  "sessionId": "video_pipeline_api_001",
  "sessionType": "video",
  "artifacts": [],
  "createdAt": "2026-04-06T12:00:00Z",
  "version": "1.0"
}
```

## Artifact Types

| artifactType | data shape | 说明 |
|-------------|------------|------|
| `timeline` | `{ "scenes": [{ "sceneId", "startTime", "endTime", "title" }] }` | 结果页与 Companion 共用的视频时间轴 |
| `storyboard` | `Storyboard` | 完整分镜结构 |
| `narration` | `{ "segments": [{ "sceneId", "text", "startTime", "endTime" }] }` | 旁白文本与时间范围 |
| `knowledge_points` | `{ "knowledgePoints": string[] }` | 核心知识点 |
| `solution_steps` | `{ "solutionSteps": SolutionStep[] }` | 解题步骤 |
| `manim_code` | `{ "scriptContent": string }` | 最终用于渲染的 Manim 脚本 |

## Consumer Notes

- `sessionId` 与 `taskId` 一一映射。
- `sessionType` 固定为 `video`。
- `artifacts` 中允许某些类型因运行态过期或回写降级而缺失，但 `timeline`、`storyboard`、`narration`、`knowledge_points`、`solution_steps` 应优先保证。
- `version` 初始固定为 `1.0`，后续 schema 演进需显式升级版本。
