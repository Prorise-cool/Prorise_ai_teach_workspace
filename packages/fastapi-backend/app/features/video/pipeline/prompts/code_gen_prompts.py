"""Manim 代码生成 Prompt。

逐场景代码生成的系统提示与用户提示，对齐参考项目的技术要求：
MathTex、add_elements、font_size 范围、VGroup 布局控制。
"""

from __future__ import annotations

CODE_GEN_SYSTEM_PROMPT_TEMPLATE = """你是 Manim 代码撰写专家，使用的 Manim 版本为最新社区版。你的任务是将视频场景描述转化成 Manim 代码。

---
## 技术要求
1. **数学公式**：
   - 仅使用 MathTex 类，不要使用 Tex 类
   - MathTex 内的内容必须使用 LaTeX 语法

2. **视觉设置**：
   - 视频画面背景色为 {background_color}
   - 确保元素颜色设置与背景有足够对比度，保证可读性

3. **代码连续性**：
   - 在这个场景之前已有这些代码（仅供参考，不要重复输出）

## 输出要求
1. **元素大小**：
   - 长文本（超过15字）应分多行显示，避免超出屏幕边界
   - Text 对象必须设置 font_size，最大不超过 36，最小不低于 28
   - 不要定义类，只输出场景代码片段

2. **固定添加方式（最重要）**：
   - 新元素进入画面时优先使用 self.add_elements()
   - 可以配合简单、稳定的 self.play() / AnimationGroup / LaggedStart / Indicate / ReplacementTransform 做过程演示
   - 不要把整个场景一次性塞成一个大 VGroup 后只淡入一次
   - 至少拆成 2-4 个连续步骤，让画面在整个场景时长内持续有变化
   - 优先把同一节奏出现的元素作为一个小组，再分步调用 self.add_elements()
   - 元素组 VGroup/Group 内元素要做好布局控制，避免重叠
   - 坐标系上面的内容与坐标系必须放到一个 VGroup/Group
"""

SCENE_CODE_PROMPT_TEMPLATE = """## 前文代码上下文
<current_code>
{current_code}
    # 只需输出这个场景需要的代码（不需要缩进），上面部分已有代码无需重复输出
</current_code>

---
场景标题：{scene_title}
目标场景时长：约 {scene_duration_hint} 秒
对应旁白：{scene_voice_text}
需要制作的视频场景描述如下：<scene_desc>{scene_desc}</scene_desc>
请让动画尽量贴近该场景时长，不要只在前 1-2 秒动起来，后面长时间静止。
模板会处理场景切换，不要在片段末尾调用 self.clear()。
不要按照视频场景描述中的布局要求，而是按照固定添加方式来！

---
# output
## 新场景的代码部分
```python
{{这里写接下来的新场景的代码部分（不需要缩进）}}
```"""


def build_code_gen_system_prompt(background_color: str, aspect_ratio: str = "16:9") -> str:
    """构建代码生成的系统提示。

    Args:
        background_color: 视频背景色。
        aspect_ratio: 宽高比（目前仅用于文档）。

    Returns:
        系统提示字符串。
    """
    return CODE_GEN_SYSTEM_PROMPT_TEMPLATE.format(background_color=background_color)


def build_scene_code_prompt(
    *,
    scene_title: str,
    scene_voice_text: str,
    scene_image_desc: str,
    scene_duration_hint: int,
    current_code: str,
) -> str:
    """构建单场景代码生成的用户提示。

    Args:
        scene_title: 场景标题。
        scene_voice_text: 场景旁白文案。
        scene_image_desc: 场景视觉描述（来自分镜 imageDesc）。
        scene_duration_hint: 目标场景时长（秒）。
        current_code: 前文已生成的代码（上下文传递）。

    Returns:
        用户提示字符串。
    """
    return SCENE_CODE_PROMPT_TEMPLATE.format(
        scene_title=scene_title,
        scene_voice_text=scene_voice_text,
        current_code=current_code,
        scene_desc=scene_image_desc,
        scene_duration_hint=scene_duration_hint,
    )
