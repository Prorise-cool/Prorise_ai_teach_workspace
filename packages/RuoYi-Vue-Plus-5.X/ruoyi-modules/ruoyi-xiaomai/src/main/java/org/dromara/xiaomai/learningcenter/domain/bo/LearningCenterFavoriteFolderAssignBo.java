package org.dromara.xiaomai.learningcenter.domain.bo;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 收藏文件夹移动命令。
 *
 * @author Codex
 */
@Data
public class LearningCenterFavoriteFolderAssignBo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String userId;

    @NotBlank(message = "记录ID不能为空")
    private String recordId;

    /**
     * 目标文件夹 ID；为空表示取消归档。
     */
    private String folderId;
}
