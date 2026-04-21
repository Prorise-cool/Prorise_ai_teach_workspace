package org.dromara.xiaomai.learningcenter.domain.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;
import java.util.Map;

/**
 * 收藏文件夹状态视图：文件夹列表 + 归档映射。
 *
 * @author Codex
 */
@Data
public class LearningCenterFavoriteFolderStateVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private List<LearningCenterFavoriteFolderVo> folders;

    /**
     * recordId -> folderId
     */
    private Map<String, String> assignments;
}

