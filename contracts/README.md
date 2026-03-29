# Contracts Directory

`contracts/` 是本仓库唯一的契约资产目录。

## 目标

- 为 schema、状态枚举、错误码、示例 payload 提供统一落点。
- 让前端、后端、测试与 Story 文档引用同一套资产。
- 避免把契约细节散落在 Issue、聊天记录或页面注释中。

## 目录规则

```text
contracts/
├── _shared/                  # 跨域规则
├── auth/                     # 认证域
├── task/                     # 统一任务域
├── video/                    # 视频域
├── classroom/                # 课堂域
├── companion/                # Companion 域
├── evidence/                 # Evidence 域
├── learning/                 # Learning Coach 域
└── center/                   # 学习中心聚合域
```

## 版本规则

- 业务域目录下必须保留 `README.md` 作为入口索引。
- 正式冻结的契约必须进入 `v{major}/` 目录，例如 `v1/`。
- 同一主版本内的增量变化通过 `CHANGELOG.md` 记录 `x.y.z` 变更，不直接静默覆盖。
- 发生破坏性变更时，必须新建新的主版本目录，而不是直接改写旧版本文件。

## 最小资产集合

每个已冻结的版本至少应具备以下 4 类资产：

- `schemas/`：结构定义，例如 `*.schema.json`
- `examples/`：成功 / 失败 / 边界示例 payload
- `errors/`：错误码字典或等效说明
- `states/`：状态枚举或等效说明

## 命名规则

- 目录名使用小写英文语义词，例如 `auth`、`task`、`video`。
- schema 文件使用 `<domain>-<resource>.schema.json`。
- 示例文件使用 `<resource>.<scenario>.json`。
- 错误码文件使用 `<domain>-error-codes.md`。
- 状态枚举文件使用 `<domain>-status.md`。

## 变更要求

- 每次新增或修改契约时，必须同步更新版本 README 与 `CHANGELOG.md`。
- 变更说明必须包含影响范围：Story、页面、API、事件或测试夹具。
- 前端不得通过自由文本 `message` 推断业务语义，必须基于稳定字段与错误码消费。

## 共享规则

- [versioning-rule.md](./_shared/versioning-rule.md)
- [error-code-rule.md](./_shared/error-code-rule.md)
- [status-enum-rule.md](./_shared/status-enum-rule.md)
