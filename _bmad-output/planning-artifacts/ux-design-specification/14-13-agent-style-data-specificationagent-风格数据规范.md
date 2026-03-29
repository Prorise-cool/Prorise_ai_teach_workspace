## 13. Agent Style Data Specification（Agent 风格数据规范）

> **架构对齐**：4 种 AI 老师差异通过 AgentConfig 数据预设实现，不是页面级 CSS 主题切换。
> **交互边界**：前端 MVP 只要求在输入框附近提供简单下拉框；风格选择不是独立 UX 重点。

### 13.1 AgentConfig 数据结构

```typescript
interface AgentConfig {
  id: 'serious' | 'humorous' | 'patient' | 'efficient';
  name: string;
  persona: string;        // System Prompt
  avatar?: string;        // URL 或 emoji，可选局部展示
  color: string;          // 局部点缀色 HEX
  ttsVoice?: string;      // TTS 音色 ID
  examples?: string[];    // 示例对话
  description: string;    // 一句话描述
}
```

### 13.2 4 种 Agent 预设

| 风格 | name | avatar | color | persona 要点 |
|------|------|--------|-------|-------------|
| **严肃型** | 严谨教授 | 🎓 | `#4A6FA5` | 专业严谨、逻辑清晰、不废话 |
| **幽默型** | 风趣老师 | 😄 | `#FF9500` | 轻松有趣、举例生动、有梗 |
| **耐心型** | 温和导师 | 🌸 | `#52C41A` | 步骤详细、反复解释、有鼓励 |
| **高效型** | 干练讲师 | ⚡ | `#722ED1` | 直击要点、省时高效、无废话 |

### 13.3 CSS 变量使用规范

**正确使用（局部点缀）**：

```css
/* 仅用于头像边框、指示器、标签等局部元素 */
.agent-card[data-style="serious"] {
  --agent-color: #4A6FA5;
}

.agent-avatar {
  border-color: var(--agent-color);
}

.agent-tag {
  background-color: var(--agent-color);
}
```

**错误使用（页面级主题）**：

```css
/* ❌ 不要这样做 - 全局主题切换 */
:root[data-style="serious"] {
  --primary: #4A6FA5;  /* 错误：改变全局主色 */
}
```

***
