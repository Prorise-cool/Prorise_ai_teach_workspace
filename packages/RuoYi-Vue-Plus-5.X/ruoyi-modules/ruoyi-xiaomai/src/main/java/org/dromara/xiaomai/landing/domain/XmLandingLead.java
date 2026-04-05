package org.dromara.xiaomai.landing.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.io.Serial;

/**
 * 营销落地页线索对象 xm_landing_lead
 *
 * @author Prorise
 * @date 2026-04-05
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_landing_lead")
public class XmLandingLead extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @TableId(value = "id")
    private Long id;

    /**
     * 租户编号
     */
    private String tenantId;

    /**
     * 联系人姓名
     */
    private String contactName;

    /**
     * 机构 / 称呼
     */
    private String organizationName;

    /**
     * 联系邮箱
     */
    private String contactEmail;

    /**
     * 咨询主题
     */
    private String subject;

    /**
     * 留言内容
     */
    private String message;

    /**
     * 来源页面
     */
    private String sourcePage;

    /**
     * 提交语言
     */
    private String sourceLocale;

    /**
     * 处理状态
     */
    private String processingStatus;

    /**
     * 后台备注
     */
    private String remark;

    /**
     * 删除标志（0-存在 2-删除）
     */
    @TableLogic
    private String delFlag;


}
