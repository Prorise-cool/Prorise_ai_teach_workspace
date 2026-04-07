package org.dromara.xiaomai.integration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.xiaomai.companion.mapper.XmCompanionTurnMapper;
import org.dromara.xiaomai.companion.mapper.XmWhiteboardActionLogMapper;
import org.dromara.xiaomai.integration.domain.bo.XmPersistenceSyncBo;
import org.dromara.xiaomai.integration.domain.vo.XmPersistenceSyncVo;
import org.dromara.xiaomai.integration.mapper.SessionArtifactMapper;
import org.dromara.xiaomai.integration.mapper.VideoPublicationMapper;
import org.dromara.xiaomai.knowledge.mapper.XmKnowledgeChatLogMapper;
import org.dromara.xiaomai.learning.mapper.LearningResultMapper;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Epic 10 internal sync 服务测试。
 *
 * @author Codex
 */
@Tag("dev")
@Tag("local")
public class XmPersistenceSyncServiceTest {

    @Test
    void shouldUpdateExistingQuizRecordInsteadOfCreatingDuplicate() {
        LearningResultMapper learningResultMapper = mock(LearningResultMapper.class);
        XmPersistenceSyncService service = new XmPersistenceSyncService(
            new ObjectMapper(),
            mock(XmCompanionTurnMapper.class),
            mock(XmWhiteboardActionLogMapper.class),
            mock(XmKnowledgeChatLogMapper.class),
            learningResultMapper,
            mock(VideoPublicationMapper.class),
            mock(SessionArtifactMapper.class)
        );

        XmPersistenceSyncBo.LearningResultSyncItemBo existingAggregate = new XmPersistenceSyncBo.LearningResultSyncItemBo();
        existingAggregate.setRecordId(1001L);
        existingAggregate.setSourceResultId("quiz-source-001");
        when(learningResultMapper.selectAggregateRecord("student-001", "xm_quiz_result", "quiz-source-001"))
            .thenReturn(existingAggregate);

        XmPersistenceSyncBo.LearningResultSyncItemBo existingQuiz = new XmPersistenceSyncBo.LearningResultSyncItemBo();
        existingQuiz.setGeneratedId(2001L);
        when(learningResultMapper.selectQuizRecordByRecordId(1001L)).thenReturn(existingQuiz);

        XmPersistenceSyncBo.LearningResultSyncItemBo input = new XmPersistenceSyncBo.LearningResultSyncItemBo();
        input.setResultType("quiz");
        input.setSourceType("video");
        input.setSourceSessionId("session-001");
        input.setSourceTaskId("task-001");
        input.setSourceResultId("quiz-source-001");
        input.setOccurredAt(new Date(1_000L));
        input.setUpdatedAt(new Date(2_000L));
        input.setStatus("completed");
        input.setScore(88);
        input.setQuestionTotal(10);
        input.setCorrectTotal(8);
        input.setAnalysisSummary("quiz 摘要");

        XmPersistenceSyncBo.LearningResultBatchSyncBo batch = new XmPersistenceSyncBo.LearningResultBatchSyncBo();
        batch.setUserId("student-001");
        batch.setRecords(List.of(input));

        XmPersistenceSyncVo.LearningResultBatchSyncVo response = service.syncLearningResults(batch);

        ArgumentCaptor<XmPersistenceSyncBo.LearningResultSyncItemBo> aggregateCaptor =
            ArgumentCaptor.forClass(XmPersistenceSyncBo.LearningResultSyncItemBo.class);
        ArgumentCaptor<XmPersistenceSyncBo.LearningResultSyncItemBo> quizCaptor =
            ArgumentCaptor.forClass(XmPersistenceSyncBo.LearningResultSyncItemBo.class);

        verify(learningResultMapper).updateAggregateRecord(aggregateCaptor.capture());
        verify(learningResultMapper).updateQuizRecord(quizCaptor.capture());
        verify(learningResultMapper, never()).insertAggregateRecord(any());
        verify(learningResultMapper, never()).insertQuizRecord(any());

        assertEquals(1001L, aggregateCaptor.getValue().getRecordId());
        assertEquals(2001L, quizCaptor.getValue().getGeneratedId());
        assertEquals(10, quizCaptor.getValue().getQuestionTotal());
        assertEquals(8, quizCaptor.getValue().getCorrectTotal());
        assertEquals("xm_quiz_result", response.getRecords().get(0).getTableName());
        assertEquals("quiz-source-001", response.getRecords().get(0).getSourceResultId());
    }

    @Test
    void shouldKeepLatestPathTraceabilityWhenOlderRetryArrives() {
        LearningResultMapper learningResultMapper = mock(LearningResultMapper.class);
        XmPersistenceSyncService service = new XmPersistenceSyncService(
            new ObjectMapper(),
            mock(XmCompanionTurnMapper.class),
            mock(XmWhiteboardActionLogMapper.class),
            mock(XmKnowledgeChatLogMapper.class),
            learningResultMapper,
            mock(VideoPublicationMapper.class),
            mock(SessionArtifactMapper.class)
        );

        XmPersistenceSyncBo.LearningResultSyncItemBo existingAggregate = new XmPersistenceSyncBo.LearningResultSyncItemBo();
        existingAggregate.setRecordId(3001L);
        existingAggregate.setSourceResultId("path-source-001");
        existingAggregate.setVersionNo(5);
        existingAggregate.setOccurredAt(new Date(5_000L));
        existingAggregate.setUpdatedAt(new Date(6_000L));
        when(learningResultMapper.selectAggregateRecord("student-002", "xm_learning_path", "path-source-001"))
            .thenReturn(existingAggregate);

        XmPersistenceSyncBo.LearningResultSyncItemBo existingPath = new XmPersistenceSyncBo.LearningResultSyncItemBo();
        existingPath.setGeneratedId(4001L);
        when(learningResultMapper.selectPathRecordByRecordId(3001L)).thenReturn(existingPath);

        XmPersistenceSyncBo.LearningResultSyncItemBo input = new XmPersistenceSyncBo.LearningResultSyncItemBo();
        input.setResultType("path");
        input.setSourceType("learning");
        input.setSourceSessionId("session-002");
        input.setSourceTaskId("task-002");
        input.setSourceResultId("path-source-001");
        input.setOccurredAt(new Date(1_000L));
        input.setUpdatedAt(new Date(2_000L));
        input.setStatus("completed");
        input.setVersionNo(3);
        input.setPathTitle("提分路径");
        input.setStepCount(4);
        input.setAnalysisSummary("路径摘要");

        XmPersistenceSyncBo.LearningResultBatchSyncBo batch = new XmPersistenceSyncBo.LearningResultBatchSyncBo();
        batch.setUserId("student-002");
        batch.setRecords(List.of(input));

        XmPersistenceSyncVo.LearningResultBatchSyncVo response = service.syncLearningResults(batch);

        ArgumentCaptor<XmPersistenceSyncBo.LearningResultSyncItemBo> aggregateCaptor =
            ArgumentCaptor.forClass(XmPersistenceSyncBo.LearningResultSyncItemBo.class);
        ArgumentCaptor<XmPersistenceSyncBo.LearningResultSyncItemBo> pathCaptor =
            ArgumentCaptor.forClass(XmPersistenceSyncBo.LearningResultSyncItemBo.class);

        verify(learningResultMapper).updateAggregateRecord(aggregateCaptor.capture());
        verify(learningResultMapper).updatePathRecord(pathCaptor.capture());
        verify(learningResultMapper, never()).insertAggregateRecord(any());
        verify(learningResultMapper, never()).insertPathRecord(any());

        XmPersistenceSyncBo.LearningResultSyncItemBo aggregateRecord = aggregateCaptor.getValue();
        XmPersistenceSyncBo.LearningResultSyncItemBo pathRecord = pathCaptor.getValue();
        assertEquals(3001L, aggregateRecord.getRecordId());
        assertEquals(4001L, pathRecord.getGeneratedId());
        assertEquals(5, aggregateRecord.getVersionNo());
        assertEquals(5, pathRecord.getVersionNo());
        assertEquals(new Date(6_000L), aggregateRecord.getUpdatedAt());
        assertEquals(new Date(6_000L), pathRecord.getUpdatedAt());
        assertNotNull(response.getRecords().get(0));
        assertEquals("xm_learning_path", response.getRecords().get(0).getTableName());
    }

    @Test
    void shouldUpsertVideoPublicationIntoXmUserWork() {
        VideoPublicationMapper videoPublicationMapper = mock(VideoPublicationMapper.class);
        XmPersistenceSyncService service = new XmPersistenceSyncService(
            new ObjectMapper(),
            mock(XmCompanionTurnMapper.class),
            mock(XmWhiteboardActionLogMapper.class),
            mock(XmKnowledgeChatLogMapper.class),
            mock(LearningResultMapper.class),
            videoPublicationMapper,
            mock(SessionArtifactMapper.class)
        );

        XmPersistenceSyncVo.VideoPublicationSyncVo persisted = new XmPersistenceSyncVo.VideoPublicationSyncVo();
        persisted.setWorkId(9001L);
        persisted.setWorkType("video");
        persisted.setTaskRefId("video-task-001");
        persisted.setUserId("10001");
        persisted.setTitle("勾股定理讲解");
        persisted.setDescription("面积法证明");
        persisted.setCoverUrl("https://cdn.test/video-task-001/cover.jpg");
        persisted.setIsPublic(true);
        persisted.setStatus("normal");
        persisted.setVersion(0);
        persisted.setPublishedAt(new Date(10_000L));
        persisted.setCreatedAt(new Date(10_000L));
        persisted.setUpdatedAt(new Date(10_000L));
        when(videoPublicationMapper.selectByTaskRefId("video", "video-task-001")).thenReturn(null, persisted);
        when(videoPublicationMapper.insertPublication(any())).thenReturn(1);

        XmPersistenceSyncBo.VideoPublicationSyncBo input = new XmPersistenceSyncBo.VideoPublicationSyncBo();
        input.setUserId(10001L);
        input.setWorkType("video");
        input.setTaskRefId("video-task-001");
        input.setTitle("勾股定理讲解");
        input.setDescription("面积法证明");
        input.setCoverUrl("https://cdn.test/video-task-001/cover.jpg");
        input.setIsPublic(true);

        XmPersistenceSyncVo.VideoPublicationSyncVo response = service.syncVideoPublication(input);

        ArgumentCaptor<XmPersistenceSyncBo.VideoPublicationSyncBo> captor =
            ArgumentCaptor.forClass(XmPersistenceSyncBo.VideoPublicationSyncBo.class);
        verify(videoPublicationMapper).insertPublication(captor.capture());
        XmPersistenceSyncBo.VideoPublicationSyncBo inserted = captor.getValue();

        assertEquals(10001L, inserted.getUserId());
        assertEquals("video-task-001", inserted.getTaskRefId());
        assertEquals("normal", inserted.getStatus());
        assertEquals(true, inserted.getIsPublic());
        assertNull(inserted.getPreviousVersion());
        assertEquals(0, inserted.getVersion());
        assertEquals("xm_user_work", response.getTableName());
        assertEquals("video-task-001", response.getTaskRefId());
        assertEquals(true, response.getIsPublic());
    }

    @Test
    void shouldRejectVideoPublicationUpdateWhenVersionConflict() {
        VideoPublicationMapper videoPublicationMapper = mock(VideoPublicationMapper.class);
        XmPersistenceSyncService service = new XmPersistenceSyncService(
            new ObjectMapper(),
            mock(XmCompanionTurnMapper.class),
            mock(XmWhiteboardActionLogMapper.class),
            mock(XmKnowledgeChatLogMapper.class),
            mock(LearningResultMapper.class),
            videoPublicationMapper,
            mock(SessionArtifactMapper.class)
        );

        XmPersistenceSyncVo.VideoPublicationSyncVo existing = new XmPersistenceSyncVo.VideoPublicationSyncVo();
        existing.setWorkId(9002L);
        existing.setWorkType("video");
        existing.setTaskRefId("video-task-009");
        existing.setUserId("10001");
        existing.setTitle("旧标题");
        existing.setIsPublic(false);
        existing.setStatus("normal");
        existing.setVersion(3);
        existing.setCreatedAt(new Date(9_000L));
        existing.setUpdatedAt(new Date(9_500L));
        when(videoPublicationMapper.selectByTaskRefId("video", "video-task-009")).thenReturn(existing);
        when(videoPublicationMapper.updatePublication(any())).thenReturn(0);

        XmPersistenceSyncBo.VideoPublicationSyncBo input = new XmPersistenceSyncBo.VideoPublicationSyncBo();
        input.setUserId(10001L);
        input.setTaskRefId("video-task-009");
        input.setTitle("新标题");
        input.setDescription("新的摘要");
        input.setIsPublic(true);

        ServiceException error = assertThrows(ServiceException.class, () -> service.syncVideoPublication(input));
        assertEquals("视频公开记录版本冲突，请重试", error.getMessage());
    }

    @Test
    void shouldReplaceSessionArtifactsForSameVideoTask() {
        SessionArtifactMapper sessionArtifactMapper = mock(SessionArtifactMapper.class);
        XmPersistenceSyncService service = new XmPersistenceSyncService(
            new ObjectMapper(),
            mock(XmCompanionTurnMapper.class),
            mock(XmWhiteboardActionLogMapper.class),
            mock(XmKnowledgeChatLogMapper.class),
            mock(LearningResultMapper.class),
            mock(VideoPublicationMapper.class),
            sessionArtifactMapper
        );

        XmPersistenceSyncBo.SessionArtifactItemBo timeline = new XmPersistenceSyncBo.SessionArtifactItemBo();
        timeline.setArtifactType("timeline");
        timeline.setAnchorType("artifact_type");
        timeline.setAnchorKey("timeline");
        timeline.setSequenceNo(1);
        timeline.setTitle("视频时间轴");
        timeline.setSummary("3 个场景时间片");
        timeline.setMetadata(java.util.Map.of("sceneCount", 3));

        XmPersistenceSyncBo.SessionArtifactItemBo knowledge = new XmPersistenceSyncBo.SessionArtifactItemBo();
        knowledge.setArtifactType("knowledge_points");
        knowledge.setAnchorType("artifact_type");
        knowledge.setAnchorKey("knowledge_points");
        knowledge.setSequenceNo(2);
        knowledge.setTitle("知识点摘要");
        knowledge.setSummary("2 个知识点");
        knowledge.setMetadata(java.util.Map.of("count", 2));

        XmPersistenceSyncBo.SessionArtifactBatchSyncBo batch = new XmPersistenceSyncBo.SessionArtifactBatchSyncBo();
        batch.setSessionType("video");
        batch.setSessionRefId("video-task-002");
        batch.setObjectKey("video/video-task-002/artifact-graph.json");
        batch.setPayloadRef("https://cos.test/video/video-task-002/artifact-graph.json");
        batch.setOccurredAt(new Date(20_000L));
        batch.setArtifacts(List.of(timeline, knowledge));

        XmPersistenceSyncVo.SessionArtifactBatchSyncVo response = service.syncSessionArtifacts(batch);

        verify(sessionArtifactMapper).deleteBySession("video", "video-task-002");
        ArgumentCaptor<List<XmPersistenceSyncBo.SessionArtifactItemBo>> insertCaptor = ArgumentCaptor.forClass(List.class);
        verify(sessionArtifactMapper).insertBatch(insertCaptor.capture());

        List<XmPersistenceSyncBo.SessionArtifactItemBo> inserted = insertCaptor.getValue();
        assertEquals(2, inserted.size());
        assertEquals("video-task-002", inserted.get(0).getSessionRefId());
        assertNotNull(inserted.get(0).getMetadataJson());
        assertEquals(Integer.valueOf(2), response.getSyncedCount());
        assertEquals("timeline", response.getArtifacts().get(0).getArtifactType());
    }
}
