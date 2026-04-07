package org.dromara.xiaomai.integration.mapper;

import org.apache.ibatis.annotations.Param;
import org.dromara.xiaomai.integration.domain.bo.XmPersistenceSyncBo;

import java.util.List;

/**
 * Session artifact 内部同步 Mapper。
 *
 * @author Codex
 */
public interface SessionArtifactMapper {

    int deleteBySession(@Param("sessionType") String sessionType, @Param("sessionRefId") String sessionRefId);

    int insertBatch(@Param("records") List<XmPersistenceSyncBo.SessionArtifactItemBo> records);
}
