# References Directory

此目录存放外部参考项目与可复用样板，默认按只读参考处理，不直接在这里开发业务代码。

> 📋 详细索引请查看 [INDEX.md](./INDEX.md)。

## 当前内容

| 目录或入口 | 说明 | 使用方式 |
|-----------|------|----------|
| `OpenMAIC/` | 多智能体互动课堂参考项目 | 架构参考，注意 AGPL-3.0 合规 |
| `manim-to-video-claw/` | Manim 视频生成流水线 | 按内部许可边界复用 |
| `../docs/01开发人员手册/000-腾讯云产品文档/` | 腾讯云智能体平台文档 | 产品与 API 能力参考 |
| `../packages/RuoYi-Vue-Plus-5.X/` | RuoYi Java 后端基座 | 现有管理后台对接基座 |
| `../packages/ruoyi-plus-soybean-master/` | Soybean Vue 前端基座 | 现有管理端界面基座 |

## 使用规则

- 主开发代码统一写入 `packages/`。
- 需要借鉴或照抄时，先核对 `INDEX.md` 中的来源与许可证说明。
- 任何复用结论与落点，都要同步沉淀到 `docs/01开发人员手册/`。
