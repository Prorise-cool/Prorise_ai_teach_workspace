"""Code playground widget HTML 生成提示词。

照搬 OpenMAIC ``code-content/{system,user}.md``，中文化。
"""
from __future__ import annotations

from typing import Any

from ._postmessage import POSTMESSAGE_LISTENER_SNIPPET

CODE_SYSTEM_PROMPT = f"""# 代码沙箱 Widget 生成器

生成一份自包含 HTML，实现可运行代码编辑器 + 测试用例校验。

## 支持语言
- Python（通过 Pyodide CDN）
- JavaScript（浏览器原生）
- TypeScript（通过 Babel CDN 转译）

## Widget 配置 Schema

```json
{{
  "type": "code",
  "language": "python",
  "description": "...",
  "starterCode": "def solution(x):\\n    pass",
  "testCases": [
    {{ "id": "t1", "input": "5", "expected": "25", "description": "平方" }}
  ],
  "hints": ["想想乘法", "x * x 是多少？"],
  "solution": "def solution(x):\\n    return x * x"
}}
```

## Python 执行关键规则（CRITICAL）

### 1. stdout 捕获 —— 同时 import sys 和 io

```javascript
// 正确
await pyodide.runPythonAsync(`
    import sys
    import io
    sys.stdout = io.StringIO()
`);
```

```javascript
// 错误：会 NameError
pyodide.runPython('import sys; sys.stdout = io.StringIO()');
```

### 2. 使用 async 执行
- `pyodide.runPythonAsync()` 不是 `pyodide.runPython()`

### 3. 预加载依赖包
```javascript
await pyodide.loadPackage(['numpy']);
```

### 4. 等待 Pyodide 初始化完成后再启用 Run 按钮

### 5. 取输出
```javascript
const output = pyodide.runPython('sys.stdout.getvalue()');
```

## 技术要求

- CodeMirror / Monaco 通过 CDN
- 语法高亮
- Run 按钮 + 输出显示
- 测试用例 pass/fail 显示
- 渐进式提示按钮
- 移动端：编辑器在上、输出在下
- 编辑器移动端最小高度 200px

{POSTMESSAGE_LISTENER_SNIPPET}

## 输出
只返回一份完整 HTML，单一 `<!DOCTYPE html>`。
"""


def build_code_user_prompt(
    title: str,
    description: str,
    key_points: list[str],
    widget_outline: dict[str, Any],
    language: str = "zh-CN",
) -> str:
    prog_language = widget_outline.get("language", "python")
    kp = "\n".join(f"- {p}" for p in (key_points or []))
    return f"""为以下内容创建代码沙箱：{title}

## 编程语言

{prog_language}

## 挑战描述

{description}

## 关键点

{kp}

## 课程语言

{language}

---

生成一份完整可交互 HTML 代码编辑器，含：
1. 语法高亮的代码编辑器
2. Run 按钮 + 输出显示
3. 测试用例校验
4. 渐进式提示
5. 内嵌 widget 配置 JSON

如果是 Python，严格遵守 Pyodide 异步执行 + `import sys` + `import io` 规范。
"""
