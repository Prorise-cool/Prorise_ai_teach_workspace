package org.dromara.xiaomai.learningcenter.domain.bo;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.core.validate.QueryGroup;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.springframework.format.annotation.DateTimeFormat;

import java.io.Serial;
import java.util.Date;

/**
 * 学习中心查询对象。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class LearningCenterQueryBo extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "用户ID不能为空", groups = {QueryGroup.class})
    private String userId;

    private String resultType;

    private String status;

    private String keyword;

    private Boolean favoriteOnly;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date beginSourceTime;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date endSourceTime;
}
