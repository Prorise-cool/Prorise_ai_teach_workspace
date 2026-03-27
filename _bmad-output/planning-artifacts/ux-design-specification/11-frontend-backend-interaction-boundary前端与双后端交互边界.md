# 11. Frontend-Backend Interaction Boundary（前端与双后端交互边界）

> **架构对齐**：小麦采用双后端分层架构（FastAPI 功能服务 + RuoYi 管理后台），前端需要与两个后端交互。

## 11.1 交互总览

```
┌─────────────────────────────────────────────────────────────────┐
│                      React 19 SPA 前端                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐              ┌─────────────────┐          │
│   │  功能服务模块    │              │  用户管理模块    │          │
│   │  • 视频生成      │              │  • 登录/注册     │          │
│   │  • 课堂服务      │              │  • 个人资料      │          │
│   │  • 知识问答      │              │  • 学习记录      │          │
│   │  • 测验/路径     │              │  • 收藏管理      │          │
│   └────────┬────────┘              └────────┬────────┘          │
│            │                                │                   │
└────────────┼────────────────────────────────┼───────────────────┘
             │                                │
             ▼                                ▼
    ┌─────────────────┐              ┌─────────────────┐
    │  FastAPI 8090   │              │  RuoYi 8080     │
    │  功能服务        │◄───Redis────►│  管理后台        │
    │  • REST API     │   共享JWT    │  • REST API     │
    │  • SSE 推送     │              │  • CRUD 接口    │
    └─────────────────┘              └─────────────────┘
```

## 11.2 API 路由分配

| 路由前缀 | 后端 | 用途 |
|----------|------|------|
| `/api/v1/video/*` | FastAPI | 视频服务 |
| `/api/v1/classroom/*` | FastAPI | 课堂服务 |
| `/api/v1/knowledge/*` | FastAPI | 知识问答 |
| `/api/v1/quiz/*` | FastAPI | 测验服务 |
| `/api/v1/path/*` | FastAPI | 学习路径 |
| `/auth/*` | RuoYi | 认证相关 |
| `/system/user/*` | RuoYi | 用户管理 |
| `/learning/*` | RuoYi | 学习记录 |
| `/favorite/*` | RuoYi | 收藏管理 |

## 11.3 认证机制

**JWT 共享 Redis 方案**：

```
1. 用户登录 → RuoYi 生成 JWT Token
2. RuoYi 将 Token 存入 Redis（key: online_tokens:{tokenValue}）
3. 前端持有 Token，存储在 localStorage/cookie
4. 前端请求 FastAPI 时携带 Token
5. FastAPI 从 Redis 验证 Token 有效性
6. Token 有效 → 放行；无效 → 返回 401
```

**前端处理**：

```typescript
// HTTP 客户端配置
const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = localStorage.getItem('token');
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      (response) => {
        if (response.status === 401) {
          // Token 过期，跳转登录
          window.location.href = '/login';
        }
      },
    ],
  },
});
```

## 11.4 SSE 连接管理

**连接策略**：

| 场景 | 策略 |
|------|------|
| **首次连接** | 创建 EventSource，监听事件 |
| **断线重连** | 携带 Last-Event-ID 重连 |
| **超过重试上限** | 切换到轮询 `/status` |
| **页面切换** | 关闭连接，清理资源 |

**前端实现**：

```typescript
// SSE 客户端封装
class TaskEventSource {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(taskId: string) {
    this.eventSource = new EventSource(
      `/api/v1/video/tasks/${taskId}/events`
    );

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };

    this.eventSource.onerror = () => {
      this.reconnect();
    };
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    } else {
      // 切换到轮询
      this.startPolling();
    }
  }
}
```

---
