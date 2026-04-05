package org.dromara.xiaomai.user.profile.domain;

import org.dromara.common.mybatis.core.domain.BaseEntity;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.translation.annotation.Translation;
import org.dromara.common.translation.constant.TransConstant;

import java.io.Serial;

/**
 * 用户配置对象 xm_user_profile
 *
 * @author Prorise
 * @date 2026-04-04
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_user_profile")
public class XmUserProfile extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @TableId(value = "id")
    private Long id;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 头像URL
     */
    private String avatarUrl;

    /**
     * 个人简介
     */
    private String bio;

    /**
     * 性格类型
     */
    private String personalityType;

    /**
     * AI导师偏好
     */
    private String teacherTags;

    /**
     * 语言偏好
     */
    private String language;

    /**
     * 是否完成配置
     */
    private Long isCompleted;


}
