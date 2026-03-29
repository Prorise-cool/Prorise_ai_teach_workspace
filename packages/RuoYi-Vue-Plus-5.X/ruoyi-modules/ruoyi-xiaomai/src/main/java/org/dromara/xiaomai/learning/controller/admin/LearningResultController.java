package org.dromara.xiaomai.learning.controller.admin;

import cn.dev33.satoken.annotation.SaCheckPermission;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.web.core.BaseController;
import org.dromara.xiaomai.constant.XmPermissionConstants;
import org.dromara.xiaomai.learning.domain.bo.LearningResultBo;
import org.dromara.xiaomai.learning.domain.vo.LearningResultVo;
import org.dromara.xiaomai.learning.service.ILearningResultService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 学习结果长期承接控制器。
 *
 * @author Codex
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/xiaomai/learning")
public class LearningResultController extends BaseController {

    private final ILearningResultService learningResultService;

    @SaCheckPermission(XmPermissionConstants.LEARNING_COACH_PREFIX + ":list")
    @GetMapping("/results")
    public TableDataInfo<LearningResultVo> list(LearningResultBo bo, PageQuery pageQuery) {
        return learningResultService.queryResultPage(bo, pageQuery);
    }

    @SaCheckPermission(XmPermissionConstants.LEARNING_COACH_PREFIX + ":query")
    @GetMapping("/results/catalog")
    public R<List<LearningResultVo>> catalog(LearningResultBo bo) {
        return R.ok(learningResultService.queryResultList(bo));
    }
}
