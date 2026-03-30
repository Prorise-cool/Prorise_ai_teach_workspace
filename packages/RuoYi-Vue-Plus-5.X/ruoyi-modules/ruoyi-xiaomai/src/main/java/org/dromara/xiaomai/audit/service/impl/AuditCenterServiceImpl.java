package org.dromara.xiaomai.audit.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.audit.domain.bo.AuditRecordBo;
import org.dromara.xiaomai.audit.domain.vo.AuditRecordVo;
import org.dromara.xiaomai.audit.mapper.AuditCenterMapper;
import org.dromara.xiaomai.audit.service.IAuditCenterService;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 审计中心服务实现。
 *
 * @author Codex
 */
@Service
@RequiredArgsConstructor
public class AuditCenterServiceImpl implements IAuditCenterService {

    private final AuditCenterMapper baseMapper;

    @Override
    public TableDataInfo<AuditRecordVo> queryPage(AuditRecordBo bo, PageQuery pageQuery) {
        AuditRecordBo query = copyQuery(bo);
        PageQuery pageable = pageQuery == null ? new PageQuery(10, 1) : pageQuery;
        Page<AuditRecordVo> page = pageable.build();
        long total = baseMapper.countAuditRecords(query);
        if (total <= 0) {
            return new TableDataInfo<>(List.of(), 0);
        }
        long offset = (page.getCurrent() - 1) * page.getSize();
        List<AuditRecordVo> rows = baseMapper.selectAuditRecords(query, offset, page.getSize());
        return new TableDataInfo<>(rows, total);
    }

    @Override
    public List<AuditRecordVo> queryList(AuditRecordBo bo) {
        return baseMapper.selectAuditList(copyQuery(bo));
    }

    @Override
    public AuditRecordVo queryDetail(String userId, String sourceTable, String sourceResultId) {
        return baseMapper.selectAuditDetail(userId, sourceTable, sourceResultId);
    }

    private AuditRecordBo copyQuery(AuditRecordBo bo) {
        AuditRecordBo query = new AuditRecordBo();
        if (bo == null) {
            return query;
        }
        query.setUserId(bo.getUserId());
        query.setResultType(bo.getResultType());
        query.setSourceType(bo.getSourceType());
        query.setSourceTable(bo.getSourceTable());
        query.setStatus(bo.getStatus());
        query.setKeyword(bo.getKeyword());
        query.setFavorite(bo.getFavorite());
        query.setDeleted(bo.getDeleted());
        query.setBeginSourceTime(bo.getBeginSourceTime());
        query.setEndSourceTime(bo.getEndSourceTime());
        return query;
    }
}
