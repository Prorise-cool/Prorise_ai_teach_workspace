## Appendix E: Release Gate Checklist
### Gate 1: Mock Gate
进入正式页面开发前必须满足：
- [ ] 契约 schema 已冻结
- [ ] mock 数据已存在
- [ ] 至少覆盖成功 / 空态 / 失败 / 权限失败
- [ ] 状态枚举已稳定
- [ ] 页面边界已稳定

### Gate 2: Real API Gate
进入真实接口联调前必须满足：
- [ ] OpenAPI / schema 可用
- [ ] 错误码文档可查
- [ ] SSE 事件语义稳定
- [ ] 持久化字段已冻结
- [ ] 页面使用 adapter，而非直连临时接口

### Gate 3: Merge Gate
进入主分支合并前必须满足：
- [ ] 高保真视觉稿已核对
- [ ] 关键状态已覆盖
- [ ] 交互说明已核对
- [ ] 稳定接口契约未发生破坏性漂移
- [ ] 真实联调记录可追溯

### Gate 4: Release Gate
进入发布前必须满足：
- [ ] 长期数据已落 RuoYi / MySQL / COS
- [ ] Redis 中无关键长期业务数据依赖
- [ ] 401 / 403 / 失败态行为一致
- [ ] SSE 恢复与 `/status` 降级可用
- [ ] 日志具备 request_id / task_id
- [ ] 至少一个 happy path 和一个 fail path 已手工验收

---

