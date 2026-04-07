package org.dromara.xiaomai.ai.runtime.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.xiaomai.ai.runtime.domain.vo.XmAiRuntimeBindingRowVo;
import org.dromara.xiaomai.ai.runtime.domain.vo.XmAiRuntimeConfigVo;
import org.dromara.xiaomai.ai.runtime.mapper.XmAiRuntimeConfigMapper;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AI runtime internal 查询服务。
 *
 * @author Codex
 */
@Service
@RequiredArgsConstructor
public class XmAiRuntimeConfigService {

    private static final String DEFAULT_TENANT_ID = "000000";

    private final XmAiRuntimeConfigMapper xmAiRuntimeConfigMapper;
    private final ObjectMapper objectMapper;

    public XmAiRuntimeConfigVo queryModuleRuntime(String moduleCode) {
        List<XmAiRuntimeBindingRowVo> rows = xmAiRuntimeConfigMapper.selectModuleRuntimeBindings(
            DEFAULT_TENANT_ID,
            moduleCode
        );
        if (rows == null || rows.isEmpty()) {
            return null;
        }

        XmAiRuntimeConfigVo result = new XmAiRuntimeConfigVo();
        result.setModuleCode(rows.get(0).getModuleCode());
        result.setModuleName(rows.get(0).getModuleName());
        result.setBindings(rows.stream().map(this::toBinding).toList());
        return result;
    }

    private XmAiRuntimeConfigVo.Binding toBinding(XmAiRuntimeBindingRowVo row) {
        Map<String, Object> resourceSettings = readJsonMap(row.getResourceSettingsJson());
        Map<String, Object> runtimeSettings = readJsonMap(row.getRuntimeSettingsJson());

        XmAiRuntimeConfigVo.Binding binding = new XmAiRuntimeConfigVo.Binding();
        binding.setStageCode(row.getStageCode());
        binding.setCapability(row.getCapability());
        binding.setRoleCode(row.getRoleCode());
        binding.setProviderId(row.getProviderId());
        binding.setPriority(row.getPriority());
        binding.setTimeoutSeconds(row.getTimeoutSeconds());
        binding.setRetryAttempts(row.getRetryAttempts());
        binding.setHealthSource(row.getHealthSource());
        binding.setIsDefault("Y".equalsIgnoreCase(row.getIsDefault()));
        binding.setProviderType(resolveProviderType(row, resourceSettings, runtimeSettings));
        binding.setProviderCode(row.getProviderCode());
        binding.setProviderName(row.getProviderName());
        binding.setVendorCode(row.getVendorCode());
        binding.setAuthType(row.getAuthType());
        binding.setEndpointUrl(row.getEndpointUrl());
        binding.setAppId(row.getAppId());
        binding.setApiKey(row.getApiKey());
        binding.setApiSecret(row.getApiSecret());
        binding.setAccessToken(row.getAccessToken());
        binding.setResourceCode(row.getResourceCode());
        binding.setResourceName(row.getResourceName());
        binding.setResourceType(row.getResourceType());
        binding.setModelName(row.getModelName());
        binding.setVoiceCode(row.getVoiceCode());
        binding.setLanguageCode(row.getLanguageCode());
        binding.setExtraAuth(readJsonMap(row.getExtraAuthJson()));
        binding.setResourceSettings(resourceSettings);
        binding.setRuntimeSettings(runtimeSettings);
        return binding;
    }

    private String resolveProviderType(
        XmAiRuntimeBindingRowVo row,
        Map<String, Object> resourceSettings,
        Map<String, Object> runtimeSettings
    ) {
        String providerType = readString(runtimeSettings.get("providerType"));
        if (StringUtils.isNotBlank(providerType)) {
            return providerType;
        }
        providerType = readString(resourceSettings.get("providerType"));
        if (StringUtils.isNotBlank(providerType)) {
            return providerType;
        }
        if ("llm".equalsIgnoreCase(row.getCapability()) && "openai".equalsIgnoreCase(row.getVendorCode())) {
            return "openai-compatible";
        }
        return "";
    }

    private Map<String, Object> readJsonMap(String rawJson) {
        if (StringUtils.isBlank(rawJson)) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(rawJson, new TypeReference<LinkedHashMap<String, Object>>() {
            });
        } catch (Exception exc) {
            throw new ServiceException("AI runtime 配置 JSON 解析失败");
        }
    }

    private String readString(Object value) {
        return value instanceof String stringValue ? stringValue : "";
    }
}
