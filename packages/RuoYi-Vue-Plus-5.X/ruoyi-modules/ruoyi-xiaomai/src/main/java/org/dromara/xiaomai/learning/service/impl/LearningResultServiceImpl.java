package org.dromara.xiaomai.learning.service.impl;

import lombok.RequiredArgsConstructor;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learning.domain.bo.LearningResultBo;
import org.dromara.xiaomai.learning.domain.vo.LearningResultVo;
import org.dromara.xiaomai.learning.service.ILearningResultService;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 学习结果长期承接服务实现。
 *
 * @author Codex
 */
@Service
@RequiredArgsConstructor
public class LearningResultServiceImpl implements ILearningResultService {

    private static final String TRACEABILITY_RULE = "path 使用 version_no + update_time，其余结果默认使用 update_time 作为最新态语义。";

    private static final List<LearningResultVo> RESULT_CATALOG = List.of(
        buildResult(
            "checkpoint",
            "学习起点 / checkpoint",
            "xm_learning_record",
            "learning",
            "pending/completed/failed",
            "update_time 优先，checkpoint 不强制版本号",
            "score, analysis_summary, source_session_id, detail_ref",
            "学习起点结果记录，供学习中心聚合与回看。"
        ),
        buildResult(
            "quiz",
            "测验结果",
            "xm_quiz_result",
            "learning",
            "pending/completed/failed",
            "update_time 优先，测验结果按最新提交覆盖",
            "question_total, correct_total, score, analysis_summary, detail_ref",
            "测验完成后沉淀为长期结果，不回退到运行态。"
        ),
        buildResult(
            "wrongbook",
            "错题本",
            "xm_learning_wrongbook",
            "quiz",
            "completed/failed",
            "update_time 优先，错题本按最新来源关联",
            "question_text, wrong_answer_text, reference_answer_text, analysis_summary",
            "错题本挂接测验来源，便于后续回看与导出。"
        ),
        buildResult(
            "recommendation",
            "知识推荐",
            "xm_learning_recommendation",
            "learning",
            "completed/failed",
            "update_time 优先，推荐结果按最新推荐链路覆盖",
            "recommendation_reason, target_type, target_ref_id, detail_ref",
            "推荐结果作为长期学习资产保留，不丢失来源。"
        ),
        buildResult(
            "path",
            "学习路径",
            "xm_learning_path",
            "learning",
            "completed/failed",
            "version_no + update_time，保留路径版本历史",
            "path_title, path_summary, step_count, detail_ref",
            "路径记录必须保留版本信息，不能简单覆盖。"
        )
    );

    @Override
    public LearningResultVo queryPreview() {
        LearningResultVo preview = new LearningResultVo();
        preview.setResultType("learning-preview");
        preview.setDisplayName("Learning Coach 长期结果预览");
        preview.setTableName("xm_learning_record/xm_quiz_result/xm_learning_wrongbook/xm_learning_recommendation/xm_learning_path");
        preview.setSourceType("learning");
        preview.setStatusRule("pending/completed/failed");
        preview.setVersionRule(TRACEABILITY_RULE);
        preview.setDetailFields("score, analysis_summary, detail_ref, version_no, update_time");
        preview.setNote("用于 Story 10.6 的长期承接目录说明。");
        return preview;
    }

    @Override
    public List<LearningResultVo> queryResultList(LearningResultBo bo) {
        LearningResultBo query = bo == null ? new LearningResultBo() : bo;
        return RESULT_CATALOG.stream()
            .filter(item -> match(item.getResultType(), query.getResultType()))
            .filter(item -> match(item.getSourceType(), query.getSourceType()))
            .filter(item -> match(item.getTableName(), query.getTableName()))
            .filter(item -> match(item.getStatusRule(), query.getStatusRule()))
            .filter(item -> match(item.getVersionRule(), query.getVersionRule()))
            .map(this::copyResult)
            .toList();
    }

    @Override
    public TableDataInfo<LearningResultVo> queryResultPage(LearningResultBo bo, PageQuery pageQuery) {
        PageQuery query = pageQuery == null ? new PageQuery(PageQuery.DEFAULT_PAGE_SIZE, PageQuery.DEFAULT_PAGE_NUM) : pageQuery;
        return TableDataInfo.build(queryResultList(bo), query.build());
    }

    private boolean match(String source, String keyword) {
        return StringUtils.isBlank(keyword) || StringUtils.containsIgnoreCase(source, keyword);
    }

    private LearningResultVo copyResult(LearningResultVo source) {
        LearningResultVo target = new LearningResultVo();
        target.setResultType(source.getResultType());
        target.setDisplayName(source.getDisplayName());
        target.setTableName(source.getTableName());
        target.setSourceType(source.getSourceType());
        target.setStatusRule(source.getStatusRule());
        target.setVersionRule(source.getVersionRule());
        target.setDetailFields(source.getDetailFields());
        target.setNote(source.getNote());
        return target;
    }

    private static LearningResultVo buildResult(
        String resultType,
        String displayName,
        String tableName,
        String sourceType,
        String statusRule,
        String versionRule,
        String detailFields,
        String note
    ) {
        LearningResultVo result = new LearningResultVo();
        result.setResultType(resultType);
        result.setDisplayName(displayName);
        result.setTableName(tableName);
        result.setSourceType(sourceType);
        result.setStatusRule(statusRule);
        result.setVersionRule(versionRule);
        result.setDetailFields(detailFields);
        result.setNote(note);
        return result;
    }
}
