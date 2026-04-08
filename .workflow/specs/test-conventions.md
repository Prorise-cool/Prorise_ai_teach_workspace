# Test Conventions

## Test Framework

- 前端：Vitest 4.1.2 + MSW 2.12.14 + @testing-library/react
- 后端功能：pytest 8.3+ + httpx 0.28+
- E2E：Playwright（按需引入）

## Test File Naming

```
src/features/video/
├── video-input-page.tsx
├── video-input-page.test.tsx      # 单元测试
├── video-input-page.browser.test.tsx  # 浏览器测试
└── __tests__/
    └── video-api.integration.test.ts  # 集成测试
```

## Test Structure

```typescript
describe('Feature/Component Name', () => {
  describe('happy path', () => {
    it('should do X when Y', () => {
      // Arrange
      // Act
      // Assert
    });
  });

  describe('error cases', () => {
    it('should handle Z error', () => {
      // ...
    });
  });

  describe('edge cases', () => {
    it('should handle boundary condition', () => {
      // ...
    });
  });
});
```

## MSW Handler Organization

```typescript
// mocks/handlers/video.ts
export const videoHandlers = [
  http.post('/api/v1/video/tasks', () => { ... }),
  http.get('/api/v1/video/tasks/:id', () => { ... }),
];
```

## Browser Test Requirements

涉及以下场景必须补浏览器测试：
- 登录态、注册开关、路由守卫
- `returnTo` 回跳
- `zustand persist/localStorage`
- 验证码、第三方登录

本地验证地址：`http://127.0.0.1:5173`（不混用 localhost）

## Coverage Expectations

- 公共函数、契约适配器：100% 分支覆盖
- 路由守卫：所有路径覆盖
- 业务组件：happy path + 主要错误路径