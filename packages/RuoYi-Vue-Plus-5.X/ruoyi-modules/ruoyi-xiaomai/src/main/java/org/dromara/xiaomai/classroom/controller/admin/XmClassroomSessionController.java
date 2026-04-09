package org.dromara.xiaomai.classroom.controller.admin;

import cn.dev33.satoken.annotation.SaCheckPermission;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import org.dromara.common.core.validate.QueryGroup;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.web.core.BaseController;
import org.dromara.common.core.utils.ValidatorUtils;
import org.dromara.xiaomai.constant.XmPermissionConstants;
import org.dromara.xiaomai.classroom.domain.bo.ClassroomSessionBo;
import org.dromara.xiaomai.classroom.domain.vo.ClassroomSessionVo;
import org.dromara.xiaomai.classroom.service.IClassroomSessionService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

/**
 * 课堂会话控制器。
 *
 * @author Codex
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/classroom/session")
public class XmClassroomSessionController extends BaseController {

    private final IClassroomSessionService classroomSessionService;

    @SaCheckPermission(XmPermissionConstants.CLASSROOM_SESSION_PREFIX + ":list")
    @GetMapping("/list")
    public TableDataInfo<ClassroomSessionVo> list(@Validated(QueryGroup.class) ClassroomSessionBo bo, PageQuery pageQuery) {
        return classroomSessionService.queryPageList(bo, pageQuery);
    }

    @SaCheckPermission(XmPermissionConstants.CLASSROOM_SESSION_PREFIX + ":query")
    @GetMapping("/{id}")
    public R<ClassroomSessionVo> getInfo(@NotNull(message = "主键不能为空") @PathVariable("id") Long id) {
        return R.ok(classroomSessionService.queryById(id));
    }

    @SaCheckPermission(XmPermissionConstants.CLASSROOM_SESSION_PREFIX + ":add")
    @Log(title = "课堂会话", businessType = BusinessType.INSERT)
    @PostMapping
    @RepeatSubmit(interval = 2, timeUnit = TimeUnit.SECONDS, message = "{repeat.submit.message}")
    public R<Void> add(@RequestBody ClassroomSessionBo bo) {
        ValidatorUtils.validate(bo, AddGroup.class);
        return toAjax(classroomSessionService.insertByBo(bo));
    }

    @SaCheckPermission(XmPermissionConstants.CLASSROOM_SESSION_PREFIX + ":edit")
    @Log(title = "课堂会话", businessType = BusinessType.UPDATE)
    @PutMapping
    @RepeatSubmit
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody ClassroomSessionBo bo) {
        return toAjax(classroomSessionService.updateByBo(bo));
    }

    @SaCheckPermission(XmPermissionConstants.CLASSROOM_SESSION_PREFIX + ":remove")
    @Log(title = "课堂会话", businessType = BusinessType.DELETE)
    @RepeatSubmit()
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空") @PathVariable Long[] ids) {
        return toAjax(classroomSessionService.deleteWithValidByIds(Arrays.asList(ids), true));
    }
}
