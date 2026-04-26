package org.dromara.xiaomai.landing.domain.bo;

import org.dromara.xiaomai.landing.domain.XmLandingLead;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.*;

/**
 * 营销落地页线索业务对象 xm_landing_lead
 *
 * @author Prorise
 * @date 2026-04-05
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = XmLandingLead.class, reverseConvertGenerate = false)
public class XmLandingLeadBo extends BaseEntity {

    /**
     * 主键
     */
    private Long id;

    /**
     * 联系人姓名
     */
    @NotBlank(message = "联系人姓名不能为空", groups = { AddGroup.class, EditGroup.class })
    private String contactName;

    /**
     * 机构 / 称呼
     */
    private String organizationName;

    /**
     * 联系邮箱
     */
    @NotBlank(message = "联系邮箱不能为空", groups = { AddGroup.class, EditGroup.class })
    private String contactEmail;

    /**
     * 咨询主题
     */
    @NotBlank(message = "咨询主题不能为空", groups = { AddGroup.class, EditGroup.class })
    private String subject;

    /**
     * 留言内容
     */
    @NotBlank(message = "留言内容不能为空", groups = { AddGroup.class, EditGroup.class })
    private String message;

    /**
     * 来源页面
     */
    private String sourcePage;

    /**
     * 提交语言
     */
    @NotBlank(message = "提交语言不能为空", groups = { AddGroup.class, EditGroup.class })
    private String sourceLocale;

    /**
     * 处理状态
     */
    @NotBlank(message = "处理状态不能为空", groups = { AddGroup.class, EditGroup.class })
    private String processingStatus;

    /**
     * 后台备注
     */
    private String remark;


}
