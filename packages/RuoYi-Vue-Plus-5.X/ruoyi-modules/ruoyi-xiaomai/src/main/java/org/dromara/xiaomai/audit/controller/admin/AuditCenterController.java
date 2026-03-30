package org.dromara.xiaomai.audit.controller.admin;

import cn.dev33.satoken.annotation.SaCheckPermission;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.excel.utils.ExcelUtil;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.web.core.BaseController;
import org.dromara.xiaomai.audit.domain.bo.AuditRecordBo;
import org.dromara.xiaomai.audit.domain.vo.AuditRecordVo;
import org.dromara.xiaomai.audit.service.IAuditCenterService;
import org.dromara.xiaomai.constant.XmPermissionConstants;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 审计中心控制器。
 *
 * @author Codex
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/audit-center")
public class AuditCenterController extends BaseController {

    private final IAuditCenterService auditCenterService;

    @SaCheckPermission(XmPermissionConstants.AUDIT_PREFIX + ":list")
    @GetMapping("/list")
    public TableDataInfo<AuditRecordVo> list(AuditRecordBo bo, PageQuery pageQuery) {
        return auditCenterService.queryPage(bo, pageQuery);
    }

    @SaCheckPermission(XmPermissionConstants.AUDIT_PREFIX + ":query")
    @GetMapping("/detail")
    public R<AuditRecordVo> detail(
        @RequestParam("userId") @NotBlank(message = "用户ID不能为空") String userId,
        @RequestParam("sourceTable") @NotBlank(message = "来源宿主表不能为空") String sourceTable,
        @RequestParam("sourceResultId") @NotBlank(message = "来源主键不能为空") String sourceResultId
    ) {
        return R.ok(auditCenterService.queryDetail(userId, sourceTable, sourceResultId));
    }

    @SaCheckPermission(XmPermissionConstants.AUDIT_PREFIX + ":export")
    @Log(title = "审计中心", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(AuditRecordBo bo, HttpServletResponse response) {
        List<AuditRecordVo> list = auditCenterService.queryList(bo);
        ExcelUtil.exportExcel(list, "审计中心", AuditRecordVo.class, response);
    }
}
