"""视频上下文适配器。"""

def adapt_video_context(task_id: str) -> dict[str, str]:
    """将视频任务 ID 适配为伴学上下文。"""
    return {"source": "video", "task_id": task_id}
