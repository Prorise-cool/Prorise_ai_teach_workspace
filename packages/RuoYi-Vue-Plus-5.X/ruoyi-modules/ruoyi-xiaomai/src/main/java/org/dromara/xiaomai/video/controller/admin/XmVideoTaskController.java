package org.dromara.xiaomai.video.controller.admin;

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
import org.dromara.xiaomai.video.domain.bo.VideoTaskBo;
import org.dromara.xiaomai.video.domain.vo.VideoTaskVo;
import org.dromara.xiaomai.video.service.IVideoTaskService;
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
 * 视频任务控制器。
 *
 * @author Codex
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/video/task")
public class XmVideoTaskController extends BaseController {

    private final IVideoTaskService videoTaskService;

    @SaCheckPermission(XmPermissionConstants.VIDEO_TASK_PREFIX + ":list")
    @GetMapping("/list")
    public TableDataInfo<VideoTaskVo> list(@Validated(QueryGroup.class) VideoTaskBo bo, PageQuery pageQuery) {
        return videoTaskService.queryPageList(bo, pageQuery);
    }

    @SaCheckPermission(XmPermissionConstants.VIDEO_TASK_PREFIX + ":query")
    @GetMapping("/{id}")
    public R<VideoTaskVo> getInfo(@NotNull(message = "主键不能为空") @PathVariable("id") Long id) {
        return R.ok(videoTaskService.queryById(id));
    }

    @SaCheckPermission(XmPermissionConstants.VIDEO_TASK_PREFIX + ":add")
    @Log(title = "视频任务", businessType = BusinessType.INSERT)
    @PostMapping
    @RepeatSubmit(interval = 2, timeUnit = TimeUnit.SECONDS, message = "{repeat.submit.message}")
    public R<Void> add(@RequestBody VideoTaskBo bo) {
        ValidatorUtils.validate(bo, AddGroup.class);
        return toAjax(videoTaskService.insertByBo(bo));
    }

    @SaCheckPermission(XmPermissionConstants.VIDEO_TASK_PREFIX + ":edit")
    @Log(title = "视频任务", businessType = BusinessType.UPDATE)
    @PutMapping
    @RepeatSubmit
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody VideoTaskBo bo) {
        return toAjax(videoTaskService.updateByBo(bo));
    }

    @SaCheckPermission(XmPermissionConstants.VIDEO_TASK_PREFIX + ":remove")
    @Log(title = "视频任务", businessType = BusinessType.DELETE)
    @RepeatSubmit()
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空") @PathVariable Long[] ids) {
        return toAjax(videoTaskService.deleteWithValidByIds(Arrays.asList(ids), true));
    }
}
