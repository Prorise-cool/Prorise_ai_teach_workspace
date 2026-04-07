package org.dromara.xiaomai.ai.module.domain.vo;

import org.dromara.xiaomai.ai.module.domain.XmAiModule;
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
 * AI 配置模块主数据视图对象 xm_ai_module
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = XmAiModule.class)
public class XmAiModuleVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @ExcelProperty(value = "主键")
    private Long id;

    /**
     * 模块编码，如 video/classroom/companion/knowledge/learning
     */
    @ExcelProperty(value = "模块编码，如 video/classroom/companion/knowledge/learning")
    private String moduleCode;

    /**
     * 模块名称
     */
    @ExcelProperty(value = "模块名称")
    private String moduleName;

    /**
     * 状态（0正常 1停用）
     */
    @ExcelProperty(value = "状态", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "sys_normal_disable")
    private String status;

    /**
     * 排序号
     */
    @ExcelProperty(value = "排序号")
    private Long sortOrder;

    /**
     * 备注
     */
    @ExcelProperty(value = "备注")
    private String remark;


}
