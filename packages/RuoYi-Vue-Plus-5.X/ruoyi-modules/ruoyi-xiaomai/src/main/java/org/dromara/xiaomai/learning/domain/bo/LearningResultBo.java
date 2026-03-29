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

    private String resultType;
    private String sourceType;
    private String tableName;
    private String statusRule;
    private String versionRule;
}
