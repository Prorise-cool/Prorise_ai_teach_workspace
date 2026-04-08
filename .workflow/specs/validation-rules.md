# Validation Rules

## Frontend Validation

### Form Validation
- 使用 `react-hook-form` + `zod`
- 禁止 `useState` + 手写校验作为长期方案
- 错误信息必须用户友好

### API Response Validation
- 使用 Zod schema 验证响应结构
- 未知字段应触发警告而非静默忽略

### Route Validation
- 受保护路由必须有守卫
- 守卫逻辑必须有测试覆盖

## Backend Validation

### Request Validation
- Pydantic 模型验证请求体
- 路径参数和查询参数类型检查
- 业务规则校验在 service 层

### Response Validation
- 响应模型明确定义
- 不返回未定义字段

## Contract Validation

### Version Compatibility
- 契约变更必须更新版本号
- 破坏性变更必须新建版本目录
- 保持向后兼容或明确迁移路径

### Mock Alignment
- Mock 数据必须符合契约 schema
- 新增字段先改契约再改 mock
- 禁止 mock 引入契约未定义字段

## Runtime Validation

### Authentication
- 认证真值来自 RuoYi 真实配置
- 不由前端 mock 假设
- Token 过期处理必须测试

### State Persistence
- `zustand persist` 必须测试恢复
- `localStorage` 读写必须异常处理
- 版本迁移必须有兼容策略