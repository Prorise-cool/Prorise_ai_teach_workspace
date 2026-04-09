package org.dromara.xiaomai.ai.provider.controller;

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
import org.dromara.xiaomai.ai.provider.domain.vo.XmAiProviderVo;
import org.dromara.xiaomai.ai.provider.domain.bo.XmAiProviderBo;
import org.dromara.xiaomai.ai.provider.service.IXmAiProviderService;
import org.dromara.common.mybatis.core.page.TableDataInfo;

/**
 * AI Provider 实例配置
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/aiProvider")
public class XmAiProviderController extends BaseController {

    private final IXmAiProviderService xmAiProviderService;

    /**
     * 查询AI Provider 实例配置列表
     */
    @SaCheckPermission("xiaomai:aiProvider:list")
    @GetMapping("/list")
    public TableDataInfo<XmAiProviderVo> list(XmAiProviderBo bo, PageQuery pageQuery) {
        return xmAiProviderService.queryPageList(bo, pageQuery);
    }

    /**
     * 导出AI Provider 实例配置列表
     */
    @SaCheckPermission("xiaomai:aiProvider:export")
    @Log(title = "AI Provider 实例配置", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(XmAiProviderBo bo, HttpServletResponse response) {
        List<XmAiProviderVo> list = xmAiProviderService.queryList(bo);
        ExcelUtil.exportExcel(list, "AI Provider 实例配置", XmAiProviderVo.class, response);
    }

    /**
     * 获取AI Provider 实例配置详细信息
     *
     * @param id 主键
     */
    @SaCheckPermission("xiaomai:aiProvider:query")
    @GetMapping("/{id}")
    public R<XmAiProviderVo> getInfo(@NotNull(message = "主键不能为空")
                                     @PathVariable Long id) {
        return R.ok(xmAiProviderService.queryById(id));
    }

    /**
     * 新增AI Provider 实例配置
     */
    @SaCheckPermission("xiaomai:aiProvider:add")
    @Log(title = "AI Provider 实例配置", businessType = BusinessType.INSERT)
    @RepeatSubmit()
    @PostMapping()
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XmAiProviderBo bo) {
        return toAjax(xmAiProviderService.insertByBo(bo));
    }

    /**
     * 修改AI Provider 实例配置
     */
    @SaCheckPermission("xiaomai:aiProvider:edit")
    @Log(title = "AI Provider 实例配置", businessType = BusinessType.UPDATE)
    @RepeatSubmit()
    @PutMapping()
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XmAiProviderBo bo) {
        return toAjax(xmAiProviderService.updateByBo(bo));
    }

    /**
     * 删除AI Provider 实例配置
     *
     * @param ids 主键串
     */
    @SaCheckPermission("xiaomai:aiProvider:remove")
    @Log(title = "AI Provider 实例配置", businessType = BusinessType.DELETE)
    @RepeatSubmit()
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空")
                          @PathVariable Long[] ids) {
        return toAjax(xmAiProviderService.deleteWithValidByIds(List.of(ids), true));
    }
}
