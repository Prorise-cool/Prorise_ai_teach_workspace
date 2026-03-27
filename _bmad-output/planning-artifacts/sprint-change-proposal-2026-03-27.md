# Sprint Change Proposal

**Date:** 2026-03-27  
**Project:** Prorise_ai_teach_workspace  
**Scope:** Major

## 1. Issue Summary

当前 Epic 结构把后端能力建设、接口稳定性、正式前端页面交付混在同一批次执行，导致：

- 线框图尚未落地为成品图时，前端 Story 已被当作正式交付项排期。
- 后端接口、状态枚举、错误码仍在变化时，前端页面被迫提前联调，返工风险高。
- 前后端在同一 Epic 中互相等待，整体进度被 UI 设计完成度卡住。

本次变更的核心目标是把执行节奏调整为：

1. 后端能力、接口契约、数据回写、接口测试先行。
2. 正式前端页面在成品图冻结后，以独立后置 Epic 承接。

## 2. Impact Analysis

### Epic Impact

- Epic 1-6 的完成定义被重写为“后端 / 契约 / 数据域优先”。
- 新增 Epic 8-10，专门承接正式前端页面成品化交付。
- 原先混在 Epic 1、2、3、4、5、6 中的正式页面交付，被迁移到 Epic 8、9、10。

### PRD Impact

- `Definition of Ready` 拆分为后端 Story 与正式前端 Story 两套进入条件。
- `FR-UI` 章节新增执行规则，明确线框图不再等于正式页面可开发。
- 版本计划调整为“后端先行 -> 接口测试收口 -> 前端成品化 -> 测试上线”。

### Architecture Impact

- `实施指导` 中的优先实施顺序改为后端基础能力、RuoYi 业务表、统一 API / SSE 契约优先。
- 删除“前端首页 + 视频页属于 P0 主路径”的错误暗示。

## 3. Recommended Approach

采用 **Direct Adjustment + Backlog Reorganization**：

- 不推翻既有需求范围，只重排执行顺序。
- 保留原有 FR / UX 目标，但把正式前端页面拆到后置 Epic。
- 以后端稳定契约和接口测试作为前端开工门槛，减少返工。

## 4. Detailed Change Proposals

### PRD

- 更新 `archive/prd.md`
  - 新增 MVP 实施节奏调整说明。
  - 重写 `12.1 Definition of Ready`。
  - 重写版本计划为四阶段执行。
  - 在 `FR-UI` 章节增加执行规则。

### Architecture

- 更新 `archive/architecture.md`
  - 新增“实施节奏原则”。
  - 重排“优先实施顺序”。

### Epics

- 更新 `archive/epics.md`
  - 新增执行治理规则。
  - 重写 `Epic List` 为两阶段结构。
  - 为 Epic 1-6 添加迁移说明。
  - 新增 Epic 8、Epic 9、Epic 10 的详细定义。

## 5. Implementation Handoff

### Scope Classification

- **Major**

### Recommended Next Actions

1. 以后续分片操作为基准，把 `archive` 版本作为新的事实来源重新切分。
2. 在分片后的 Epic 文档中，保持 Epic 8-10 的编号和职责不变。
3. 后端开发按 Epic 1-6 的 Phase A 定义执行，先补接口测试。
4. 待落地页 / 正式页面成品图冻结后，再启动 Epic 8-10 的前端实现。

### Success Criteria

- 后端任务不再因前端成品图未完成而阻塞。
- 前端正式页面不再在接口高频变化阶段被强行联调。
- Epic 与 Story 的完成定义能直接反映真实开发节奏。
