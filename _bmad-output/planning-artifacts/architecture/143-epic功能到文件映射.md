# 14.3 Epic/功能到文件映射

| Epic / 功能 | 主要文件/目录 | 说明 |
|------------|--------------|------|
| **Epic 1: 视频生成** | `packages/fastapi-backend/app/features/video/` | 完整视频流水线 |
| - FR-VS-001 题目理解 | `pipeline/understanding.py` | LLM 题目解析 |
| - FR-VS-002 分镜生成 | `pipeline/storyboard.py` | 分镜脚本生成 |
| - FR-VS-003 Manim 生成 | `pipeline/manim_gen.py` | 代码生成 |
| - FR-VS-004 Manim 修复 | `pipeline/manim_fix.py` | 自动修复链 |
| - FR-VS-005 渲染 | `pipeline/render.py`, `sandbox/` | 沙箱执行 |
| - FR-VS-006 TTS | `providers/tts/` | 多 TTS 级联 |
| - FR-VS-007 合成 | `pipeline/compose.py` | FFmpeg 合成 |
| - FR-VS-008 上传 | `shared/cos_client.py` | COS 上传 |
| **Epic 2: 课堂服务** | `packages/fastapi-backend/app/features/classroom/` | 课堂生成 |
| - FR-CS-001 主题→课堂 | `service.py`, `agents/orchestrator.py` | 课堂生成 |
| - FR-CS-002 Agent 编排 | `agents/orchestrator.py` | LangGraph 编排 |
| - FR-CS-003 幻灯片 | `agents/` | 幻灯片生成 |
| - FR-CS-004 测验 | `agents/`, `shared/tencent_adp.py` | 测验生成 |
| - FR-CS-005 SSE | `core/sse.py`, `infra/sse_broker.py` | 实时进度 |
| **Epic 3: 前端 UI** | `packages/student-web/` | React 19 学生端 SPA |
| - FR-UI-001 首页 | `pages/Home.tsx` | 双入口页面 |
| - FR-UI-002 视频页 | `pages/VideoGenerator.tsx`, `VideoPlayer.tsx` | 视频相关 |
| - FR-UI-003 课堂页 | `pages/Classroom.tsx` | 课堂页面 |
| - FR-UI-004 播放器 | `components/video/VideoPlayer.tsx` | Video.js 封装 |
| - FR-UI-005 个人中心 | `pages/Profile.tsx`, `LearningCenter.tsx` | 用户页面 |
| **Epic 4: 用户与学习** | `packages/RuoYi-Vue-Plus-5.X/ruoyi-xiaomai/` | 业务表 |
| - FR-LR-001 学习记录 | `domain/XmLearningRecord.java` | 学习记录表 |
| - FR-LR-002 收藏 | `domain/XmLearningFavorite.java` | 收藏表 |
