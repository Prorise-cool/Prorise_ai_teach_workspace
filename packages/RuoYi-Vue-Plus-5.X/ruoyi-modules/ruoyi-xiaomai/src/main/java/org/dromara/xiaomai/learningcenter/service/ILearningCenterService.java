package org.dromara.xiaomai.learningcenter.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterActionBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterQueryBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterRecordVo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterSummaryVo;

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

    /**
     * 学习中心聚合摘要（TASK-009）：侧边栏三张卡一次取齐。
     *
     * @param userId 当前登录用户 ID；null/空抛 ServiceException
     * @return 聚合 VO；任一字段上游无数据时保持 null，不硬编码占位
     */
    LearningCenterSummaryVo querySummary(String userId);
}
