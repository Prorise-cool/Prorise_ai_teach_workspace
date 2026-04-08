# Coding Conventions

## Language Rules

- 代码标识符保持英文
- 注释、说明性文档字符串优先使用中文
- 命令、路径、日志与错误文本保持英文

## Import Organization

```typescript
// 1. 框架/第三方依赖
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. 项目内模块（别名路径）
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';

// 3. 相对路径模块
import { LocalComponent } from './local-component';

// 4. 样式或资源
import styles from './styles.module.scss';
```

## File Headers

非 mock/test 源码文件必须包含规范化文件头注释：

```typescript
/**
 * @file 文件职责简述
 * @description 详细说明（可选）
 * @module 模块名（可选）
 */
```

## JSDoc Requirements

函数、组件、hooks、工具函数必须带 JSDoc：

```typescript
/**
 * 函数用途说明
 * @param paramName - 参数说明
 * @returns 返回值说明
 * @throws 可能抛出的异常（可选）
 */
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `VideoPlayer` |
| Hooks | camelCase with use prefix | `useVideoState` |
| Utilities | camelCase | `formatDuration` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `VideoTask` |
| CSS Classes (BEM) | block__element--modifier | `video-card__title--active` |

## Monorepo Boundaries

- 学生侧业务代码：`packages/student-web/`
- 功能服务：`packages/fastapi-backend/`
- 管理域整合：`packages/RuoYi-Vue-Plus-5.X/` + `packages/ruoyi-plus-soybean/`
- `references/` 只读参考，禁止写入业务代码