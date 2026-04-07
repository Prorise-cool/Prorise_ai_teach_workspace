package org.dromara.xiaomai.ai.module.domain.bo;

import org.dromara.xiaomai.ai.module.domain.XmAiModule;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.*;

/**
 * AI 配置模块主数据业务对象 xm_ai_module
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = XmAiModule.class, reverseConvertGenerate = false)
public class XmAiModuleBo extends BaseEntity {

    /**
     * 主键
     */
    @NotNull(message = "主键不能为空", groups = { EditGroup.class })
    private Long id;

    /**
     * 模块编码，如 video/classroom/companion/knowledge/learning
     */
    @NotBlank(message = "模块编码，如 video/classroom/companion/knowledge/learning不能为空", groups = { AddGroup.class, EditGroup.class })
    private String moduleCode;

    /**
     * 模块名称
     */
    @NotBlank(message = "模块名称不能为空", groups = { AddGroup.class, EditGroup.class })
    private String moduleName;

    /**
     * 状态（0正常 1停用）
     */
    @NotBlank(message = "状态（0正常 1停用）不能为空", groups = { AddGroup.class, EditGroup.class })
    private String status;

    /**
     * 排序号
     */
    @NotNull(message = "排序号不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long sortOrder;

    /**
     * 备注
     */
    private String remark;


}
