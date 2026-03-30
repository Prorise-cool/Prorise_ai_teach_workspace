package org.dromara.xiaomai.audit.domain.bo;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.springframework.format.annotation.DateTimeFormat;

import java.io.Serial;
import java.util.Date;

/**
 * 审计中心查询对象。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class AuditRecordBo extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    private String userId;

    private String resultType;

    private String sourceType;

    private String sourceTable;

    private String status;

    private String keyword;

    private Boolean favorite;

    private Boolean deleted;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date beginSourceTime;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date endSourceTime;
}
