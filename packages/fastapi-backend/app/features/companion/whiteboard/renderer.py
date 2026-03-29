from app.features.companion.whiteboard.action_schema import WhiteboardAction


def render_whiteboard_action(action: WhiteboardAction) -> dict[str, object]:
    return {"rendered": True, "action": action.model_dump()}
