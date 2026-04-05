package org.dromara.xiaomai.landing.domain.vo;

import org.dromara.xiaomai.landing.domain.XmLandingLead;
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
 * 营销落地页线索视图对象 xm_landing_lead
 *
 * @author Prorise
 * @date 2026-04-05
 */
@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = XmLandingLead.class)
public class XmLandingLeadVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @ExcelProperty(value = "主键")
    private Long id;

    /**
     * 联系人姓名
     */
    @ExcelProperty(value = "联系人姓名")
    private String contactName;

    /**
     * 机构 / 称呼
     */
    @ExcelProperty(value = "机构 / 称呼")
    private String organizationName;

    /**
     * 联系邮箱
     */
    @ExcelProperty(value = "联系邮箱")
    private String contactEmail;

    /**
     * 咨询主题
     */
    @ExcelProperty(value = "咨询主题")
    private String subject;

    /**
     * 留言内容
     */
    @ExcelProperty(value = "留言内容")
    private String message;

    /**
     * 来源页面
     */
    @ExcelProperty(value = "来源页面")
    private String sourcePage;

    /**
     * 提交语言
     */
    @ExcelProperty(value = "提交语言", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "sys_language")
    private String sourceLocale;

    /**
     * 处理状态
     */
    @ExcelProperty(value = "处理状态", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_landing_lead_status")
    private String processingStatus;

    /**
     * 后台备注
     */
    @ExcelProperty(value = "后台备注")
    private String remark;

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
