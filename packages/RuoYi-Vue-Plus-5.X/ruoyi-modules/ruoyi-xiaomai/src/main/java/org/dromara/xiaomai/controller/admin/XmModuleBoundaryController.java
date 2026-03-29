package org.dromara.xiaomai.controller.admin;

import cn.dev33.satoken.annotation.SaCheckPermission;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.excel.utils.ExcelUtil;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.web.core.BaseController;
import org.dromara.xiaomai.constant.XmPermissionConstants;
import org.dromara.xiaomai.domain.bo.XmModuleResourceBo;
import org.dromara.xiaomai.domain.vo.XmModuleBoundaryVo;
import org.dromara.xiaomai.domain.vo.XmModuleResourceVo;
import org.dromara.xiaomai.service.IXmModuleBoundaryService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 小麦模块边界控制器。
 *
 * @author Codex
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/module")
public class XmModuleBoundaryController extends BaseController {

    private final IXmModuleBoundaryService moduleBoundaryService;

    /**
     * 查询小麦模块资源规划。
     */
    @SaCheckPermission(XmPermissionConstants.MODULE_LIST)
    @GetMapping("/resources")
    public TableDataInfo<XmModuleResourceVo> list(XmModuleResourceBo bo, PageQuery pageQuery) {
        return moduleBoundaryService.queryResourcePage(bo, pageQuery);
    }

    /**
     * 查询小麦模块边界总览。
     */
    @SaCheckPermission(XmPermissionConstants.MODULE_QUERY)
    @GetMapping("/overview")
    public R<XmModuleBoundaryVo> overview() {
        return R.ok(moduleBoundaryService.queryBoundary());
    }

    /**
     * 导出小麦模块资源规划。
     */
    @SaCheckPermission(XmPermissionConstants.MODULE_EXPORT)
    @Log(title = "小麦模块规划", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(XmModuleResourceBo bo, HttpServletResponse response) {
        List<XmModuleResourceVo> list = moduleBoundaryService.queryResourceList(bo);
        ExcelUtil.exportExcel(list, "小麦模块资源规划", XmModuleResourceVo.class, response);
    }
}
