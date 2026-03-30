package org.dromara.xiaomai.audit.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.audit.domain.bo.AuditRecordBo;
import org.dromara.xiaomai.audit.domain.vo.AuditRecordVo;

import java.util.List;

/**
 * 审计中心服务。
 *
 * @author Codex
 */
public interface IAuditCenterService {

    TableDataInfo<AuditRecordVo> queryPage(AuditRecordBo bo, PageQuery pageQuery);

    List<AuditRecordVo> queryList(AuditRecordBo bo);

    AuditRecordVo queryDetail(String userId, String sourceTable, String sourceResultId);
}
