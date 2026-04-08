# Review Standards

## Pre-PR Checklist

- [ ] 本地自测完成
- [ ] 联调验证完成
- [ ] 运行态验证完成（如涉及认证/路由/持久化）
- [ ] 文档回写完成
- [ ] Story 状态更新

## Code Review Focus

### Correctness
- 业务逻辑是否符合 Story 要求
- 边界条件是否处理
- 错误路径是否覆盖

### Maintainability
- 是否复用现有模式
- 是否遵守 Monorepo 边界
- 是否符合命名规范

### Performance
- 是否有不必要的重渲染
- 是否有内存泄漏风险
- 是否有阻塞主线程的操作

### Security
- 是否有 XSS/注入风险
- 是否有敏感信息泄露
- 是否有权限校验缺失

## Review Outcome

- **Approve**: 可以合并
- **Request Changes**: 必须修改后重新审查
- **Comment**: 建议性修改，不阻塞合并

## Merge Requirements

- 至少一个 Approve
- 所有 CI 检查通过
- 无未解决的 Conversation
- Squash and merge 到 master