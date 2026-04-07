package org.dromara.xiaomai.ai.binding.controller;

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
import org.dromara.xiaomai.ai.binding.domain.vo.XmAiModuleBindingVo;
import org.dromara.xiaomai.ai.binding.domain.bo.XmAiModuleBindingBo;
import org.dromara.xiaomai.ai.binding.service.IXmAiModuleBindingService;
import org.dromara.common.mybatis.core.page.TableDataInfo;

/**
 * 模块阶段到运行资源的绑定关系
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/aiModuleBinding")
public class XmAiModuleBindingController extends BaseController {

    private final IXmAiModuleBindingService xmAiModuleBindingService;

    /**
     * 查询模块阶段到运行资源的绑定关系列表
     */
    @SaCheckPermission("xiaomai:aiModuleBinding:list")
    @GetMapping("/list")
    public TableDataInfo<XmAiModuleBindingVo> list(XmAiModuleBindingBo bo, PageQuery pageQuery) {
        return xmAiModuleBindingService.queryPageList(bo, pageQuery);
    }

    /**
     * 导出模块阶段到运行资源的绑定关系列表
     */
    @SaCheckPermission("xiaomai:aiModuleBinding:export")
    @Log(title = "模块阶段到运行资源的绑定关系", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(XmAiModuleBindingBo bo, HttpServletResponse response) {
        List<XmAiModuleBindingVo> list = xmAiModuleBindingService.queryList(bo);
        ExcelUtil.exportExcel(list, "模块阶段到运行资源的绑定关系", XmAiModuleBindingVo.class, response);
    }

    /**
     * 获取模块阶段到运行资源的绑定关系详细信息
     *
     * @param id 主键
     */
    @SaCheckPermission("xiaomai:aiModuleBinding:query")
    @GetMapping("/{id}")
    public R<XmAiModuleBindingVo> getInfo(@NotNull(message = "主键不能为空")
                                     @PathVariable Long id) {
        return R.ok(xmAiModuleBindingService.queryById(id));
    }

    /**
     * 新增模块阶段到运行资源的绑定关系
     */
    @SaCheckPermission("xiaomai:aiModuleBinding:add")
    @Log(title = "模块阶段到运行资源的绑定关系", businessType = BusinessType.INSERT)
    @RepeatSubmit()
    @PostMapping()
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XmAiModuleBindingBo bo) {
        return toAjax(xmAiModuleBindingService.insertByBo(bo));
    }

    /**
     * 修改模块阶段到运行资源的绑定关系
     */
    @SaCheckPermission("xiaomai:aiModuleBinding:edit")
    @Log(title = "模块阶段到运行资源的绑定关系", businessType = BusinessType.UPDATE)
    @RepeatSubmit()
    @PutMapping()
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XmAiModuleBindingBo bo) {
        return toAjax(xmAiModuleBindingService.updateByBo(bo));
    }

    /**
     * 删除模块阶段到运行资源的绑定关系
     *
     * @param ids 主键串
     */
    @SaCheckPermission("xiaomai:aiModuleBinding:remove")
    @Log(title = "模块阶段到运行资源的绑定关系", businessType = BusinessType.DELETE)
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空")
                          @PathVariable Long[] ids) {
        return toAjax(xmAiModuleBindingService.deleteWithValidByIds(List.of(ids), true));
    }
}
