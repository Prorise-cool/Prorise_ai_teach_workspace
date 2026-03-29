package org.dromara.xiaomai.audit.mapper;

import org.apache.ibatis.annotations.Param;
import org.dromara.common.mybatis.core.mapper.BaseMapperPlus;
import org.dromara.xiaomai.audit.domain.bo.AuditRecordBo;
import org.dromara.xiaomai.audit.domain.vo.AuditRecordVo;
import org.dromara.xiaomai.learningcenter.domain.XmLearningRecord;

import java.util.List;

/**
 * 审计中心聚合查询 Mapper。
 *
 * @author Codex
 */
public interface AuditCenterMapper extends BaseMapperPlus<XmLearningRecord, AuditRecordVo> {

    Long countAuditRecords(@Param("query") AuditRecordBo query);

    List<AuditRecordVo> selectAuditRecords(
        @Param("query") AuditRecordBo query,
        @Param("offset") long offset,
        @Param("pageSize") long pageSize
    );

    List<AuditRecordVo> selectAuditList(@Param("query") AuditRecordBo query);

    AuditRecordVo selectAuditDetail(
        @Param("userId") String userId,
        @Param("sourceTable") String sourceTable,
        @Param("sourceResultId") String sourceResultId
    );
}
