package org.dromara.xiaomai.learningcenter.service;

import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterActionBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterQueryBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterRecordVo;
import org.dromara.xiaomai.learningcenter.mapper.LearningCenterMapper;
import org.dromara.xiaomai.learningcenter.service.impl.LearningCenterServiceImpl;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Date;
import java.util.List;

import static org.dromara.xiaomai.learningcenter.service.TestLearningCenterFixtures.favoriteAction;
import static org.dromara.xiaomai.learningcenter.service.TestLearningCenterFixtures.sampleRecord;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 学习中心聚合查询服务测试。
 *
 * @author Codex
 */
@Tag("local")
public class LearningCenterServiceImplTest {

    @Test
    void shouldQueryFavoritePageWithUnifiedPaginationShape() {
        LearningCenterMapper mapper = mock(LearningCenterMapper.class);
        LearningCenterServiceImpl service = new LearningCenterServiceImpl(mapper);
        LearningCenterQueryBo bo = new LearningCenterQueryBo();
        bo.setUserId("student_001");
        LearningCenterRecordVo record = sampleRecord("xm_video_task", "video_001", "video");

        when(mapper.countAggregateRecords(argThat(query ->
            Boolean.TRUE.equals(query.getFavoriteOnly())
                && "student_001".equals(query.getUserId())
        ))).thenReturn(1L);
        when(mapper.selectAggregateRecords(
            argThat(query -> Boolean.TRUE.equals(query.getFavoriteOnly())),
            eq(0L),
            eq(10L)
        )).thenReturn(List.of(record));

        TableDataInfo<LearningCenterRecordVo> result = service.queryFavoritePage(bo, new PageQuery(10, 1));

        assertEquals(1, result.getTotal());
        assertEquals(1, result.getRows().size());
        assertEquals("xm_video_task:video_001", result.getRows().get(0).getRecordId());
    }

    @Test
    void shouldReturnEmptyHistoryPageWithoutMutatingSourceQuery() {
        LearningCenterMapper mapper = mock(LearningCenterMapper.class);
        LearningCenterServiceImpl service = new LearningCenterServiceImpl(mapper);
        LearningCenterQueryBo bo = new LearningCenterQueryBo();
        bo.setUserId("student_001");
        bo.setResultType("quiz");
        bo.setStatus("completed");
        bo.setKeyword("路径");

        when(mapper.countAggregateRecords(argThat(query ->
            Boolean.FALSE.equals(query.getFavoriteOnly())
                && "student_001".equals(query.getUserId())
                && "quiz".equals(query.getResultType())
                && "completed".equals(query.getStatus())
                && "路径".equals(query.getKeyword())
        ))).thenReturn(0L);

        TableDataInfo<LearningCenterRecordVo> result = service.queryHistoryPage(bo, new PageQuery(20, 2));

        assertEquals(0, result.getTotal());
        assertTrue(result.getRows().isEmpty());
        assertEquals(200, result.getCode());
        verify(mapper, never()).selectAggregateRecords(argThat(query -> true), eq(20L), eq(20L));
        assertEquals("quiz", bo.getResultType());
        assertEquals("completed", bo.getStatus());
    }

    @Test
    void shouldUpsertFavoriteAndDeleteHistoryFromSourceRecord() {
        LearningCenterMapper mapper = mock(LearningCenterMapper.class);
        LearningCenterServiceImpl service = new LearningCenterServiceImpl(mapper);
        LearningCenterActionBo action = favoriteAction("student_001", "xm_companion_turn", "turn_001");
        LearningCenterRecordVo record = sampleRecord("xm_companion_turn", "turn_001", "companion");
        record.setSourceTime(new Date());

        when(mapper.selectSourceRecord("student_001", "xm_companion_turn", "turn_001")).thenReturn(record);
        when(mapper.upsertFavorite(record)).thenReturn(1);
        when(mapper.upsertDeletedRecord(record)).thenReturn(1);

        assertTrue(service.favorite(action));
        assertTrue(service.removeHistory(action));

        verify(mapper).upsertFavorite(record);
        verify(mapper).upsertDeletedRecord(record);
    }

    @Test
    void shouldTreatCancelFavoriteAsIdempotentAndRejectMissingSourceOnFavorite() {
        LearningCenterMapper mapper = mock(LearningCenterMapper.class);
        LearningCenterServiceImpl service = new LearningCenterServiceImpl(mapper);
        LearningCenterActionBo action = favoriteAction("student_001", "xm_knowledge_chat_log", "chat_001");

        when(mapper.selectSourceRecord("student_001", "xm_knowledge_chat_log", "chat_001")).thenReturn(null);

        assertThrows(ServiceException.class, () -> service.favorite(action));
        assertTrue(service.cancelFavorite(action));
        verify(mapper).deactivateFavorite("student_001", "xm_knowledge_chat_log", "chat_001");
    }
}
