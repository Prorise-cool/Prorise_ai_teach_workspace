package org.dromara.xiaomai.learning.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learning.domain.bo.LearningResultBo;
import org.dromara.xiaomai.learning.domain.vo.LearningResultVo;
import org.dromara.xiaomai.learning.domain.vo.QuizHistoryVo;

import java.util.List;

/**
 * 学习结果长期承接服务。
 *
 * @author Codex
 */
public interface ILearningResultService {

    List<LearningResultVo> queryCatalogList(LearningResultBo bo);

    TableDataInfo<LearningResultVo> queryResultPage(LearningResultBo bo, PageQuery pageQuery);

    /**
     * 根据 quizId（对应 xm_quiz_result.source_result_id 或 detail_ref）回看一次测验明细。
     *
     * @param quizId 前端从 learning-center 记录卡片传入的 quizId
     * @return 历史明细，未找到时返回 null（Controller 负责转 404）
     */
    QuizHistoryVo queryQuizHistory(String quizId);
}
