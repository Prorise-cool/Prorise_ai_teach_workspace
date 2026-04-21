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

    /**
     * userId 参数允许为 null（普通聚合查询只用 query.userId），但必须声明，
     * 否则 Mapper XML 中 aggregate_union_raw 的 <if test="userId != null"> 会因
     * ParamMap 缺 key 抛 BindingException。
     */
    Long countAggregateRecords(
        @Param("query") LearningCenterQueryBo query,
        @Param("userId") String userId
    );

    List<LearningCenterRecordVo> selectAggregateRecords(
        @Param("query") LearningCenterQueryBo query,
        @Param("userId") String userId,
        @Param("offset") long offset,
        @Param("pageSize") long pageSize
    );

    /**
     * query 参数允许为 null（单条查询只用 userId），但必须声明，同上。
     */
    LearningCenterRecordVo selectSourceRecord(
        @Param("userId") String userId,
        @Param("sourceTable") String sourceTable,
        @Param("sourceResultId") String sourceResultId,
        @Param("query") LearningCenterQueryBo query
    );

    int upsertDeletedRecord(@Param("record") LearningCenterRecordVo record);

    int upsertFavorite(@Param("record") LearningCenterRecordVo record);

    int deactivateFavorite(
        @Param("userId") String userId,
        @Param("sourceTable") String sourceTable,
        @Param("sourceResultId") String sourceResultId
    );
}
