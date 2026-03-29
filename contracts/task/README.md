# Task Contracts

统一任务域是 `Story 0.2` 的模板业务域，用于验证契约目录规则可扩展。

## 当前状态

- 当前只提供模板级结构，不代表 `Story 2.1` 已完成。
- 正式任务状态、错误码、结果 schema 仍以 `Story 2.1` 为冻结入口。

## 目录结构

```text
contracts/task/
└── v1/
    ├── README.md
    ├── CHANGELOG.md
    ├── schemas/
    ├── examples/
    ├── errors/
    └── states/
```

## 使用规则

- 新增任务契约时，优先扩展 `v1/` 内资产。
- 一旦出现破坏性变化，必须创建新的主版本目录。
