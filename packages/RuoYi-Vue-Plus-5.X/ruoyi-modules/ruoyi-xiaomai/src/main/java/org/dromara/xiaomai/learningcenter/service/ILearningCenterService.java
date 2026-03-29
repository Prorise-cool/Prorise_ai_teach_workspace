package org.dromara.xiaomai.learningcenter.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterActionBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterQueryBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterRecordVo;

/**
 * 学习中心聚合查询服务。
 *
 * @author Codex
 */
public interface ILearningCenterService {

    TableDataInfo<LearningCenterRecordVo> queryLearningPage(LearningCenterQueryBo bo, PageQuery pageQuery);

    TableDataInfo<LearningCenterRecordVo> queryHistoryPage(LearningCenterQueryBo bo, PageQuery pageQuery);

    TableDataInfo<LearningCenterRecordVo> queryFavoritePage(LearningCenterQueryBo bo, PageQuery pageQuery);

    Boolean favorite(LearningCenterActionBo bo);

    Boolean cancelFavorite(LearningCenterActionBo bo);

    Boolean removeHistory(LearningCenterActionBo bo);
}
