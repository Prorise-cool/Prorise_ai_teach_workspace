## Closing Recommendation
如果你们接下来要把这份文档真正用于实施，我建议下一步不要直接继续“写代码”，而是先做这 4 件事：

1. **把本稿拆成 machine-readable story cards**
   - 每个 Story 单独成文件或单独成 issue

2. **先执行 4 个冻结会**
   - 认证契约冻结
   - 任务 / SSE / 错误码冻结
   - 视频 / 课堂 result schema 冻结
   - 长期数据边界与表清单冻结

3. **先做 8 个 mock 入口**
   - login
   - home
   - video input
   - video generating
   - video result
   - classroom input
   - classroom generating
   - classroom result

4. **先做 3 条最小真实链路**
   - 创建视频任务 -> mock 等待 -> 结果页
   - 创建课堂任务 -> mock 等待 -> 结果页
   - RuoYi 回写一条视频 / 课堂元数据

当这 4 步做完，你们的实施成功率会比直接开始写业务代码高很多。

---

