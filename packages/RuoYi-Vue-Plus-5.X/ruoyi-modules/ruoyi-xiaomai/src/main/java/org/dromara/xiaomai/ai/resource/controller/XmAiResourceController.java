package org.dromara.xiaomai.ai.resource.controller;

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
import org.dromara.xiaomai.ai.resource.domain.vo.XmAiResourceVo;
import org.dromara.xiaomai.ai.resource.domain.bo.XmAiResourceBo;
import org.dromara.xiaomai.ai.resource.service.IXmAiResourceService;
import org.dromara.common.mybatis.core.page.TableDataInfo;

/**
 * AI 模型 / 音色等可调度资源
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/aiResource")
public class XmAiResourceController extends BaseController {

    private final IXmAiResourceService xmAiResourceService;

    /**
     * 查询AI 模型 / 音色等可调度资源列表
     */
    @SaCheckPermission("xiaomai:aiResource:list")
    @GetMapping("/list")
    public TableDataInfo<XmAiResourceVo> list(XmAiResourceBo bo, PageQuery pageQuery) {
        return xmAiResourceService.queryPageList(bo, pageQuery);
    }

    /**
     * 导出AI 模型 / 音色等可调度资源列表
     */
    @SaCheckPermission("xiaomai:aiResource:export")
    @Log(title = "AI 模型 / 音色等可调度资源", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(XmAiResourceBo bo, HttpServletResponse response) {
        List<XmAiResourceVo> list = xmAiResourceService.queryList(bo);
        ExcelUtil.exportExcel(list, "AI 模型 / 音色等可调度资源", XmAiResourceVo.class, response);
    }

    /**
     * 获取AI 模型 / 音色等可调度资源详细信息
     *
     * @param id 主键
     */
    @SaCheckPermission("xiaomai:aiResource:query")
    @GetMapping("/{id}")
    public R<XmAiResourceVo> getInfo(@NotNull(message = "主键不能为空")
                                     @PathVariable Long id) {
        return R.ok(xmAiResourceService.queryById(id));
    }

    /**
     * 新增AI 模型 / 音色等可调度资源
     */
    @SaCheckPermission("xiaomai:aiResource:add")
    @Log(title = "AI 模型 / 音色等可调度资源", businessType = BusinessType.INSERT)
    @RepeatSubmit()
    @PostMapping()
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XmAiResourceBo bo) {
        return toAjax(xmAiResourceService.insertByBo(bo));
    }

    /**
     * 修改AI 模型 / 音色等可调度资源
     */
    @SaCheckPermission("xiaomai:aiResource:edit")
    @Log(title = "AI 模型 / 音色等可调度资源", businessType = BusinessType.UPDATE)
    @RepeatSubmit()
    @PutMapping()
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XmAiResourceBo bo) {
        return toAjax(xmAiResourceService.updateByBo(bo));
    }

    /**
     * 删除AI 模型 / 音色等可调度资源
     *
     * @param ids 主键串
     */
    @SaCheckPermission("xiaomai:aiResource:remove")
    @Log(title = "AI 模型 / 音色等可调度资源", businessType = BusinessType.DELETE)
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空")
                          @PathVariable Long[] ids) {
        return toAjax(xmAiResourceService.deleteWithValidByIds(List.of(ids), true));
    }
}
