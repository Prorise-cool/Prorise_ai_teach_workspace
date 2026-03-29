package org.dromara.xiaomai.learningcenter.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.web.core.BaseController;
import org.dromara.common.core.validate.QueryGroup;
import org.dromara.xiaomai.constant.XmPermissionConstants;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterActionBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterQueryBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterRecordVo;
import org.dromara.xiaomai.learningcenter.service.ILearningCenterService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 学习中心聚合查询与收藏 / 历史变更控制器。
 *
 * @author Codex
 */
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/xiaomai/learning-center")
public class LearningCenterController extends BaseController {

    private final ILearningCenterService learningCenterService;

    @SaCheckPermission(XmPermissionConstants.LEARNING_RECORD_PREFIX + ":list")
    @GetMapping("/learning")
    public TableDataInfo<LearningCenterRecordVo> learning(@Validated(QueryGroup.class) LearningCenterQueryBo bo, PageQuery pageQuery) {
        return learningCenterService.queryLearningPage(bo, pageQuery);
    }

    @SaCheckPermission(XmPermissionConstants.LEARNING_RECORD_PREFIX + ":list")
    @GetMapping("/history")
    public TableDataInfo<LearningCenterRecordVo> history(@Validated(QueryGroup.class) LearningCenterQueryBo bo, PageQuery pageQuery) {
        return learningCenterService.queryHistoryPage(bo, pageQuery);
    }

    @SaCheckPermission(XmPermissionConstants.LEARNING_FAVORITE_PREFIX + ":list")
    @GetMapping("/favorites")
    public TableDataInfo<LearningCenterRecordVo> favorites(@Validated(QueryGroup.class) LearningCenterQueryBo bo, PageQuery pageQuery) {
        return learningCenterService.queryFavoritePage(bo, pageQuery);
    }

    @SaCheckPermission(XmPermissionConstants.LEARNING_FAVORITE_PREFIX + ":add")
    @PostMapping("/favorite")
    @RepeatSubmit()
    public R<Void> favorite(@Validated @RequestBody LearningCenterActionBo bo) {
        return toAjax(learningCenterService.favorite(bo));
    }

    @SaCheckPermission(XmPermissionConstants.LEARNING_FAVORITE_PREFIX + ":remove")
    @PostMapping("/favorite/cancel")
    @RepeatSubmit()
    public R<Void> cancelFavorite(@Validated @RequestBody LearningCenterActionBo bo) {
        return toAjax(learningCenterService.cancelFavorite(bo));
    }

    @SaCheckPermission(XmPermissionConstants.LEARNING_RECORD_PREFIX + ":remove")
    @PostMapping("/history/remove")
    @RepeatSubmit()
    public R<Void> removeHistory(@Validated @RequestBody LearningCenterActionBo bo) {
        return toAjax(learningCenterService.removeHistory(bo));
    }
}
