# prompts/__init__.py
# Legacy Code2Video stage functions (stage1-5) have been removed.
# The ManimCat pipeline uses prompts/manimcat/templates/*.md via prompt_loader.

from .base_class import base_class

__all__ = [
    "base_class",
]
