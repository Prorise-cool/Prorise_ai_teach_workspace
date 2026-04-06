# Sprint Change Proposal

Date: 2026-04-06
Epic: Epic 3
Mode: Batch
Decision: Hybrid Correct Course

## 1. Issue Summary

- 触发问题：Epic 3 的 Story `3.2`、`3.3`、`3.4` 并未建立在 Story `3.1` 冻结的创建契约基线上开发。
- 发现方式：对比 Git 分支依赖关系、PR diff 与 review comments 后确认，`feature/story-3-1-video-task-contract`、`feature/story-3-2-video-input-interaction`、`feature/story-3-3-image-ocr-preprocess`、`feature/story-3-4-video-task-create` 全部直接从 `master` 分出。
- 直接后果：
  - `/video/tasks` 的职责被 metadata 路由占用，真实创建接口没有回到 `3.1` 契约。
  - 前端图片提交流程没有消费 preprocess 返回的 `imageRef`。
  - preprocess / create-task / mock / adapter / contracts 之间出现字段口径漂移。
  - 多个 PR 评论在不同分支重复指出同一类问题，形成 contract drift。

## 2. Impact Analysis

### Epic Impact

- Epic 3 的 `3.1`、`3.2`、`3.3`、`3.4` 同时受影响。
- `3.5` 等待页承接依赖真实 `taskId`，因此被间接受影响。
- Epic 4 的视频流水线入口依赖 `3.4` 的 runtime 初始化和 worker 占位状态，因此也受间接影响。

### Story Impact

- Story `3.1`：契约资产需要追加 changelog，并修正成功码、错误码说明、mock 文档表述。
- Story `3.2`：前端输入页必须改为“图片先 preprocess，再 create task”的链路。
- Story `3.3`：预处理返回必须补齐 camelCase、稳定 `errorCode`、mock/adapter 覆盖。
- Story `3.4`：真实创建接口、幂等、权限、runtime state、worker 占位都需按 `3.1` 重对齐。

### Artifact Conflicts

- PRD / Epic / Architecture 本身没有根本性变更，问题主要是实现顺序违背了 Story 依赖关系。
- 需要新增本 Proposal 作为纠偏记录，并同步更新 Epic 3 当前实施状态。

### Technical Impact

- 后端：`routes.py`、runtime store、exception handlers、video create-task/preprocess 相关服务与 worker 注册。
- 前端：`video-input-page`、video create/preprocess adapters、mock handlers、form schema、waiting route。
- 契约：`contracts/video/v1/`、`contracts/tasks/task-error-codes.md`、`mocks/video/v1/`。
- 测试：FastAPI 单测/集成测试、student-web Vitest 覆盖。

## 3. Recommended Approach

- 选择路径：Hybrid
- 执行原则：
  - 以 Story `3.1` 冻结的 `POST /api/v1/video/tasks` 契约作为唯一基线。
  - 不直接合并 `3.2`、`3.3`、`3.4` 原分支实现。
  - 在 `fix/epic-3-contract-alignment` 中手动吸收可复用实现，并逐条消化 issue / PR comments。

### Rationale

- 直接 merge 原分支会继续带入字段漂移、错误 envelope 不一致、幂等和权限缺失等问题。
- 回滚到 `master` 后重写成本更高，且会丢失 `3.2`、`3.3`、`3.4` 中已完成的部分实现价值。
- Hybrid 方式能够保留已验证的 UI / OCR / task create 片段，同时重新建立以契约为中心的整合面。

### Risk Assessment

- 中等风险：涉及前后端、mock、contracts、测试多层同时调整。
- 可控前提：所有 create/preprocess 链路必须通过同一套 contracts 和 tests 收口。

## 4. Detailed Change Proposals

### Stories

- Story `3.2`
  - OLD：图片模式直接把 `URL.createObjectURL(file)` 当成 `imageRef` 提交。
  - NEW：图片模式先调 `POST /api/v1/video/preprocess` 获取真实 `imageRef` 与 `ocrText`，再创建任务。
  - Rationale：恢复 `3.3 -> 3.2 -> 3.4` 的真实依赖关系。

- Story `3.3`
  - OLD：预处理成功只返回建议文案，OCR 失败/超时缺少稳定机读语义。
  - NEW：预处理结果统一返回 camelCase 字段，并增加可选 `errorCode` 承载 `VIDEO_OCR_FAILED` / `VIDEO_OCR_EMPTY` / `VIDEO_OCR_TIMEOUT`。
  - Rationale：前端需要机器可读语义决定交互提示与后续提交策略。

- Story `3.4`
  - OLD：`/video/tasks` 仍是 metadata create；create-task schema 与 `3.1` 漂移；无显式权限校验。
  - NEW：`POST /api/v1/video/tasks` 恢复为真实创建接口，metadata create 改为 `POST /api/v1/video/tasks/metadata`，并显式校验 `video:task:add`。
  - Rationale：恢复主链路入口职责，避免 route 语义冲突。

### Contracts

- `contracts/video/v1/create-task-response.schema.json`
  - OLD：成功 `code = 200`
  - NEW：成功 `code = 202`
  - Rationale：与 `202 Accepted` 异步受理语义保持一致。

- `contracts/video/v1/`
  - NEW：新增 `preprocess-request.schema.json`、`preprocess-response.schema.json`、`CHANGELOG.md`
  - Rationale：补齐 Story `3.3` 交付面并记录纠偏历史。

### Architecture / UX

- 架构与 UX 规范不需要重写，只需明确实施顺序必须遵循 `3.1 -> 3.3 -> 3.4 -> 3.2` 的契约依赖。

## 5. Implementation Handoff

- Scope：Moderate
- 承接角色：
  - Dev：修复后端 create-task / preprocess / worker / adapters / UI / tests
  - QA / Code Review：围绕 contracts、错误 envelope、权限、幂等、图片提交流程进行重点复核
  - SM / PM：保留本 Proposal 作为 Epic 3 的纠偏依据

### Success Criteria

- 所有 Epic 3 相关 create / preprocess 路径围绕 `3.1` 契约闭环。
- `bmad-code-review` 不再报出 contract drift、权限遗漏、幂等不一致、mock 分叉问题。
- 工作区可在提交后保持干净，并能安全切回 `master`。
