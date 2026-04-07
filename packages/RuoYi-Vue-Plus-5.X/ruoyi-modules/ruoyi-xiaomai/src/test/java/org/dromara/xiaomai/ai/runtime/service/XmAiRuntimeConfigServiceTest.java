package org.dromara.xiaomai.ai.runtime.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.xiaomai.ai.runtime.domain.vo.XmAiRuntimeBindingRowVo;
import org.dromara.xiaomai.ai.runtime.domain.vo.XmAiRuntimeConfigVo;
import org.dromara.xiaomai.ai.runtime.mapper.XmAiRuntimeConfigMapper;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * AI runtime internal 查询服务测试。
 *
 * @author Codex
 */
@Tag("dev")
@Tag("local")
public class XmAiRuntimeConfigServiceTest {

    @Test
    void shouldAggregateRuntimeBindingsForFastapi() {
        XmAiRuntimeConfigMapper mapper = mock(XmAiRuntimeConfigMapper.class);
        XmAiRuntimeConfigService service = new XmAiRuntimeConfigService(mapper, new ObjectMapper());

        XmAiRuntimeBindingRowVo row = new XmAiRuntimeBindingRowVo();
        row.setModuleCode("video");
        row.setModuleName("视频生成");
        row.setStageCode("understanding");
        row.setCapability("llm");
        row.setProviderId("openai-gemini-3_1-pro-high");
        row.setPriority(1L);
        row.setTimeoutSeconds(120L);
        row.setRetryAttempts(1L);
        row.setHealthSource("ruoyi");
        row.setIsDefault("N");
        row.setVendorCode("openai");
        row.setAuthType("api_key");
        row.setEndpointUrl("https://synai996.space/");
        row.setApiKey("sk-local");
        row.setResourceCode("gemini-3-1-pro-high");
        row.setResourceName("Gemini 3.1 Pro High");
        row.setResourceType("reasoning");
        row.setModelName("gemini-3.1-pro-high");
        row.setResourceSettingsJson("{\"providerType\":\"openai-compatible\"}");
        row.setRuntimeSettingsJson("{\"temperature\":0.1}");

        when(mapper.selectModuleRuntimeBindings("000000", "video")).thenReturn(List.of(row));

        XmAiRuntimeConfigVo result = service.queryModuleRuntime("video");

        assertNotNull(result);
        assertEquals("video", result.getModuleCode());
        assertEquals(1, result.getBindings().size());
        assertEquals("openai-compatible", result.getBindings().get(0).getProviderType());
        assertEquals("gemini-3.1-pro-high", result.getBindings().get(0).getModelName());
        assertEquals(0.1d, result.getBindings().get(0).getRuntimeSettings().get("temperature"));
    }
}
