"""白板动作渲染器。"""

from app.features.companion.whiteboard.action_schema import WhiteboardAction


def render_whiteboard_action(action: WhiteboardAction) -> dict[str, object]:
    """渲染白板动作为输出字典。"""
    return {"rendered": True, "action": action.model_dump()}
