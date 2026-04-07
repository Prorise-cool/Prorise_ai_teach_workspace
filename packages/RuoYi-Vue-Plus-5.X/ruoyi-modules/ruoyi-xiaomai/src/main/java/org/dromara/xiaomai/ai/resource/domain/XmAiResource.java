package org.dromara.xiaomai.ai.resource.domain;

import org.dromara.common.tenant.core.TenantEntity;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;

/**
 * AI 模型 / 音色等可调度资源对象 xm_ai_resource
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_ai_resource")
public class XmAiResource extends TenantEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @TableId(value = "id")
    private Long id;

    /**
     * 关联 Provider 主键
     */
    private Long providerId;

    /**
     * 能力类型，llm/tts
     */
    private String capability;

    /**
     * 资源编码
     */
    private String resourceCode;

    /**
     * 资源名称
     */
    private String resourceName;

    /**
     * 资源类型，如 chat/reasoning/vision/voice
     */
    private String resourceType;

    /**
     * FastAPI 运行时 Provider ID，需符合 vendor-model_or_voice 规范
     */
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
    private String status;

    /**
     * 排序号
     */
    private Long sortOrder;

    /**
     * 备注
     */
    private String remark;

    /**
     * 删除标志（0代表存在 1代表删除）
     */
    @TableLogic
    private String delFlag;


}
