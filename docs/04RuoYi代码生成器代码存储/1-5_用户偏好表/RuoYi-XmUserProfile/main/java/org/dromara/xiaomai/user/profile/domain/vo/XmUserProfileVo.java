package org.dromara.xiaomai.user.profile.domain.vo;

import org.dromara.common.translation.annotation.Translation;
import org.dromara.common.translation.constant.TransConstant;
import org.dromara.xiaomai.user.profile.domain.XmUserProfile;
import cn.idev.excel.annotation.ExcelIgnoreUnannotated;
import cn.idev.excel.annotation.ExcelProperty;
import org.dromara.common.excel.annotation.ExcelDictFormat;
import org.dromara.common.excel.convert.ExcelDictConvert;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;



/**
 * 用户配置视图对象 xm_user_profile
 *
 * @author Prorise
 * @date 2026-04-04
 */
@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = XmUserProfile.class)
public class XmUserProfileVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @ExcelProperty(value = "主键")
    private Long id;

    /**
     * 用户ID
     */
    @ExcelProperty(value = "用户ID")
    private Long userId;

    /**
     * 头像URL
     */
    @ExcelProperty(value = "头像URL")
    private String avatarUrl;

    /**
     * 头像URLUrl
     */
    @Translation(type = TransConstant.OSS_ID_TO_URL, mapper = "avatarUrl")
    private String avatarUrlUrl;
    /**
     * 个人简介
     */
    @ExcelProperty(value = "个人简介")
    private String bio;

    /**
     * 性格类型
     */
    @ExcelProperty(value = "性格类型", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "user_personality_type")
    private String personalityType;

    /**
     * AI导师偏好
     */
    @ExcelProperty(value = "AI导师偏好", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "user_teacher_tag")
    private String teacherTags;

    /**
     * 语言偏好
     */
    @ExcelProperty(value = "语言偏好", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "sys_language")
    private String language;

    /**
     * 是否完成配置
     */
    @ExcelProperty(value = "是否完成配置", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "sys_yes_no")
    private Long isCompleted;

    /**
     * 创建时间
     */
    @ExcelProperty(value = "创建时间")
    private Date createTime;

    /**
     * 更新时间
     */
    @ExcelProperty(value = "更新时间")
    private Date updateTime;


}
