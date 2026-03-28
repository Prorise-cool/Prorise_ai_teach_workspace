## Appendix B: Recommended BMAD / Ticket Split
为了便于你们后续进一步落到 BMAD、Jira、Linear 或 GitHub Projects，建议把 Story 再映射到如下四类执行单元：

### 1. Contract Ticket
用于冻结：
- schema
- 枚举
- 错误码
- 示例 payload
- mock 数据样本
- 状态图

**示例：**
- `CONTRACT-2.1-task-status-and-error-codes`
- `CONTRACT-6.1-timeanchor-and-companion-turn-schema`

### 2. Frontend Ticket
用于交付：
- 页面壳层
- 组件
- adapter 接入
- 状态机
- mock 流

**示例：**
- `FE-4.7-video-generating-page-state-machine`
- `FE-7.2-evidence-drawer-panel`

### 3. Backend Ticket
用于交付：
- service
- task worker
- provider adapter
- API route
- 运行态逻辑

**示例：**
- `BE-4.3-manim-gen-and-fix-chain`
- `BE-7.3-evidence-provider-adapter`

### 4. Persistence / Integration Ticket
用于交付：
- RuoYi 表
- 防腐层
- 回写逻辑
- 聚合查询
- 后台查询接口

**示例：**
- `INT-10.3-ruoyi-acl-client`
- `DB-10.4-video-and-classroom-task-persistence`

---

