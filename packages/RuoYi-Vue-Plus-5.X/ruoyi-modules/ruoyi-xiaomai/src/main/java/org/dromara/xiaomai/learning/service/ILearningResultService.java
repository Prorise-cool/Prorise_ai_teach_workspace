package org.dromara.xiaomai.learning.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learning.domain.bo.LearningResultBo;
import org.dromara.xiaomai.learning.domain.vo.LearningResultVo;

import java.util.List;

/**
 * 学习结果长期承接服务。
 *
 * @author Codex
 */
public interface ILearningResultService {

    List<LearningResultVo> queryCatalogList(LearningResultBo bo);

    TableDataInfo<LearningResultVo> queryResultPage(LearningResultBo bo, PageQuery pageQuery);
}
