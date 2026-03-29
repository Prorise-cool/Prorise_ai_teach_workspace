package org.dromara.xiaomai.learning.domain.vo;

import cn.idev.excel.annotation.ExcelIgnoreUnannotated;
import cn.idev.excel.annotation.ExcelProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 学习结果长期承接视图。
 *
 * @author Codex
 */
@Data
@ExcelIgnoreUnannotated
public class LearningResultVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @ExcelProperty("结果类型")
    private String resultType;

    @ExcelProperty("结果名称")
    private String displayName;

    @ExcelProperty("宿主表")
    private String tableName;

    @ExcelProperty("来源类型")
    private String sourceType;

    @ExcelProperty("状态语义")
    private String statusRule;

    @ExcelProperty("版本语义")
    private String versionRule;

    @ExcelProperty("详情字段")
    private String detailFields;

    @ExcelProperty("备注")
    private String note;
}
