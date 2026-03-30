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

    @ExcelProperty("用户ID")
    private String userId;

    @ExcelProperty("来源类型")
    private String sourceType;

    @ExcelProperty("来源会话ID")
    private String sourceSessionId;

    @ExcelProperty("来源结果ID")
    private String sourceResultId;

    @ExcelProperty("状态")
    private String status;

    @ExcelProperty("得分")
    private Integer score;

    @ExcelProperty("解析摘要")
    private String analysisSummary;

    @ExcelProperty("详情定位")
    private String detailRef;

    @ExcelProperty("来源时间")
    private java.util.Date sourceTime;

    @ExcelProperty("版本号")
    private Integer versionNo;

    @ExcelProperty("备注")
    private String note;
}
