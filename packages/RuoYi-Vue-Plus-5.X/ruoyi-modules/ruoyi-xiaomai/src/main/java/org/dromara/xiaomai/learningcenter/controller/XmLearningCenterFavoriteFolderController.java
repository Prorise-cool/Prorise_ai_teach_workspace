package org.dromara.xiaomai.learningcenter.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.satoken.utils.LoginHelper;
import org.dromara.common.web.core.BaseController;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterFavoriteFolderAssignBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterFavoriteFolderCreateBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterFavoriteFolderRemoveBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterFavoriteFolderStateVo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterFavoriteFolderVo;
import org.dromara.xiaomai.learningcenter.service.ILearningCenterFavoriteFolderService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * 学习中心收藏文件夹控制器（Epic 9）。
 *
 * @author Codex
 */
@Validated
@RestController
@RequiredArgsConstructor
@SaCheckLogin
@RequestMapping("/xiaomai/learning-center/favorite-folders")
public class XmLearningCenterFavoriteFolderController extends BaseController {

    private final ILearningCenterFavoriteFolderService favoriteFolderService;

    @GetMapping
    public R<LearningCenterFavoriteFolderStateVo> state() {
        return R.ok(favoriteFolderService.queryState(String.valueOf(LoginHelper.getUserId())));
    }

    @Log(title = "学习收藏文件夹", businessType = BusinessType.INSERT)
    @PostMapping
    @RepeatSubmit()
    public R<LearningCenterFavoriteFolderVo> create(@Validated @RequestBody LearningCenterFavoriteFolderCreateBo bo) {
        bo.setUserId(String.valueOf(LoginHelper.getUserId()));
        return R.ok(favoriteFolderService.createFolder(bo));
    }

    @Log(title = "学习收藏文件夹", businessType = BusinessType.UPDATE)
    @PostMapping("/assign")
    @RepeatSubmit()
    public R<Void> assign(@Validated @RequestBody LearningCenterFavoriteFolderAssignBo bo) {
        bo.setUserId(String.valueOf(LoginHelper.getUserId()));
        return toAjax(favoriteFolderService.assignFolder(bo));
    }

    @Log(title = "学习收藏文件夹", businessType = BusinessType.DELETE)
    @PostMapping("/remove")
    @RepeatSubmit()
    public R<Void> remove(@Validated @RequestBody LearningCenterFavoriteFolderRemoveBo bo) {
        bo.setUserId(String.valueOf(LoginHelper.getUserId()));
        return toAjax(favoriteFolderService.removeFolder(bo));
    }
}
