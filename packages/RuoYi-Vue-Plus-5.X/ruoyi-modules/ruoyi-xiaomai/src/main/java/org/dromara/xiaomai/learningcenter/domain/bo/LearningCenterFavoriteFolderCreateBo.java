package org.dromara.xiaomai.learningcenter.domain.bo;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 收藏文件夹创建命令。
 *
 * @author Codex
 */
@Data
public class LearningCenterFavoriteFolderCreateBo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String userId;

    @NotBlank(message = "文件夹名称不能为空")
    private String folderName;
}
