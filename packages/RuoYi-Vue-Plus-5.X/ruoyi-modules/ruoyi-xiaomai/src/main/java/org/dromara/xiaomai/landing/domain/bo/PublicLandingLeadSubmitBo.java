package org.dromara.xiaomai.landing.domain.bo;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 匿名线索提交通道请求体。
 *
 * @author Codex
 */
@Data
public class PublicLandingLeadSubmitBo {

    /** 联系人姓名 */
    @NotBlank(message = "联系人姓名不能为空")
    private String contactName;

    /** 组织名称 */
    private String organizationName;

    /** 联系邮箱 */
    @NotBlank(message = "联系邮箱不能为空")
    @Email(message = "联系邮箱格式不正确")
    private String contactEmail;

    /** 咨询主题 */
    @NotBlank(message = "咨询主题不能为空")
    private String subject;

    /** 留言内容 */
    @NotBlank(message = "留言内容不能为空")
    private String message;

    /** 来源页面 */
    private String sourcePage;

    /** 来源区域 */
    private String sourceLocale;
}
