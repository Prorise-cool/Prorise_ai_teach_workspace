# Roadmap: 小麦 - AI 教学视频智能体

## Overview

小麦是一个面向高职教育的 AIGC 原生教学平台，通过双内容引擎、会话伴学、证据检索与学习教练能力，实现"一键生成教学视频与课堂"的核心价值。

## Phases

### Phase 1: MVP 核心闭环 (Current)

**Goal**: 交付可稳定演示、可持续扩展的 MVP 版本

**Depends on**: 无

**Requirements**: FR-UM, FR-UI, FR-VS, FR-VP, FR-CS, FR-TF, FR-SE, FR-PV, FR-LR

**Success Criteria**:
- [x] 用户可登录并进入双入口
- [x] 统一任务框架与 SSE 基础设施就绪
- [x] RuoYi 持久化承接完成
- [ ] 视频生成主链路稳定打通
- [ ] 基础课堂链路稳定打通
- [ ] 长任务过程可见、状态可恢复

**Epics**:
- [x] Epic 0: 工程底座与并行开发轨道
- [x] Epic 1: 用户接入、统一入口与启动配置
- [x] Epic 2: 统一任务框架、SSE 与 Provider
- [ ] Epic 3: 单题视频输入与任务创建 (in-progress)
- [ ] Epic 4: 单题视频生成、结果消费 (in-progress)
- [ ] Epic 5: 主题课堂学习闭环 (in-progress)
- [x] Epic 10: RuoYi 持久化承接

### Phase 2: 会话伴学与证据溯源 (Planned)

**Goal**: 增强学习体验，提供即时追问与证据依据能力

**Depends on**: Phase 1 完成

**Requirements**: FR-CP, FR-KQ

**Success Criteria**:
- [ ] 用户可在视频/课堂中发起追问
- [ ] 解释白板联动可用
- [ ] 证据检索与来源展示可用

**Epics**:
- [ ] Epic 6: 会话内伴学与当前时刻解释
- [ ] Epic 7: 资料依据、来源回看与证据深挖

### Phase 3: 学后巩固与学习中心 (Planned)

**Goal**: 完善学习闭环，提供测验、推荐与路径规划能力

**Depends on**: Phase 2 完成

**Requirements**: FR-LA, FR-LR (扩展)

**Success Criteria**:
- [ ] 课后 checkpoint/quiz 可用
- [ ] 错题本与推荐可用
- [ ] 学习路径规划可用
- [ ] 学习中心聚合完整

**Epics**:
- [ ] Epic 8: 学后巩固、测验与学习路径
- [ ] Epic 9: 学习中心聚合、个人管理

## Scope Decisions

### In Scope (MVP)
- 用户认证与权限
- 视频生成主链路
- 课堂生成主链路
- 任务框架与 SSE
- Provider 抽象与 Failover
- 历史记录与收藏

### Deferred (Post-MVP)
- 会话伴学 (Epic 6)
- 证据溯源 (Epic 7)
- 学后巩固 (Epic 8)
- 学习中心完整聚合 (Epic 9)

### Out of Scope
- 移动端原生应用
- 离线模式
- 多租户 SaaS
- 社交功能（点赞、评论、关注）

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. MVP 核心闭环 | In Progress | 57% (4/7 Epics) |
| 2. 会话伴学与证据 | Not Started | - |
| 3. 学后巩固与学习中心 | Not Started | - |

---

*Last updated: 2026-04-08*