"""共享 postMessage 监听器提示片段 — 所有 widget 必须嵌入。

Teacher Actions 协议（父页 → iframe）：
- SET_WIDGET_STATE：父页批量设变量（对应 DOM 上的 slider / data-var）
- HIGHLIGHT_ELEMENT：给 target 加脉冲描边
- ANNOTATE_ELEMENT：在 target 旁浮出 tooltip
- REVEAL_ELEMENT：显示隐藏元素

与 Phase 4 的 ``[elem:xxx]`` 协议一致：target 是 CSS selector（如 `#angle-slider`）。
"""
from __future__ import annotations

POSTMESSAGE_LISTENER_SNIPPET = """
## 必须嵌入的 postMessage 监听器（Teacher Actions 协议）

HTML 末尾务必包含以下 script，用于响应父页发来的教师动作：

```html
<script>
window.addEventListener('message', function(event) {
  const { type, target, state, content } = event.data || {};
  switch (type) {
    case 'SET_WIDGET_STATE':
      if (state) {
        Object.entries(state).forEach(([key, value]) => {
          const el = document.getElementById(key + '-slider') || document.querySelector('[data-var="' + key + '"]');
          if (el) { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }
        });
      }
      break;
    case 'HIGHLIGHT_ELEMENT': {
      const el = document.querySelector(target);
      if (el) {
        el.style.outline = '3px solid rgba(139,92,246,0.8)';
        el.style.outlineOffset = '4px';
        el.style.animation = 'pulse-highlight 2s infinite';
        setTimeout(() => { el.style.outline = ''; el.style.animation = ''; }, 3000);
      }
      break;
    }
    case 'ANNOTATE_ELEMENT': {
      const el = document.querySelector(target);
      if (el && content) {
        const rect = el.getBoundingClientRect();
        const tip = document.createElement('div');
        tip.style.cssText = 'position:fixed;top:' + (rect.top - 40) + 'px;left:' + rect.left + 'px;background:rgba(139,92,246,0.95);color:#fff;padding:8px 12px;border-radius:8px;font-size:14px;z-index:1000;';
        tip.textContent = content;
        document.body.appendChild(tip);
        setTimeout(() => tip.remove(), 4000);
      }
      break;
    }
    case 'REVEAL_ELEMENT': {
      const el = document.querySelector(target);
      if (el) { el.style.display = ''; el.style.opacity = '1'; }
      break;
    }
  }
});
const __style = document.createElement('style');
__style.textContent = '@keyframes pulse-highlight{0%,100%{outline-color:rgba(139,92,246,.8)}50%{outline-color:rgba(139,92,246,.4)}}';
document.head.appendChild(__style);
</script>
```

## 元素命名约定
- Slider：`id="{variable_name}-slider"`（如 `id="angle-slider"`）
- 按钮：`id="{action}-btn"`（如 `id="start-btn"`, `id="reset-btn"`）
- 显示：`id="{variable_name}-display"`

## 输出格式（所有 widget 共通）
- 只返回**一份完整 HTML 文档**，不带 markdown 围栏、不带解释文字
- `<!DOCTYPE html>` 只能出现一次，以单个 `</html>` 结尾
- 禁止重复内容
"""
