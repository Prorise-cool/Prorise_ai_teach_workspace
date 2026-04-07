package org.dromara.xiaomai.ai.runtime.domain.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * AI runtime 聚合查询行对象。
 *
 * @author Codex
 */
@Data
public class XmAiRuntimeBindingRowVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String moduleCode;
    private String moduleName;
    private String stageCode;
    private String capability;
    private String roleCode;
    private Long priority;
    private Long timeoutSeconds;
    private Long retryAttempts;
    private String healthSource;
    private String isDefault;
    private String runtimeSettingsJson;
    private String resourceCode;
    private String resourceName;
    private String resourceType;
    private String providerId;
    private String modelName;
    private String voiceCode;
    private String languageCode;
    private String resourceSettingsJson;
    private String providerCode;
    private String providerName;
    private String vendorCode;
    private String authType;
    private String endpointUrl;
    private String appId;
    private String apiKey;
    private String apiSecret;
    private String accessToken;
    private String extraAuthJson;
}
