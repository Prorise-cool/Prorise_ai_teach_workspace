# Mocks Directory

`mocks/` 是与 `contracts/` 对齐的 Mock 资产目录。

## 目标

- 为前端状态机、本地联调和契约示例提供可追踪的 Mock 数据。
- 保证 Mock 结构与契约同源，而不是“随手写的假 JSON”。

## 目录规则

- 业务域目录名必须与 `contracts/` 保持一致。
- 已冻结版本的 Mock 资产进入 `v{major}/` 目录。
- Mock 变更必须同步说明来源契约版本。

## 最小要求

每个已冻结域至少应包含：

- 目录入口 README
- 覆盖主要状态的 fixture 或 scenario
- 指向来源契约版本的说明

## 共享规则

- [mock-state-rule.md](./_shared/mock-state-rule.md)
