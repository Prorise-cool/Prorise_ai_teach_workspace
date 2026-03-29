package org.dromara.xiaomai.learningcenter.mapper;

import org.apache.ibatis.annotations.Param;
import org.dromara.common.mybatis.core.mapper.BaseMapperPlus;
import org.dromara.xiaomai.learningcenter.domain.XmLearningRecord;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterQueryBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterRecordVo;

import java.util.List;

/**
 * 学习中心聚合查询 Mapper。
 *
 * @author Codex
 */
public interface LearningCenterMapper extends BaseMapperPlus<XmLearningRecord, LearningCenterRecordVo> {

    Long countAggregateRecords(@Param("query") LearningCenterQueryBo query);

    List<LearningCenterRecordVo> selectAggregateRecords(
        @Param("query") LearningCenterQueryBo query,
        @Param("offset") long offset,
        @Param("pageSize") long pageSize
    );

    LearningCenterRecordVo selectSourceRecord(
        @Param("userId") String userId,
        @Param("sourceTable") String sourceTable,
        @Param("sourceResultId") String sourceResultId
    );

    int upsertDeletedRecord(@Param("record") LearningCenterRecordVo record);

    int upsertFavorite(@Param("record") LearningCenterRecordVo record);

    int deactivateFavorite(
        @Param("userId") String userId,
        @Param("sourceTable") String sourceTable,
        @Param("sourceResultId") String sourceResultId
    );
}
