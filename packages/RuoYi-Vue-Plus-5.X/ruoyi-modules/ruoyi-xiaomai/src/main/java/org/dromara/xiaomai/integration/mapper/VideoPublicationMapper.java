package org.dromara.xiaomai.integration.mapper;

import org.apache.ibatis.annotations.Param;
import org.dromara.xiaomai.integration.domain.bo.XmPersistenceSyncBo;
import org.dromara.xiaomai.integration.domain.vo.XmPersistenceSyncVo;

import java.util.List;

/**
 * 视频公开作品内部同步 Mapper。
 *
 * @author Codex
 */
public interface VideoPublicationMapper {

    XmPersistenceSyncVo.VideoPublicationSyncVo selectByTaskRefId(
        @Param("workType") String workType,
        @Param("taskRefId") String taskRefId
    );

    Long countPublications(@Param("query") XmPersistenceSyncBo.VideoPublicationQueryBo query);

    List<XmPersistenceSyncVo.VideoPublicationSyncVo> selectPublications(
        @Param("query") XmPersistenceSyncBo.VideoPublicationQueryBo query,
        @Param("offset") long offset,
        @Param("pageSize") long pageSize
    );

    int insertPublication(@Param("record") XmPersistenceSyncBo.VideoPublicationSyncBo record);

    int updatePublication(@Param("record") XmPersistenceSyncBo.VideoPublicationSyncBo record);
}
