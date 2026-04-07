"""课堂上下文适配器。"""

def adapt_classroom_context(session_id: str) -> dict[str, str]:
    """将课堂会话 ID 适配为伴学上下文。"""
    return {"source": "classroom", "session_id": session_id}
