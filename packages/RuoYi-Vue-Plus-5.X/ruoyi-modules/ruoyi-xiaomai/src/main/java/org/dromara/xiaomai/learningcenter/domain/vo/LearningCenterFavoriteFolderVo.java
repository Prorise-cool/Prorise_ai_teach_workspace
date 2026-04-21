package org.dromara.xiaomai.learningcenter.domain.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;

/**
 * 收藏文件夹视图。
 *
 * @author Codex
 */
@Data
public class LearningCenterFavoriteFolderVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String folderId;

    private String folderName;

    private Date createTime;
}

