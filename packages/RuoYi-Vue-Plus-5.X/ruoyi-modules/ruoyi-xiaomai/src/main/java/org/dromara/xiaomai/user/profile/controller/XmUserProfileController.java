package org.dromara.xiaomai.user.profile.controller;

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
import org.dromara.xiaomai.user.profile.domain.vo.XmUserProfileVo;
import org.dromara.xiaomai.user.profile.domain.bo.XmUserProfileBo;
import org.dromara.xiaomai.user.profile.service.IXmUserProfileService;
import org.dromara.common.mybatis.core.page.TableDataInfo;

/**
 * 用户配置
 *
 * @author Prorise
 * @date 2026-04-04
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/userProfile")
public class XmUserProfileController extends BaseController {

    private final IXmUserProfileService xmUserProfileService;

    /**
     * 查询用户配置列表
     */
    @SaCheckPermission("xiaomai:userProfile:list")
    @GetMapping("/list")
    public TableDataInfo<XmUserProfileVo> list(XmUserProfileBo bo, PageQuery pageQuery) {
        return xmUserProfileService.queryPageList(bo, pageQuery);
    }

    /**
     * 导出用户配置列表
     */
    @SaCheckPermission("xiaomai:userProfile:export")
    @Log(title = "用户配置", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(XmUserProfileBo bo, HttpServletResponse response) {
        List<XmUserProfileVo> list = xmUserProfileService.queryList(bo);
        ExcelUtil.exportExcel(list, "用户配置", XmUserProfileVo.class, response);
    }

    /**
     * 获取用户配置详细信息
     *
     * @param id 主键
     */
    @SaCheckPermission("xiaomai:userProfile:query")
    @GetMapping("/{id}")
    public R<XmUserProfileVo> getInfo(@NotNull(message = "主键不能为空")
                                     @PathVariable Long id) {
        return R.ok(xmUserProfileService.queryById(id));
    }

    /**
     * 新增用户配置
     */
    @SaCheckPermission("xiaomai:userProfile:add")
    @Log(title = "用户配置", businessType = BusinessType.INSERT)
    @RepeatSubmit()
    @PostMapping()
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XmUserProfileBo bo) {
        return toAjax(xmUserProfileService.insertByBo(bo));
    }

    /**
     * 修改用户配置
     */
    @SaCheckPermission("xiaomai:userProfile:edit")
    @Log(title = "用户配置", businessType = BusinessType.UPDATE)
    @RepeatSubmit()
    @PutMapping()
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XmUserProfileBo bo) {
        return toAjax(xmUserProfileService.updateByBo(bo));
    }

    /**
     * 删除用户配置
     *
     * @param ids 主键串
     */
    @SaCheckPermission("xiaomai:userProfile:remove")
    @Log(title = "用户配置", businessType = BusinessType.DELETE)
    @RepeatSubmit()
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空")
                          @PathVariable Long[] ids) {
        return toAjax(xmUserProfileService.deleteWithValidByIds(List.of(ids), true));
    }
}
