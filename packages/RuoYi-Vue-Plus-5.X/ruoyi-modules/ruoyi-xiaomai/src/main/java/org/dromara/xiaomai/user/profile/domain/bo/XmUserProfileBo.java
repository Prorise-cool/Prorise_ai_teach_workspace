package org.dromara.xiaomai.user.profile.domain.bo;

import org.dromara.xiaomai.user.profile.domain.XmUserProfile;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.*;
import org.dromara.common.translation.annotation.Translation;
import org.dromara.common.translation.constant.TransConstant;

/**
 * 用户配置业务对象 xm_user_profile
 *
 * @author Prorise
 * @date 2026-04-04
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = XmUserProfile.class, reverseConvertGenerate = false)
public class XmUserProfileBo extends BaseEntity {

    /**
     * 主键
     */
    private Long id;

    /**
     * 用户ID
     */
    @NotNull(message = "用户ID不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long userId;

    /**
     * 用户名
     */
    private String userName;

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
