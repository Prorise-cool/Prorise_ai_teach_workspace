package org.dromara.xiaomai.user.work.controller;

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
import org.dromara.xiaomai.user.work.domain.vo.XmUserWorkVo;
import org.dromara.xiaomai.user.work.domain.bo.XmUserWorkBo;
import org.dromara.xiaomai.user.work.service.IXmUserWorkService;
import org.dromara.common.mybatis.core.page.TableDataInfo;

/**
 * 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/userWork")
public class XmUserWorkController extends BaseController {

    private final IXmUserWorkService xmUserWorkService;

    /**
     * 查询用户作品（视频/课堂）—— 社区瀑布流与管理后台共用列表
     */
    @SaCheckPermission("xiaomai:userWork:list")
    @GetMapping("/list")
    public TableDataInfo<XmUserWorkVo> list(XmUserWorkBo bo, PageQuery pageQuery) {
        return xmUserWorkService.queryPageList(bo, pageQuery);
    }

    /**
     * 导出用户作品（视频/课堂）—— 社区瀑布流与管理后台共用列表
     */
    @SaCheckPermission("xiaomai:userWork:export")
    @Log(title = "用户作品（视频/课堂）—— 社区瀑布流与管理后台共用", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(XmUserWorkBo bo, HttpServletResponse response) {
        List<XmUserWorkVo> list = xmUserWorkService.queryList(bo);
        ExcelUtil.exportExcel(list, "用户作品（视频/课堂）—— 社区瀑布流与管理后台共用", XmUserWorkVo.class, response);
    }

    /**
     * 获取用户作品（视频/课堂）—— 社区瀑布流与管理后台共用详细信息
     *
     * @param id 主键
     */
    @SaCheckPermission("xiaomai:userWork:query")
    @GetMapping("/{id}")
    public R<XmUserWorkVo> getInfo(@NotNull(message = "主键不能为空")
                                     @PathVariable Long id) {
        return R.ok(xmUserWorkService.queryById(id));
    }

    /**
     * 新增用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     */
    @SaCheckPermission("xiaomai:userWork:add")
    @Log(title = "用户作品（视频/课堂）—— 社区瀑布流与管理后台共用", businessType = BusinessType.INSERT)
    @RepeatSubmit()
    @PostMapping()
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XmUserWorkBo bo) {
        return toAjax(xmUserWorkService.insertByBo(bo));
    }

    /**
     * 修改用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     */
    @SaCheckPermission("xiaomai:userWork:edit")
    @Log(title = "用户作品（视频/课堂）—— 社区瀑布流与管理后台共用", businessType = BusinessType.UPDATE)
    @RepeatSubmit()
    @PutMapping()
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XmUserWorkBo bo) {
        return toAjax(xmUserWorkService.updateByBo(bo));
    }

    /**
     * 删除用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     *
     * @param ids 主键串
     */
    @SaCheckPermission("xiaomai:userWork:remove")
    @Log(title = "用户作品（视频/课堂）—— 社区瀑布流与管理后台共用", businessType = BusinessType.DELETE)
    @RepeatSubmit()
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空")
                          @PathVariable Long[] ids) {
        return toAjax(xmUserWorkService.deleteWithValidByIds(List.of(ids), true));
    }
}
