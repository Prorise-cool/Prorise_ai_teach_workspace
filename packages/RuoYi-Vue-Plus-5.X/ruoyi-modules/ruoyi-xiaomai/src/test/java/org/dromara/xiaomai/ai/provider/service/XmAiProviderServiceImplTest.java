package org.dromara.xiaomai.ai.provider.service;

import org.dromara.xiaomai.ai.provider.domain.XmAiProvider;
import org.dromara.xiaomai.ai.provider.domain.bo.XmAiProviderBo;
import org.dromara.xiaomai.ai.provider.domain.vo.XmAiProviderVo;
import org.dromara.xiaomai.ai.provider.mapper.XmAiProviderMapper;
import org.dromara.xiaomai.ai.provider.service.impl.XmAiProviderServiceImpl;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * AI Provider 服务测试。
 *
 * @author Codex
 */
@Tag("dev")
@Tag("local")
public class XmAiProviderServiceImplTest {

    @Test
    void shouldKeepStoredSecretsWhenUpdatePayloadLeavesThemBlank() {
        XmAiProviderMapper mapper = mock(XmAiProviderMapper.class);
        XmAiProviderServiceImpl service = new XmAiProviderServiceImpl(mapper);

        XmAiProvider current = new XmAiProvider();
        current.setId(1001L);
        current.setApiKey("stored-key");
        current.setApiSecret("stored-secret");
        current.setAccessToken("stored-token");

        XmAiProviderBo bo = new XmAiProviderBo();
        bo.setId(1001L);
        bo.setProviderCode("openai-prod");
        bo.setProviderName("OpenAI 生产");
        bo.setVendorCode("openai");
        bo.setAuthType("api_key");
        bo.setApiKey("");
        bo.setApiSecret(" ");
        bo.setAccessToken(null);
        bo.setStatus("0");
        bo.setSortOrder(10L);

        when(mapper.selectById(1001L)).thenReturn(current);
        when(mapper.updateById(any(XmAiProvider.class))).thenReturn(1);

        boolean updated = service.updateByBo(bo);

        ArgumentCaptor<XmAiProvider> captor = ArgumentCaptor.forClass(XmAiProvider.class);
        verify(mapper).updateById(captor.capture());

        XmAiProvider persisted = captor.getValue();
        assertTrue(updated);
        assertEquals("stored-key", persisted.getApiKey());
        assertEquals("stored-secret", persisted.getApiSecret());
        assertEquals("stored-token", persisted.getAccessToken());
        assertEquals("OpenAI 生产", persisted.getProviderName());
    }

    @Test
    void shouldReturnFalseWhenUpdatingMissingProvider() {
        XmAiProviderMapper mapper = mock(XmAiProviderMapper.class);
        XmAiProviderServiceImpl service = new XmAiProviderServiceImpl(mapper);
        XmAiProviderBo bo = new XmAiProviderBo();
        bo.setId(404L);

        when(mapper.selectById(404L)).thenReturn(null);

        assertFalse(service.updateByBo(bo));
    }

    @Test
    void shouldMaskSensitiveFieldsInDetailQuery() {
        XmAiProviderMapper mapper = mock(XmAiProviderMapper.class);
        XmAiProviderServiceImpl service = new XmAiProviderServiceImpl(mapper);
        XmAiProviderVo vo = new XmAiProviderVo();
        vo.setId(2001L);
        vo.setApiKey("provider-api-key");
        vo.setApiSecret("provider-api-secret");
        vo.setAccessToken("provider-access-token");

        when(mapper.selectVoById(2001L)).thenReturn(vo);

        XmAiProviderVo result = service.queryById(2001L);

        assertNotNull(result);
        assertTrue(result.getApiKey().endsWith("-key"));
        assertTrue(result.getApiSecret().endsWith("cret"));
        assertTrue(result.getAccessToken().endsWith("oken"));
        assertTrue(result.getApiKey().startsWith("*"));
        assertTrue(result.getApiSecret().startsWith("*"));
        assertTrue(result.getAccessToken().startsWith("*"));
    }

    @Test
    void shouldMaskShortSecretsWithoutLeakingPlaintext() {
        XmAiProviderMapper mapper = mock(XmAiProviderMapper.class);
        XmAiProviderServiceImpl service = new XmAiProviderServiceImpl(mapper);
        XmAiProviderVo vo = new XmAiProviderVo();
        vo.setId(2002L);
        vo.setApiKey("abc");
        vo.setApiSecret("z");
        vo.setAccessToken("12");

        when(mapper.selectVoById(2002L)).thenReturn(vo);

        XmAiProviderVo result = service.queryById(2002L);

        assertNotNull(result);
        assertEquals("**c", result.getApiKey());
        assertEquals("*", result.getApiSecret());
        assertEquals("*2", result.getAccessToken());
    }
}
