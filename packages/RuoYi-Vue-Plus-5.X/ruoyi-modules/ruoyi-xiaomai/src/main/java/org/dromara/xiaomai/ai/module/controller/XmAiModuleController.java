package org.dromara.xiaomai.ai.module.controller;

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
import org.dromara.xiaomai.ai.module.domain.vo.XmAiModuleVo;
import org.dromara.xiaomai.ai.module.domain.bo.XmAiModuleBo;
import org.dromara.xiaomai.ai.module.service.IXmAiModuleService;
import org.dromara.common.mybatis.core.page.TableDataInfo;

/**
 * AI 配置模块主数据
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/aiModule")
public class XmAiModuleController extends BaseController {

    private final IXmAiModuleService xmAiModuleService;

    /**
     * 查询AI 配置模块主数据列表
     */
    @SaCheckPermission("xiaomai:aiModule:list")
    @GetMapping("/list")
    public TableDataInfo<XmAiModuleVo> list(XmAiModuleBo bo, PageQuery pageQuery) {
        return xmAiModuleService.queryPageList(bo, pageQuery);
    }

    /**
     * 导出AI 配置模块主数据列表
     */
    @SaCheckPermission("xiaomai:aiModule:export")
    @Log(title = "AI 配置模块主数据", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(XmAiModuleBo bo, HttpServletResponse response) {
        List<XmAiModuleVo> list = xmAiModuleService.queryList(bo);
        ExcelUtil.exportExcel(list, "AI 配置模块主数据", XmAiModuleVo.class, response);
    }

    /**
     * 获取AI 配置模块主数据详细信息
     *
     * @param id 主键
     */
    @SaCheckPermission("xiaomai:aiModule:query")
    @GetMapping("/{id}")
    public R<XmAiModuleVo> getInfo(@NotNull(message = "主键不能为空")
                                     @PathVariable Long id) {
        return R.ok(xmAiModuleService.queryById(id));
    }

    /**
     * 新增AI 配置模块主数据
     */
    @SaCheckPermission("xiaomai:aiModule:add")
    @Log(title = "AI 配置模块主数据", businessType = BusinessType.INSERT)
    @RepeatSubmit()
    @PostMapping()
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XmAiModuleBo bo) {
        return toAjax(xmAiModuleService.insertByBo(bo));
    }

    /**
     * 修改AI 配置模块主数据
     */
    @SaCheckPermission("xiaomai:aiModule:edit")
    @Log(title = "AI 配置模块主数据", businessType = BusinessType.UPDATE)
    @RepeatSubmit()
    @PutMapping()
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XmAiModuleBo bo) {
        return toAjax(xmAiModuleService.updateByBo(bo));
    }

    /**
     * 删除AI 配置模块主数据
     *
     * @param ids 主键串
     */
    @SaCheckPermission("xiaomai:aiModule:remove")
    @Log(title = "AI 配置模块主数据", businessType = BusinessType.DELETE)
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空")
                          @PathVariable Long[] ids) {
        return toAjax(xmAiModuleService.deleteWithValidByIds(List.of(ids), true));
    }
}
