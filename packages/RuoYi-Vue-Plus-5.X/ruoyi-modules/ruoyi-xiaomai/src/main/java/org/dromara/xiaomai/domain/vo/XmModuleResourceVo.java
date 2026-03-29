package org.dromara.xiaomai.domain.vo;

import cn.idev.excel.annotation.ExcelIgnoreUnannotated;
import cn.idev.excel.annotation.ExcelProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 小麦模块资源规划视图。
 *
 * @author Codex
 */
@Data
@ExcelIgnoreUnannotated
public class XmModuleResourceVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @ExcelProperty("资源键")
    private String resourceKey;

    @ExcelProperty("资源名称")
    private String displayName;

    @ExcelProperty("业务表")
    private String tableNames;

    @ExcelProperty("权限前缀")
    private String permissionPrefix;

    @ExcelProperty("后台路由")
    private String adminPath;

    @ExcelProperty("后台组件")
    private String adminComponent;

    @ExcelProperty("接入模式")
    private String accessMode;

    @ExcelProperty("生成策略")
    private String implementationMode;

    @ExcelProperty("默认动作")
    private String supportedActions;

    @ExcelProperty("允许导出")
    private Boolean exportEnabled;

    @ExcelProperty("需要操作日志")
    private Boolean auditLogged;

    @ExcelProperty("备注")
    private String note;
}
