package org.dromara.xiaomai.audit.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.audit.domain.bo.AuditRecordBo;
import org.dromara.xiaomai.audit.domain.vo.AuditRecordVo;
import org.dromara.xiaomai.audit.mapper.AuditCenterMapper;
import org.dromara.xiaomai.audit.service.IAuditCenterService;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

/**
 * 审计中心服务实现。
 *
 * @author Codex
 */
@Service
@RequiredArgsConstructor
public class AuditCenterServiceImpl implements IAuditCenterService {

    static final int MAX_EXPORT_ROWS = 2000;
    static final long MAX_EXPORT_WINDOW_DAYS = 31L;

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
        AuditRecordBo query = copyQuery(bo);
        validateExportQuery(query);
        long total = baseMapper.countAuditRecords(query);
        if (total <= 0) {
            return List.of();
        }
        if (total > MAX_EXPORT_ROWS) {
            throw new ServiceException("导出记录数超过上限 2000 条，请缩小筛选范围");
        }
        return baseMapper.selectAuditList(query, MAX_EXPORT_ROWS);
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

    private void validateExportQuery(AuditRecordBo query) {
        if (query.getBeginSourceTime() == null || query.getEndSourceTime() == null) {
            throw new ServiceException("导出必须同时指定开始时间和结束时间");
        }
        if (query.getEndSourceTime().before(query.getBeginSourceTime())) {
            throw new ServiceException("导出结束时间不能早于开始时间");
        }
        long windowMillis = query.getEndSourceTime().getTime() - query.getBeginSourceTime().getTime();
        if (windowMillis > Duration.ofDays(MAX_EXPORT_WINDOW_DAYS).toMillis()) {
            throw new ServiceException("导出时间范围不能超过 31 天");
        }
    }
}
