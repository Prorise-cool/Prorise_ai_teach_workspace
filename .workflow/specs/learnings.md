# Learnings

> 项目开发过程中的经验教训，持续更新。

## 2026-04-08 初始化

### 架构决策
- 双后端架构（FastAPI + RuoYi）已验证可行
- Video/Classroom Engine 独立避免流水线耦合
- 统一 SSE 事件集简化前端状态管理

### 语义纠偏
- Story 1.5 从"老师风格选择"修正为"用户配置系统"
- 任何引用旧说法的文档或实现都应视为过时

### 前端实践
- `sonner` 只解决全局短反馈，不计入 shadcn/ui 落地证据
- feature SCSS 分层已落地：auth/home/profile/classroom/video
- 设计令牌统一在 `theme.css` 的 `@theme` 中定义

### 契约管理
- `contracts/` 是一等交付资产
- 错误码使用全大写下划线、业务域前缀
- SSE 公开事件集已冻结为八类

---

*持续更新中...*