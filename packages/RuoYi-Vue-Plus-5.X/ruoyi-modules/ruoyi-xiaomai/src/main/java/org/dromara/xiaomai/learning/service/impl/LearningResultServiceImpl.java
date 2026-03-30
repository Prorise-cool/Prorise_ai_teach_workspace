package org.dromara.xiaomai.learning.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learning.domain.bo.LearningResultBo;
import org.dromara.xiaomai.learning.domain.vo.LearningResultVo;
import org.dromara.xiaomai.learning.mapper.LearningResultMapper;
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

    private final LearningResultMapper baseMapper;

    @Override
    public List<LearningResultVo> queryCatalogList(LearningResultBo bo) {
        return baseMapper.selectCatalogRecords(bo == null ? new LearningResultBo() : bo);
    }

    @Override
    public TableDataInfo<LearningResultVo> queryResultPage(LearningResultBo bo, PageQuery pageQuery) {
        PageQuery query = pageQuery == null ? new PageQuery(PageQuery.DEFAULT_PAGE_SIZE, PageQuery.DEFAULT_PAGE_NUM) : pageQuery;
        Page<LearningResultVo> page = query.build();
        long total = baseMapper.countResultRecords(bo == null ? new LearningResultBo() : bo);
        if (total <= 0) {
            return new TableDataInfo<>(List.of(), 0);
        }
        long offset = (page.getCurrent() - 1) * page.getSize();
        List<LearningResultVo> rows = baseMapper.selectResultRecords(bo == null ? new LearningResultBo() : bo, offset, page.getSize());
        return new TableDataInfo<>(rows, total);
    }
}
