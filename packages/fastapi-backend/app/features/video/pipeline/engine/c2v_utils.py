import re
from pathlib import Path

logger = __import__("logging").getLogger(__name__)


def topic_to_safe_name(knowledge_point):
    # Allowed: alphanumeric Spaces _ - { } [ ] . , + & ' =
    SAFE_PATTERN = r"[^A-Za-z0-9 _\-\{\}\[\]\+&=\u03C0]"
    safe_name = re.sub(SAFE_PATTERN, "", knowledge_point)
    # Replace consecutive spaces with a single underscore
    safe_name = re.sub(r"\s+", "_", safe_name.strip())
    return safe_name or "video"


def get_output_dir(idx, knowledge_point, base_dir, get_safe_name=False):
    safe_name = topic_to_safe_name(knowledge_point)
    # Prefix with idx-
    folder_name = f"{idx}-{safe_name}"
    if get_safe_name:
        return Path(base_dir) / folder_name, safe_name

    return Path(base_dir) / folder_name
