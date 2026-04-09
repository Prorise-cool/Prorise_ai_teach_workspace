package org.dromara.xiaomai.landing.controller;

import java.util.List;

import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.*;
import cn.dev33.satoken.annotation.SaCheckPermission;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.web.core.BaseController;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.core.domain.R;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.excel.utils.ExcelUtil;
import org.dromara.xiaomai.landing.domain.vo.XmLandingLeadVo;
import org.dromara.xiaomai.landing.domain.bo.XmLandingLeadBo;
import org.dromara.xiaomai.landing.service.IXmLandingLeadService;
import org.dromara.common.mybatis.core.page.TableDataInfo;

/**
 * 营销落地页线索
 *
 * @author Prorise
 * @date 2026-04-05
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/landingLead")
public class XmLandingLeadController extends BaseController {

    private final IXmLandingLeadService xmLandingLeadService;

    /**
     * 查询营销落地页线索列表
     */
    @SaCheckPermission("xiaomai:landingLead:list")
    @GetMapping("/list")
    public TableDataInfo<XmLandingLeadVo> list(XmLandingLeadBo bo, PageQuery pageQuery) {
        return xmLandingLeadService.queryPageList(bo, pageQuery);
    }

    /**
     * 导出营销落地页线索列表
     */
    @SaCheckPermission("xiaomai:landingLead:export")
    @Log(title = "营销落地页线索", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(XmLandingLeadBo bo, HttpServletResponse response) {
        List<XmLandingLeadVo> list = xmLandingLeadService.queryList(bo);
        ExcelUtil.exportExcel(list, "营销落地页线索", XmLandingLeadVo.class, response);
    }

    /**
     * 获取营销落地页线索详细信息
     *
     * @param id 主键
     */
    @SaCheckPermission("xiaomai:landingLead:query")
    @GetMapping("/{id}")
    public R<XmLandingLeadVo> getInfo(@NotNull(message = "主键不能为空")
                                     @PathVariable Long id) {
        return R.ok(xmLandingLeadService.queryById(id));
    }

    /**
     * 新增营销落地页线索
     */
    @SaCheckPermission("xiaomai:landingLead:add")
    @Log(title = "营销落地页线索", businessType = BusinessType.INSERT)
    @RepeatSubmit()
    @PostMapping()
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XmLandingLeadBo bo) {
        return toAjax(xmLandingLeadService.insertByBo(bo));
    }

    /**
     * 修改营销落地页线索
     */
    @SaCheckPermission("xiaomai:landingLead:edit")
    @Log(title = "营销落地页线索", businessType = BusinessType.UPDATE)
    @RepeatSubmit()
    @PutMapping()
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XmLandingLeadBo bo) {
        return toAjax(xmLandingLeadService.updateByBo(bo));
    }

    /**
     * 删除营销落地页线索
     *
     * @param ids 主键串
     */
    @SaCheckPermission("xiaomai:landingLead:remove")
    @Log(title = "营销落地页线索", businessType = BusinessType.DELETE)
    @RepeatSubmit()
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空")
                          @PathVariable Long[] ids) {
        return toAjax(xmLandingLeadService.deleteWithValidByIds(List.of(ids), true));
    }
}
