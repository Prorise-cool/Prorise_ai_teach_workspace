package org.dromara.xiaomai.audit.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.audit.domain.bo.AuditRecordBo;
import org.dromara.xiaomai.audit.domain.vo.AuditRecordVo;
import org.dromara.xiaomai.audit.mapper.AuditCenterMapper;
import org.dromara.xiaomai.audit.service.impl.AuditCenterServiceImpl;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 审计中心服务测试。
 *
 * @author Codex
 */
@Tag("dev")
@Tag("local")
public class AuditCenterServiceImplTest {

    @Test
    void shouldQueryPageWithAuditFiltersAndPagination() {
        AuditCenterMapper mapper = mock(AuditCenterMapper.class);
        AuditCenterServiceImpl service = new AuditCenterServiceImpl(mapper);
        AuditRecordBo bo = new AuditRecordBo();
        bo.setUserId("student_001");
        bo.setResultType("quiz");
        bo.setSourceTable("xm_learning_record");
        bo.setDeleted(Boolean.TRUE);
        AuditRecordVo record = sampleRecord();

        when(mapper.countAuditRecords(argThat(query ->
            "student_001".equals(query.getUserId())
                && "quiz".equals(query.getResultType())
                && "xm_learning_record".equals(query.getSourceTable())
                && Boolean.TRUE.equals(query.getDeleted())
        ))).thenReturn(1L);
        when(mapper.selectAuditRecords(
            argThat(query -> Boolean.TRUE.equals(query.getDeleted())),
            eq(0L),
            eq(10L)
        )).thenReturn(List.of(record));

        TableDataInfo<AuditRecordVo> result = service.queryPage(bo, new PageQuery(10, 1));

        assertEquals(1, result.getTotal());
        assertEquals(1, result.getRows().size());
        assertEquals("xm_learning_record:quiz_001", result.getRows().get(0).getRecordId());
    }

    @Test
    void shouldReturnEmptyPageWhenNoAuditRecordsFound() {
        AuditCenterMapper mapper = mock(AuditCenterMapper.class);
        AuditCenterServiceImpl service = new AuditCenterServiceImpl(mapper);

        when(mapper.countAuditRecords(argThat(query -> query != null))).thenReturn(0L);

        TableDataInfo<AuditRecordVo> result = service.queryPage(new AuditRecordBo(), new PageQuery(20, 2));

        assertEquals(0, result.getTotal());
        assertTrue(result.getRows().isEmpty());
        assertEquals(200, result.getCode());
    }

    @Test
    void shouldUseMapperForExportListAndDetailLookup() {
        AuditCenterMapper mapper = mock(AuditCenterMapper.class);
        AuditCenterServiceImpl service = new AuditCenterServiceImpl(mapper);
        AuditRecordBo bo = new AuditRecordBo();
        bo.setFavorite(Boolean.TRUE);
        AuditRecordVo record = sampleRecord();

        when(mapper.selectAuditList(argThat(query -> Boolean.TRUE.equals(query.getFavorite()))))
            .thenReturn(List.of(record));
        when(mapper.selectAuditDetail("student_001", "xm_learning_record", "quiz_001"))
            .thenReturn(record);

        List<AuditRecordVo> exportRows = service.queryList(bo);
        AuditRecordVo detail = service.queryDetail("student_001", "xm_learning_record", "quiz_001");

        assertEquals(1, exportRows.size());
        assertNotNull(detail);
        assertEquals(Boolean.TRUE, detail.getDeleted());
        verify(mapper).selectAuditList(argThat(query -> Boolean.TRUE.equals(query.getFavorite())));
    }

    @Test
    void shouldAllowMissingDetailWithoutRuntimeFallback() {
        AuditCenterMapper mapper = mock(AuditCenterMapper.class);
        AuditCenterServiceImpl service = new AuditCenterServiceImpl(mapper);

        when(mapper.selectAuditDetail("student_002", "xm_video_task", "video_404")).thenReturn(null);

        AuditRecordVo detail = service.queryDetail("student_002", "xm_video_task", "video_404");

        assertNull(detail);
        verify(mapper).selectAuditDetail("student_002", "xm_video_task", "video_404");
    }

    private AuditRecordVo sampleRecord() {
        AuditRecordVo record = new AuditRecordVo();
        record.setRecordId("xm_learning_record:quiz_001");
        record.setUserId("student_001");
        record.setResultType("quiz");
        record.setSourceType("quiz");
        record.setSourceTable("xm_learning_record");
        record.setSourceResultId("quiz_001");
        record.setSourceSessionId("session_001");
        record.setDisplayTitle("测验结果");
        record.setSummary("答题摘要");
        record.setStatus("completed");
        record.setDetailRef("detail://quiz_001");
        record.setSourceTime(new Date());
        record.setFavorite(Boolean.TRUE);
        record.setFavoriteTime(new Date());
        record.setDeleted(Boolean.TRUE);
        record.setDeletedTime(new Date());
        return record;
    }
}
