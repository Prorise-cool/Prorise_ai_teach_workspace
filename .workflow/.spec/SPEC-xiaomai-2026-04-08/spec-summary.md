---
session_id: SPEC-xiaomai-2026-04-08
status: complete
---

# Spec Summary: 小麦 - AI 教学视频智能体

## Executive Summary

**小麦** 是一个面向中国高职教育的 AIGC 原生教学平台，通过双内容引擎（Video + Classroom）、会话伴学、证据检索与学习教练能力，帮助学生更快理解知识点，帮助教师更高效产出教学内容。

## Core Value

**一键生成教学视频与课堂** —— 用户只需输入题目或主题，系统自动完成理解、分镜、渲染、合成全链路。

## Current Status

| Metric | Value |
|--------|-------|
| Epics Total | 11 |
| Epics Done | 4 (0, 1, 2, 10) |
| Epics In Progress | 3 (3, 4, 5) |
| Epics Backlog | 4 (6, 7, 8, 9) |
| Requirements | 70+ |
| Quality Score | 91.25% |

## Architecture Highlights

- **双后端**: FastAPI (功能服务) + RuoYi (持久化)
- **双引擎**: Video Engine + Classroom Engine 独立
- **统一 SSE**: 八类公开事件，支持断线恢复
- **Provider 抽象**: 外部能力可插拔，支持 Failover

## Next Steps

1. 完成 Epic 3/4/5 的 review 状态 Story
2. 启动 Epic 5 课堂闭环开发
3. MVP 稳定后规划 Epic 6-9

## Source Documents

所有规划文档位于 `_bmad-output/` 目录，以 `INDEX.md` 为总入口。