# mapper/xiaomai

用于后续 `Story 10.8` 等场景放置手写聚合查询 `Mapper XML`。

- 标准单表 CRUD：优先由 RuoYi Generator 生成。
- 聚合查询、审计串联、导出视图：在本目录下补充手写 SQL。
- 禁止在 FastAPI 侧复制这些查询作为平行后台逻辑。
