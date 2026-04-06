# FastAPI Backend 结构审查与收敛说明

日期：2026-04-06

关联事项：

- GitHub Issue：`#107`
- 范围：`packages/fastapi-backend`

## 背景

本轮针对 `packages/fastapi-backend` 做结构性审查与收敛，目标不是新增业务能力，而是修正已经出现的架构漂移、边界穿透和测试装配问题，避免后续 Story 在错误抽象上继续叠加。

## 审查结论

审查阶段确认的主要问题如下：

1. `classroom` 直接依赖 `video.task_metadata`，任务元数据共享能力落在错误 feature 下。
2. `knowledge` 直接依赖 `companion.long_term_records`，形成反向 feature 依赖。
3. 任务恢复真实可用的是共享 `/api/v1/tasks/*`，但模块级 `/api/v1/{module}/tasks/{id}/status|events` 没有补齐，和 Story 契约不一致。
4. 多个 route 文件依赖模块级 `service = ...` 单例，测试只能 monkeypatch 全局变量，装配边界不清晰。
5. `packages/fastapi-backend/README.md` 明显落后于真实实现，仍把后端描述成“只有 Epic 0 骨架”。

## 本次收敛动作

### 1. 共享模型归位

- 新增 `app/shared/task_metadata.py`
- 新增 `app/shared/task_metadata_service.py`
- 新增 `app/shared/long_term_records.py`
- `app/features/video/task_metadata.py` 与 `app/features/companion/long_term_records.py` 保留为兼容层 shim

结果：

- 视频 / 课堂共享的任务元数据不再挂在 `video` feature 下面。
- 伴学 / 知识检索共享的长期记录模型不再挂在 `companion` feature 下面。

### 2. Feature 依赖注入收敛

已为以下路由建立显式 provider：

- `video.get_video_service`
- `video.get_video_preprocess_service`
- `classroom.get_classroom_service`
- `companion.get_companion_service`
- `knowledge.get_knowledge_service`
- `learning.get_learning_service`

结果：

- route 层不再直接依赖可被 monkeypatch 的模块级 `service` 变量。
- 测试统一通过 `app.dependency_overrides[...]` 替换 service。
- 后续做 service 切换、mock 或集成替身时，不需要触碰模块全局状态。

### 3. 模块级任务恢复路由补齐

已为以下模块补齐包装路由：

- `/api/v1/video/tasks/{task_id}/status`
- `/api/v1/video/tasks/{task_id}/events`
- `/api/v1/classroom/tasks/{task_id}/status`
- `/api/v1/classroom/tasks/{task_id}/events`

说明：

- 实现上复用共享任务恢复逻辑，避免再复制一套运行态处理代码。
- 共享 `/api/v1/tasks/*` 保留，确保现有消费者和恢复测试不回归。

### 4. README 与测试同步

- 重写 `packages/fastapi-backend/README.md`
- 更新 route / integration 测试，移除对模块级 `service` 单例的 monkeypatch
- 新增模块级恢复路由测试，验证 `video` 与 `classroom` 包装路由可用

## 验证结果

执行命令：

```bash
packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests
```

结果：

- `139 passed`

## 当前建议

1. 后续新增跨 feature 的模型、Mapper、Repository 时，先评估是否应进入 `app/shared/`。
2. route 层如需替换 service，请统一走 provider + `dependency_overrides`，不要恢复到 monkeypatch 全局变量。
3. 若后续新增任务型 feature，应优先复用统一恢复路由能力，并同步提供模块级包装路由，保证前后端契约一致。
