package org.dromara.xiaomai.user.profile.controller;

import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.satoken.utils.LoginHelper;
import org.dromara.xiaomai.user.profile.domain.bo.XmUserProfileBo;
import org.dromara.xiaomai.user.profile.domain.vo.XmProfileCompletedVo;
import org.dromara.xiaomai.user.profile.domain.vo.XmUserProfileVo;
import org.dromara.xiaomai.user.profile.service.IXmUserProfileService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 学生端用户配置自服务接口。
 *
 * @author Codex
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/user/profile")
public class XmUserProfileAppController {

    private final IXmUserProfileService xmUserProfileService;

    /**
     * 获取当前登录用户配置。
     *
     * @return 当前登录用户配置
     */
    @GetMapping
    public R<XmUserProfileVo> getCurrentProfile() {
        return R.ok(xmUserProfileService.queryByUserId(LoginHelper.getUserId()));
    }

    /**
     * 获取当前登录用户配置完成状态。
     *
     * @return 当前登录用户配置完成状态
     */
    @GetMapping("/completed")
    public R<XmProfileCompletedVo> getCompletedStatus() {
        return R.ok(new XmProfileCompletedVo(xmUserProfileService.isCompleted(LoginHelper.getUserId())));
    }

    /**
     * 首次保存当前登录用户配置。
     *
     * @param bo 用户配置
     * @return 保存后的用户配置
     */
    @Log(title = "用户配置", businessType = BusinessType.INSERT)
    @RepeatSubmit
    @PostMapping
    public R<XmUserProfileVo> createCurrentProfile(@RequestBody XmUserProfileBo bo) {
        return R.ok(xmUserProfileService.saveCurrentProfile(LoginHelper.getUserId(), bo));
    }

    /**
     * 更新当前登录用户配置。
     *
     * @param bo 用户配置
     * @return 保存后的用户配置
     */
    @Log(title = "用户配置", businessType = BusinessType.UPDATE)
    @RepeatSubmit
    @PutMapping
    public R<XmUserProfileVo> updateCurrentProfile(@RequestBody XmUserProfileBo bo) {
        return R.ok(xmUserProfileService.saveCurrentProfile(LoginHelper.getUserId(), bo));
    }
}
