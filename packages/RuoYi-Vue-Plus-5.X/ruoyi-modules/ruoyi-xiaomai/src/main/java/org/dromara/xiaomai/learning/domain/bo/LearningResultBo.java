package org.dromara.xiaomai.learning.domain.bo;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

/**
 * 学习结果查询对象。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class LearningResultBo extends BaseEntity {

    private String userId;
    private String resultType;
    private String sourceType;
    private String tableName;
    private String status;
    private String keyword;
    private java.util.Date beginSourceTime;
    private java.util.Date endSourceTime;
}
