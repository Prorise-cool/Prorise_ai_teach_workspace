package org.dromara.xiaomai.learning.mapper;

import org.apache.ibatis.annotations.Param;
import org.dromara.xiaomai.integration.domain.bo.XmPersistenceSyncBo;
import org.dromara.xiaomai.learning.domain.bo.LearningResultBo;
import org.dromara.xiaomai.learning.domain.vo.LearningResultVo;

import java.util.List;

/**
 * 学习结果长期承接 Mapper。
 *
 * @author Codex
 */
public interface LearningResultMapper {

    Long countResultRecords(@Param("query") LearningResultBo query);

    List<LearningResultVo> selectResultRecords(
        @Param("query") LearningResultBo query,
        @Param("offset") long offset,
        @Param("pageSize") long pageSize
    );

    List<LearningResultVo> selectCatalogRecords(@Param("query") LearningResultBo query);

    int insertCheckpointRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    int insertAggregateRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    int insertQuizRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    int insertWrongbookRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    int insertRecommendationRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    int insertPathRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    XmPersistenceSyncBo.LearningResultSyncItemBo selectAggregateRecord(
        @Param("userId") String userId,
        @Param("sourceTable") String sourceTable,
        @Param("sourceResultId") String sourceResultId
    );

    int updateAggregateRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    XmPersistenceSyncBo.LearningResultSyncItemBo selectQuizRecordByRecordId(@Param("recordId") Long recordId);

    int updateQuizRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    XmPersistenceSyncBo.LearningResultSyncItemBo selectWrongbookRecordByRecordId(@Param("recordId") Long recordId);

    int updateWrongbookRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    XmPersistenceSyncBo.LearningResultSyncItemBo selectRecommendationRecordByRecordId(@Param("recordId") Long recordId);

    int updateRecommendationRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    XmPersistenceSyncBo.LearningResultSyncItemBo selectPathRecordByRecordId(@Param("recordId") Long recordId);

    int updatePathRecord(@Param("record") XmPersistenceSyncBo.LearningResultSyncItemBo record);

    int updateAggregateSourceResultId(@Param("recordId") Long recordId, @Param("sourceResultId") String sourceResultId);
}
