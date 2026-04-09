"""共享的 Manim 运行时前导片段。

为视频流水线生成的完整 Manim 脚本提供统一的轻量 TeX 模板，
避免直接依赖 ``TexTemplateLibrary.ctex`` 的重预设和额外宏包。
"""

from __future__ import annotations

MANIM_RUNTIME_TEX_TEMPLATE_NAME = "XM_TEX_TEMPLATE"
LEGACY_CTEX_TEMPLATE_REF = "TexTemplateLibrary.ctex"

MANIM_RUNTIME_PRELUDE = """
XM_TEX_TEMPLATE = TexTemplate(
    tex_compiler="xelatex",
    output_format=".xdv",
    preamble=r\"\"\"
\\usepackage[english]{babel}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{xcolor}
\\usepackage[UTF8]{ctex}
\"\"\",
)
""".strip()


def normalize_tex_template_refs(code: str) -> str:
    """将旧的 ``TexTemplateLibrary.ctex`` 引用归一到共享模板名。"""

    return code.replace(LEGACY_CTEX_TEMPLATE_REF, MANIM_RUNTIME_TEX_TEMPLATE_NAME)


def ensure_manim_runtime_prelude(script: str) -> str:
    """为完整 Manim 脚本补齐共享运行时前导片段。"""

    normalized = normalize_tex_template_refs(script)
    if MANIM_RUNTIME_TEX_TEMPLATE_NAME not in normalized:
        return normalized
    if f"{MANIM_RUNTIME_TEX_TEMPLATE_NAME} =" in normalized:
        return normalized

    lines = normalized.splitlines()
    insert_index = 0
    while insert_index < len(lines):
        stripped = lines[insert_index].strip()
        if not stripped or stripped.startswith(("from ", "import ")):
            insert_index += 1
            continue
        break

    merged_lines = [
        *lines[:insert_index],
        "",
        MANIM_RUNTIME_PRELUDE,
        "",
        *lines[insert_index:],
    ]
    return "\n".join(merged_lines).strip() + "\n"
