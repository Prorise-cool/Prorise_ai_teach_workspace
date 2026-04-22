package org.dromara.xiaomai.learningcenter.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.satoken.utils.LoginHelper;
import org.dromara.common.web.core.BaseController;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterActionBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterQueryBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterRecordVo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterSummaryVo;
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
@SaCheckLogin
@RequestMapping("/xiaomai/learning-center")
public class XmLearningCenterController extends BaseController {

    private final ILearningCenterService learningCenterService;

    @GetMapping("/learning")
    public TableDataInfo<LearningCenterRecordVo> learning(LearningCenterQueryBo bo, PageQuery pageQuery) {
        bo.setUserId(String.valueOf(LoginHelper.getUserId()));
        return learningCenterService.queryLearningPage(bo, pageQuery);
    }

    @GetMapping("/history")
    public TableDataInfo<LearningCenterRecordVo> history(LearningCenterQueryBo bo, PageQuery pageQuery) {
        bo.setUserId(String.valueOf(LoginHelper.getUserId()));
        return learningCenterService.queryHistoryPage(bo, pageQuery);
    }

    /**
     * 学习中心侧边栏聚合摘要（TASK-009）：averageQuizScore / latestRecommendation / activeLearningPath。
     */
    @GetMapping("/summary")
    public R<LearningCenterSummaryVo> summary() {
        String userId = String.valueOf(LoginHelper.getUserId());
        return R.ok(learningCenterService.querySummary(userId));
    }

    @GetMapping("/favorites")
    public TableDataInfo<LearningCenterRecordVo> favorites(LearningCenterQueryBo bo, PageQuery pageQuery) {
        bo.setUserId(String.valueOf(LoginHelper.getUserId()));
        return learningCenterService.queryFavoritePage(bo, pageQuery);
    }

    @Log(title = "学习收藏", businessType = BusinessType.INSERT)
    @PostMapping("/favorite")
    @RepeatSubmit()
    public R<Void> favorite(@Validated @RequestBody LearningCenterActionBo bo) {
        bo.setUserId(String.valueOf(LoginHelper.getUserId()));
        return toAjax(learningCenterService.favorite(bo));
    }

    @Log(title = "学习收藏", businessType = BusinessType.DELETE)
    @PostMapping("/favorite/cancel")
    @RepeatSubmit()
    public R<Void> cancelFavorite(@Validated @RequestBody LearningCenterActionBo bo) {
        bo.setUserId(String.valueOf(LoginHelper.getUserId()));
        return toAjax(learningCenterService.cancelFavorite(bo));
    }

    @Log(title = "学习记录", businessType = BusinessType.DELETE)
    @PostMapping("/history/remove")
    @RepeatSubmit()
    public R<Void> removeHistory(@Validated @RequestBody LearningCenterActionBo bo) {
        bo.setUserId(String.valueOf(LoginHelper.getUserId()));
        return toAjax(learningCenterService.removeHistory(bo));
    }
}
