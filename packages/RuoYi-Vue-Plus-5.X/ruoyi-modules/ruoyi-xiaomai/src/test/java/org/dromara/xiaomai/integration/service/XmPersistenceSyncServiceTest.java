package org.dromara.xiaomai.integration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.xiaomai.companion.mapper.XmCompanionTurnMapper;
import org.dromara.xiaomai.companion.mapper.XmWhiteboardActionLogMapper;
import org.dromara.xiaomai.integration.domain.bo.XmPersistenceSyncBo;
import org.dromara.xiaomai.integration.domain.vo.XmPersistenceSyncVo;
import org.dromara.xiaomai.knowledge.mapper.XmKnowledgeChatLogMapper;
import org.dromara.xiaomai.learning.mapper.LearningResultMapper;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
            learningResultMapper
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
            learningResultMapper
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
}
