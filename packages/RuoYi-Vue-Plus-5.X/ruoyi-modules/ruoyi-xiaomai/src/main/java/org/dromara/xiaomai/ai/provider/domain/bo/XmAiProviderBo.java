package org.dromara.xiaomai.ai.provider.domain.bo;

import org.dromara.xiaomai.ai.provider.domain.XmAiProvider;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.*;

/**
 * AI Provider 实例配置业务对象 xm_ai_provider
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = XmAiProvider.class, reverseConvertGenerate = false)
public class XmAiProviderBo extends BaseEntity {

    /**
     * 主键
     */
    @NotNull(message = "主键不能为空", groups = { EditGroup.class })
    private Long id;

    /**
     * Provider 实例编码，如 volcengine-prod
     */
    @NotBlank(message = "Provider 实例编码，如 volcengine-prod不能为空", groups = { AddGroup.class, EditGroup.class })
    private String providerCode;

    /**
     * Provider 实例名称
     */
    @NotBlank(message = "Provider 实例名称不能为空", groups = { AddGroup.class, EditGroup.class })
    private String providerName;

    /**
     * 供应商编码，如 volcengine/deepseek/openai
     */
    @NotBlank(message = "供应商编码，如 volcengine/deepseek/openai不能为空", groups = { AddGroup.class, EditGroup.class })
    private String vendorCode;

    /**
     * 鉴权类型，如 api_key/app_key_secret/access_token/custom
     */
    @NotBlank(message = "鉴权类型，如 api_key/app_key_secret/access_token/custom不能为空", groups = { AddGroup.class, EditGroup.class })
    private String authType;

    /**
     * 基础请求地址
     */
    private String endpointUrl;

    /**
     * 应用 ID
     */
    private String appId;

    /**
     * API Key（敏感）
     */
    private String apiKey;

    /**
     * API Secret（敏感）
     */
    private String apiSecret;

    /**
     * Access Token（敏感）
     */
    private String accessToken;

    /**
     * 扩展鉴权配置 JSON 字符串
     */
    private String extraAuthJson;

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
