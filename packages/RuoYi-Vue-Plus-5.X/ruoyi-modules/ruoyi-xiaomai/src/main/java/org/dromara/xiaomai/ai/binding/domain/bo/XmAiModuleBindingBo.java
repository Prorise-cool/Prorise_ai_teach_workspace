package org.dromara.xiaomai.ai.binding.domain.bo;

import org.dromara.xiaomai.ai.binding.domain.XmAiModuleBinding;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.*;

/**
 * 模块阶段到运行资源的绑定关系业务对象 xm_ai_module_binding
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = XmAiModuleBinding.class, reverseConvertGenerate = false)
public class XmAiModuleBindingBo extends BaseEntity {

    /**
     * 主键
     */
    @NotNull(message = "主键不能为空", groups = { EditGroup.class })
    private Long id;

    /**
     * 关联模块主键
     */
    @NotNull(message = "关联模块主键不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long moduleId;

    /**
     * 阶段编码，如 storyboard/script/narration/companion/search
     */
    @NotBlank(message = "阶段编码，如 storyboard/script/narration/companion/search不能为空", groups = { AddGroup.class, EditGroup.class })
    private String stageCode;

    /**
     * 能力类型，llm/tts
     */
    @NotBlank(message = "能力类型，llm/tts不能为空", groups = { AddGroup.class, EditGroup.class })
    private String capability;

    /**
     * 角色编码，为空表示阶段默认链路
     */
    @NotBlank(message = "角色编码，为空表示阶段默认链路不能为空", groups = { AddGroup.class, EditGroup.class })
    private String roleCode;

    /**
     * 关联资源主键
     */
    @NotNull(message = "关联资源主键不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long resourceId;

    /**
     * 优先级，越小越优先
     */
    @NotNull(message = "优先级，越小越优先不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long priority;

    /**
     * 超时时间，单位秒
     */
    @NotNull(message = "超时时间，单位秒不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long timeoutSeconds;

    /**
     * 重试次数
     */
    @NotNull(message = "重试次数不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long retryAttempts;

    /**
     * 健康状态来源
     */
    @NotBlank(message = "健康状态来源不能为空", groups = { AddGroup.class, EditGroup.class })
    private String healthSource;

    /**
     * 运行时附加配置 JSON 字符串
     */
    private String runtimeSettingsJson;

    /**
     * 状态（0正常 1停用）
     */
    @NotBlank(message = "状态（0正常 1停用）不能为空", groups = { AddGroup.class, EditGroup.class })
    private String status;

    /**
     * 是否默认链路（Y/N）
     */
    @NotBlank(message = "是否默认链路（Y/N）不能为空", groups = { AddGroup.class, EditGroup.class })
    private String isDefault;

    /**
     * 备注
     */
    private String remark;


}
