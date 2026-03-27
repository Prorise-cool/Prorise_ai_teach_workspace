# 12. Unified Waiting Experience（统一等待体验设计）

> **架构对齐**：视频任务和课堂任务遵循统一任务模型，等待体验采用统一的 UX 模式。

## 12.1 设计原则

1. **一致性**：视频生成和课堂生成使用相同的进度组件
2. **透明性**：真实反馈进度，不模糊处理
3. **可控性**：用户可以取消任务
4. **可恢复性**：断线重连后恢复进度状态

## 12.2 统一进度组件

**组件 Props**：

```typescript
interface TaskProgressProps {
  taskId: string;
  taskType: 'video' | 'classroom';
  stages: Stage[];
  currentStage: number;
  progress: number;
  estimatedTimeRemaining: number;
  onCancel: () => void;
}

interface Stage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
}
```

**视觉规范**：

| 状态 | 颜色 | 图标 |
|------|------|------|
| **pending** | `--text-secondary` | ⏳ |
| **running** | `--primary` | 🔄 |
| **completed** | `--success` | ✅ |
| **failed** | `--error` | ❌ |

## 12.3 错误处理统一

| 错误类型 | 通用处理 | 特殊处理 |
|----------|----------|----------|
| **网络错误** | 显示重试按钮 | - |
| **超时** | 显示超时提示 | 建议检查网络 |
| **服务不可用** | 显示降级提示 | 自动切换 Provider |
| **渲染失败** | 显示失败原因 | 自动修复提示 |

---
