package org.dromara.xiaomai.learningcenter.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.exception.ServiceException;
import cn.hutool.core.bean.BeanUtil;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterActionBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterQueryBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterRecordVo;
import org.dromara.xiaomai.learningcenter.mapper.LearningCenterMapper;
import org.dromara.xiaomai.learningcenter.service.ILearningCenterService;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 学习中心聚合查询服务实现。
 *
 * @author Codex
 */
@Service
@RequiredArgsConstructor
public class LearningCenterServiceImpl implements ILearningCenterService {

    private final LearningCenterMapper baseMapper;

    @Override
    public TableDataInfo<LearningCenterRecordVo> queryLearningPage(LearningCenterQueryBo bo, PageQuery pageQuery) {
        LearningCenterQueryBo query = copyQuery(bo);
        query.setFavoriteOnly(Boolean.FALSE);
        return queryPage(query, pageQuery);
    }

    @Override
    public TableDataInfo<LearningCenterRecordVo> queryHistoryPage(LearningCenterQueryBo bo, PageQuery pageQuery) {
        LearningCenterQueryBo query = copyQuery(bo);
        query.setFavoriteOnly(Boolean.FALSE);
        return queryPage(query, pageQuery);
    }

    @Override
    public TableDataInfo<LearningCenterRecordVo> queryFavoritePage(LearningCenterQueryBo bo, PageQuery pageQuery) {
        LearningCenterQueryBo query = copyQuery(bo);
        query.setFavoriteOnly(Boolean.TRUE);
        return queryPage(query, pageQuery);
    }

    @Override
    public Boolean favorite(LearningCenterActionBo bo) {
        LearningCenterRecordVo record = requireSourceRecord(bo);
        return baseMapper.upsertFavorite(record) > 0;
    }

    @Override
    public Boolean cancelFavorite(LearningCenterActionBo bo) {
        baseMapper.deactivateFavorite(bo.getUserId(), bo.getSourceTable(), bo.getSourceResultId());
        return true;
    }

    @Override
    public Boolean removeHistory(LearningCenterActionBo bo) {
        LearningCenterRecordVo record = requireSourceRecord(bo);
        return baseMapper.upsertDeletedRecord(record) > 0;
    }

    private TableDataInfo<LearningCenterRecordVo> queryPage(LearningCenterQueryBo bo, PageQuery pageQuery) {
        PageQuery query = pageQuery == null ? new PageQuery(PageQuery.DEFAULT_PAGE_SIZE, PageQuery.DEFAULT_PAGE_NUM) : pageQuery;
        Page<LearningCenterRecordVo> page = query.build();
        long total = baseMapper.countAggregateRecords(bo);
        if (total <= 0) {
            return new TableDataInfo<>(List.of(), 0);
        }
        long offset = (page.getCurrent() - 1) * page.getSize();
        List<LearningCenterRecordVo> rows = baseMapper.selectAggregateRecords(bo, offset, page.getSize());
        return new TableDataInfo<>(rows, total);
    }

    private LearningCenterRecordVo requireSourceRecord(LearningCenterActionBo bo) {
        LearningCenterRecordVo record = baseMapper.selectSourceRecord(bo.getUserId(), bo.getSourceTable(), bo.getSourceResultId());
        if (record == null) {
            throw new ServiceException("学习记录不存在或不属于当前用户");
        }
        return record;
    }

    private LearningCenterQueryBo copyQuery(LearningCenterQueryBo source) {
        return source == null ? new LearningCenterQueryBo() : BeanUtil.toBean(source, LearningCenterQueryBo.class);
    }
}
