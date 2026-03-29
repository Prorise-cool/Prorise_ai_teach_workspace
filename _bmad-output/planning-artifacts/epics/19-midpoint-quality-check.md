## Midpoint Quality Check
为防止本稿再次滑回“表面并行、实际串行”，在进入下半部分 Epic 前，必须通过以下检查：

### Q-01: 是否还有“巨型业务 Epic”吞并底座？
- 已拆分 `Epic 2`
- 已拆分 `Epic 10`
- 视频与课堂不再隐含承担全系统底座

### Q-02: 是否每个业务域都有契约 Story？
- Epic 1: Story 1.1
- Epic 2: Story 2.1 / 2.5
- Epic 3: Story 3.1
- Epic 4: Story 4.1
- Epic 5: Story 5.1

### Q-03: 是否每个页面 Story 都能 mock 先行？
- `/login`
- `/video/input`
- `/video/:id/generating`
- `/video/:id`
- `/classroom/input`
- `/classroom/:id/generating`
- `/classroom/:id`

### Q-04: 是否关键跨域依赖已显式化？
- 视频 artifact -> Companion
- 课堂 artifact -> Companion
- completion signal -> Learning Coach
- 持久化承接 -> 学习中心回看

### Q-05: 是否 AC 可测试？
本稿中所有 AC 均已改写为：
- 页面可见什么；
- 接口返回什么；
- 状态如何变化；
- 失败如何降级；
- 何时允许 mock 与 real 一致切换。  

---

