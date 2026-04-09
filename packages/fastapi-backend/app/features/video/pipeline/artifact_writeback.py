"""产物回写服务。

将视频生成过程中的结构化产物（时间线、分镜、旁白、知识点、解题步骤、Manim 代码）
打包为 ``VideoArtifactGraph`` 并持久化到资源存储。
"""

from __future__ import annotations

from dataclasses import dataclass

from app.features.video.pipeline._helpers import artifact_storage_key
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.models import (
    ArtifactPayload,
    ArtifactType,
    ManimCodeResult,
    Storyboard,
    TTSResult,
    UnderstandingResult,
    VideoArtifactGraph,
)


@dataclass(slots=True)
class ArtifactWritebackService:
    """产物回写服务，将流水线中间产物打包为 ArtifactGraph 并持久化。"""

    asset_store: LocalAssetStore

    def execute(
        self,
        *,
        task_id: str,
        understanding: UnderstandingResult,
        storyboard: Storyboard,
        tts_result: TTSResult,
        manim_code: ManimCodeResult,
    ) -> tuple[VideoArtifactGraph, str]:
        """执行产物回写，返回 ``(graph, public_url)``。"""
        timeline_scenes: list[dict[str, object]] = []
        narration_segments: list[dict[str, object]] = []
        current_time = 0
        for scene, audio_segment in zip(storyboard.scenes, tts_result.audio_segments, strict=False):
            scene_duration = max(int(audio_segment.duration), 1)
            timeline_scenes.append(
                {
                    "sceneId": scene.scene_id,
                    "startTime": current_time,
                    "endTime": current_time + scene_duration,
                    "title": scene.title,
                }
            )
            narration_segments.append(
                {
                    "sceneId": scene.scene_id,
                    "text": scene.voice_text or scene.narration,
                    "startTime": current_time,
                    "endTime": current_time + scene_duration,
                }
            )
            current_time += scene_duration

        graph = VideoArtifactGraph(
            session_id=task_id,
            artifacts=[
                ArtifactPayload(artifact_type=ArtifactType.TIMELINE, data={"scenes": timeline_scenes}),
                ArtifactPayload(
                    artifact_type=ArtifactType.STORYBOARD,
                    data=storyboard.model_dump(mode="json", by_alias=True),
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.NARRATION,
                    data={"segments": narration_segments},
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.KNOWLEDGE_POINTS,
                    data={"knowledgePoints": understanding.knowledge_points},
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.SOLUTION_STEPS,
                    data={"solutionSteps": understanding.model_dump(mode="json", by_alias=True)["solutionSteps"]},
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.MANIM_CODE,
                    data={"scriptContent": manim_code.script_content},
                ),
            ],
        )
        asset = self.asset_store.write_json(artifact_storage_key(task_id), graph.model_dump(mode="json", by_alias=True))
        return graph, asset.public_url
