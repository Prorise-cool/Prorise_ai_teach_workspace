package org.dromara.xiaomai.audit.domain.vo;

import cn.idev.excel.annotation.ExcelIgnoreUnannotated;
import cn.idev.excel.annotation.ExcelProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;

/**
 * 审计中心记录视图。
 *
 * @author Codex
 */
@Data
@ExcelIgnoreUnannotated
public class AuditRecordVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @ExcelProperty("记录ID")
    private String recordId;

    @ExcelProperty("用户ID")
    private String userId;

    @ExcelProperty("结果类型")
    private String resultType;

    @ExcelProperty("来源类型")
    private String sourceType;

    @ExcelProperty("来源宿主表")
    private String sourceTable;

    @ExcelProperty("来源主键")
    private String sourceResultId;

    @ExcelProperty("来源会话ID")
    private String sourceSessionId;

    @ExcelProperty("标题")
    private String displayTitle;

    @ExcelProperty("摘要")
    private String summary;

    @ExcelProperty("状态")
    private String status;

    @ExcelProperty("详情定位")
    private String detailRef;

    @ExcelProperty("发生时间")
    private Date sourceTime;

    @ExcelProperty("是否收藏")
    private Boolean favorite;

    @ExcelProperty("收藏时间")
    private Date favoriteTime;

    @ExcelProperty("删除标记")
    private Boolean deleted;

    @ExcelProperty("删除时间")
    private Date deletedTime;
}
