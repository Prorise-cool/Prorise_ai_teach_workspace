"""Prompt loader — loads .md templates and performs variable substitution.

Borrowed from ManimCat's src/prompts/loader.ts pattern.
"""

from __future__ import annotations

import re
from pathlib import Path

_TEMPLATE_DIR = Path(__file__).parent / "templates"


def load_template(name: str) -> str:
    """Load a .md template file from the templates/ directory."""
    path = _TEMPLATE_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")


def render_template(template: str, variables: dict[str, str | bool | None] | None = None) -> str:
    """Render a template with {{variable}} substitution and {{#if var}}...{{/if}} conditionals."""
    if variables is None:
        variables = {}

    text = template

    # Process {{#if var}}...{{/if}} conditionals
    def _replace_conditional(m: re.Match) -> str:
        var_name = m.group(1)
        content = m.group(2)
        val = variables.get(var_name)
        if val:
            return content.strip()
        return ""

    text = re.sub(
        r"\{\{#if\s+(\w+)\}\}(.*?)\{\{/if\}\}",
        _replace_conditional,
        text,
        flags=re.DOTALL,
    )

    # Process {{variable}} substitution
    def _replace_var(m: re.Match) -> str:
        var_name = m.group(1)
        val = variables.get(var_name)
        if val is None:
            return ""
        return str(val)

    text = re.sub(r"\{\{(\w+)\}\}", _replace_var, text)

    return text.strip()


def load_and_render(name: str, variables: dict[str, str | bool | None] | None = None) -> str:
    """Load a template and render it with variables."""
    return render_template(load_template(name), variables)
