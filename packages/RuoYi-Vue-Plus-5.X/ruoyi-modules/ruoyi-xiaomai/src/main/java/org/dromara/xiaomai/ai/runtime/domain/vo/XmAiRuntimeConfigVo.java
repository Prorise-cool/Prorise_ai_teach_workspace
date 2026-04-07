package org.dromara.xiaomai.ai.runtime.domain.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;
import java.util.Map;

/**
 * FastAPI 消费的 AI runtime 模块配置视图。
 *
 * @author Codex
 */
@Data
public class XmAiRuntimeConfigVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String moduleCode;
    private String moduleName;
    private List<Binding> bindings;

    /**
     * AI runtime 绑定明细。
     */
    @Data
    public static class Binding implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        private String stageCode;
        private String capability;
        private String roleCode;
        private String providerId;
        private Long priority;
        private Long timeoutSeconds;
        private Long retryAttempts;
        private String healthSource;
        private Boolean isDefault;
        private String providerType;
        private String providerCode;
        private String providerName;
        private String vendorCode;
        private String authType;
        private String endpointUrl;
        private String appId;
        private String apiKey;
        private String apiSecret;
        private String accessToken;
        private String resourceCode;
        private String resourceName;
        private String resourceType;
        private String modelName;
        private String voiceCode;
        private String languageCode;
        private Map<String, Object> extraAuth;
        private Map<String, Object> resourceSettings;
        private Map<String, Object> runtimeSettings;
    }
}
