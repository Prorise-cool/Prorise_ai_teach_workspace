---
session_id: SPEC-xiaomai-2026-04-08
status: complete
source: _bmad-output/planning-artifacts/prd/06-6-功能需求.md
---

# Requirements Index

> 本项目需求已在 `_bmad-output/planning-artifacts/prd/` 中完整定义，此处为索引摘要。

## MoSCoW Summary

| Priority | Count | Description |
|----------|-------|-------------|
| Must (P0) | 42 | MVP 核心功能 |
| Should (P1) | 28 | 重要增强功能 |
| Could (P2) | 8 | 可选优化功能 |
| Won't | 4 | 明确排除 |

## Functional Requirements by Domain

### FR-UM 用户与认证 (4 requirements)
- FR-UM-001 用户注册/登录 [P0]
- FR-UM-002 Token 鉴权一致性 [P0]
- FR-UM-003 个人资料查看与修改 [P1]
- FR-UM-004 权限分层 [P1]

### FR-UI 前端页面与导航 (9 requirements)
- FR-UI-R01 详细页面与路由清单 [P0]
- FR-UI-001 首页主入口与顶栏导航分发 [P0]
- FR-UI-002 课堂页面 [P0]
- FR-UI-003 视频生成页 [P0]
- FR-UI-004 播放器页 [P0]
- FR-UI-005 个人中心 [P1]
- FR-UI-006 资料证据面板与来源抽屉 [P2]
- FR-UI-007 学习中心页 [P0]
- FR-UI-008 国际化与亮暗色基础能力 [P0]
- FR-UI-009 营销落地页 [P1]

### FR-VS 视频服务 (10 requirements)
- FR-VS-001 题目输入 [P0]
- FR-VS-002 题目理解 [P0]
- FR-VS-003 分镜生成 [P0]
- FR-VS-004 Manim 代码生成 [P0]
- FR-VS-005 代码自动修复 [P0]
- FR-VS-006 动画渲染 [P0]
- FR-VS-007 TTS 合成 [P0]
- FR-VS-008 视频合成与上传 [P0]
- FR-VS-009 视频任务进度反馈 [P0]
- FR-VS-010 公开视频发现与复用入口 [P1]

### FR-VP 视频播放 (4 requirements)
- FR-VP-001 视频播放 [P0]
- FR-VP-002 倍速播放 [P0]
- FR-VP-003 进度控制与全屏 [P0]
- FR-VP-004 视频结果公开发布与复用 [P1]

### FR-CS 课堂服务 (9 requirements)
- FR-CS-001 输入主题生成基础课堂 [P0]
- FR-CS-002 用户配置系统 [P1]
- FR-CS-003 幻灯片展示 [P0]
- FR-CS-004 会话结束信号与课后练习触发 [P0]
- FR-CS-005 多 Agent 讨论 [P2]
- FR-CS-006 课堂进度反馈 [P0]
- FR-CS-007 白板布局管理 [P2]
- FR-CS-008 课堂输入页联网搜索增强 [P1]
- FR-CS-009 课堂结果导出 [P1]

### FR-CP 会话伴学服务 (6 requirements)
- FR-CP-001 会话上下文锚点 [P0]
- FR-CP-002 当前上下文提问 [P0]
- FR-CP-003 解释白板联动 [P0]
- FR-CP-004 连续追问与上下文继承 [P1]
- FR-CP-005 会话问答回写 [P0]
- FR-CP-006 降级与容错 [P0]

### FR-KQ Evidence / Retrieval (7 requirements)
- FR-KQ-001 证据检索入口 [P0]
- FR-KQ-002 文档上传与解析 [P1]
- FR-KQ-003 证据问答与依据补充 [P0]
- FR-KQ-004 引用来源展示 [P1]
- FR-KQ-005 术语解释 [P1]
- FR-KQ-006 问答记录回写 [P0]
- FR-KQ-007 联网搜索与公开资料检索 [P1]

### FR-LA Learning Coach (6 requirements)
- FR-LA-001 会话后 checkpoint 生成 [P0]
- FR-LA-002 课后 quiz 生成与判分 [P0]
- FR-LA-003 学习路径规划 [P1]
- FR-LA-004 知识点推荐 [P1]
- FR-LA-005 错题本 [P1]
- FR-LA-006 学习中心聚合展示 [P0]

### FR-TF 任务框架 (3 requirements)
- FR-TF-001 统一任务模型 [P0]
- FR-TF-002 统一任务状态机 [P0]
- FR-TF-003 统一任务错误码 [P1]

### FR-SE 实时进度与 SSE (3 requirements)
- FR-SE-001 SSE 实时进度推送 [P0]
- FR-SE-002 SSE 断线恢复 [P0]
- FR-SE-003 状态查询降级 [P1]

### FR-PV Provider 与外部能力 (4 requirements)
- FR-PV-001 Provider 抽象与可替换性 [P0]
- FR-PV-002 Provider Failover [P0]
- FR-PV-003 Provider 健康状态缓存 [P1]
- FR-PV-004 可插拔外部 AI 能力编排 [P0]

### FR-LR 学习记录与个人中心 (5 requirements)
- FR-LR-001 历史记录 [P0]
- FR-LR-002 收藏管理 [P1]
- FR-LR-003 删除记录 [P2]
- FR-LR-004 学习中心聚合回看 [P0]
- FR-LR-005 ToB 数据承接边界 [P1]

## Non-Functional Requirements

详见 `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`

## Source Documents

- 完整功能需求: `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`
- 非功能需求: `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`
- 需求追踪矩阵: `_bmad-output/planning-artifacts/prd/10-10-需求追踪矩阵rtm.md`