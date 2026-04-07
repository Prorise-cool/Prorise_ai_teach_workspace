package org.dromara.xiaomai.ai.resource.domain.bo;

import org.dromara.xiaomai.ai.resource.domain.XmAiResource;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.*;

/**
 * AI 模型 / 音色等可调度资源业务对象 xm_ai_resource
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = XmAiResource.class, reverseConvertGenerate = false)
public class XmAiResourceBo extends BaseEntity {

    /**
     * 主键
     */
    @NotNull(message = "主键不能为空", groups = { EditGroup.class })
    private Long id;

    /**
     * 关联 Provider 主键
     */
    @NotNull(message = "关联 Provider 主键不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long providerId;

    /**
     * 能力类型，llm/tts
     */
    @NotBlank(message = "能力类型，llm/tts不能为空", groups = { AddGroup.class, EditGroup.class })
    private String capability;

    /**
     * 资源编码
     */
    @NotBlank(message = "资源编码不能为空", groups = { AddGroup.class, EditGroup.class })
    private String resourceCode;

    /**
     * 资源名称
     */
    @NotBlank(message = "资源名称不能为空", groups = { AddGroup.class, EditGroup.class })
    private String resourceName;

    /**
     * 资源类型，如 chat/reasoning/vision/voice
     */
    private String resourceType;

    /**
     * FastAPI 运行时 Provider ID，需符合 vendor-model_or_voice 规范
     */
    @NotBlank(message = "FastAPI 运行时 Provider ID，需符合 vendor-model_or_voice 规范不能为空", groups = { AddGroup.class, EditGroup.class })
    private String runtimeProviderId;

    /**
     * 上游模型名称
     */
    private String modelName;

    /**
     * 音色编码，TTS 使用
     */
    private String voiceCode;

    /**
     * 语言编码
     */
    private String languageCode;

    /**
     * 资源级扩展配置 JSON 字符串
     */
    private String resourceSettingsJson;

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
