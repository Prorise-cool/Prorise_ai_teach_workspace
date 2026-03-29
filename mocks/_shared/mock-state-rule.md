# Mock 状态规则

## 目标

Mock 资产必须足以驱动页面状态机，而不是只覆盖 happy path。

## 基本要求

- Mock 目录按业务域和版本组织。
- 每个业务域至少覆盖成功态与失败态。
- 长任务类域还应覆盖处理中、空态或恢复态。

## 命名建议

- fixture 文件使用 `<resource>.<scenario>.json`
- scenario 目录用于组合多个 fixture 的说明

## 约束

- Mock 字段必须可追溯到对应契约版本。
- 禁止在 Mock 中引入契约未定义字段。
- 需要新增字段时，应先改契约，再改 Mock。
