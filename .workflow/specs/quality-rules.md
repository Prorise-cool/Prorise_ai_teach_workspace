# Quality Rules

## Code Quality

- 单一职责、DRY、YAGNI
- 优先无惊喜的"无聊方案"
- 避免为未来假设提前抽象
- 三行相似代码优于过早抽象

## Testing Requirements

### Must Test
- 公共函数、契约适配器
- 路由守卫和运行态分支
- 边界与失败路径（不只是 happy path）

### Browser Verification Required
- 认证、注册开关、路由守卫
- `returnTo`、`zustand persist/localStorage`
- 验证码、第三方登录入口
- 本地验证统一使用 `http://127.0.0.1:5173`

### Route Assertions
- 需求包含"应该跳到哪里"时
- 必须断言 `pathname`/`search`
- 不能只看页面文案

## Mock Rules

- Mock 与真实模式共用同一套数据模型
- 禁止"local fallback 一套字段，真实接口另一套字段"
- Mock 资产必须覆盖成功态与失败态
- 长任务类域必须覆盖处理中、快照/恢复态、空态或降级态

## SSE Testing

任何涉及 SSE 的变更必须覆盖：
- 八类公开事件：`connected`、`progress`、`provider_switch`、`completed`、`failed`、`cancelled`、`heartbeat`、`snapshot`
- `id`/`sequence`/`Last-Event-ID` 语义
- 未知事件容错路径

## Contract Stability

- `contracts/` 采用 `x.y.z` 版本语义
- 破坏性变更必须新建 `v{major}/` 目录
- `schema`、示例、变更记录必须一起更新
- 错误码使用全大写下划线、业务域前缀