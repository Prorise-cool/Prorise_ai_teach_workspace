package org.dromara.xiaomai.domain.bo;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

/**
 * 小麦模块资源查询对象。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class XmModuleResourceBo extends BaseEntity {

    /**
     * 资源唯一键。
     */
    private String resourceKey;

    /**
     * 权限前缀。
     */
    private String permissionPrefix;

    /**
     * 接入模式。
     */
    private String accessMode;

    /**
     * 生成策略。
     */
    private String implementationMode;
}
