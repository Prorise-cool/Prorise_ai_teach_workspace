package org.dromara.xiaomai.learningcenter.domain.bo;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 学习中心收藏 / 历史变更命令。
 *
 * @author Codex
 */
@Data
public class LearningCenterActionBo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "用户ID不能为空")
    private String userId;

    @NotBlank(message = "来源宿主表不能为空")
    private String sourceTable;

    @NotBlank(message = "来源主键不能为空")
    private String sourceResultId;
}
