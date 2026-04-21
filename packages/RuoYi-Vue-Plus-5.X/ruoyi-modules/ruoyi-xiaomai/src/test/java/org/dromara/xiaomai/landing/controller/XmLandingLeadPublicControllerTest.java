package org.dromara.xiaomai.landing.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.dromara.common.core.domain.R;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.xiaomai.landing.domain.bo.PublicLandingLeadSubmitBo;
import org.dromara.xiaomai.landing.domain.bo.XmLandingLeadBo;
import org.dromara.xiaomai.landing.domain.vo.CreateLandingLeadVo;
import org.dromara.xiaomai.landing.service.IXmLandingLeadService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 营销落地页匿名提交通道测试。
 *
 * @author Codex
 */
@Tag("dev")
@Tag("local")
public class XmLandingLeadPublicControllerTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void shouldFreezeAnonymousPublicSubmitContract() throws NoSuchMethodException {
        RequestMapping requestMapping = XmLandingLeadPublicController.class.getAnnotation(RequestMapping.class);
        Method submitLead = XmLandingLeadPublicController.class.getMethod("submitLead", PublicLandingLeadSubmitBo.class);

        assertNotNull(XmLandingLeadPublicController.class.getAnnotation(SaIgnore.class));
        assertNotNull(requestMapping);
        assertArrayEquals(new String[]{"/api/public/landing-leads"}, requestMapping.value());
        assertNotNull(submitLead.getAnnotation(RepeatSubmit.class));
        assertNotNull(submitLead.getAnnotation(PostMapping.class));
    }

    @Test
    void shouldRejectInvalidSubmitRequestByBeanValidation() {
        PublicLandingLeadSubmitBo request = new PublicLandingLeadSubmitBo();
        request.setContactName("");
        request.setOrganizationName(null);
        request.setContactEmail("not-an-email");
        request.setSubject("");
        request.setMessage("");
        request.setSourcePage(null);
        request.setSourceLocale(null);

        Set<String> violationFields = validator.validate(request).stream()
            .map(violation -> violation.getPropertyPath().toString())
            .collect(Collectors.toSet());

        assertEquals(Set.of("contactName", "contactEmail", "subject", "message"), violationFields);
    }

    @Test
    void shouldTrimPayloadAndReturnAcceptedLeadIdOnSuccess() {
        IXmLandingLeadService service = mock(IXmLandingLeadService.class);
        XmLandingLeadPublicController controller = new XmLandingLeadPublicController(service);
        when(service.insertByBo(any(XmLandingLeadBo.class))).thenAnswer(invocation -> {
            XmLandingLeadBo bo = invocation.getArgument(0);
            bo.setId(2001L);
            return true;
        });

        PublicLandingLeadSubmitBo request = new PublicLandingLeadSubmitBo();
        request.setContactName(" 小林 ");
        request.setOrganizationName(" 计算机学院 ");
        request.setContactEmail(" pilot@example.com ");
        request.setSubject(" 教师试点合作 ");
        request.setMessage(" 希望了解试点方案 ");
        request.setSourcePage(" ");
        request.setSourceLocale(null);

        R<CreateLandingLeadVo> response = controller.submitLead(request);

        ArgumentCaptor<XmLandingLeadBo> boCaptor = ArgumentCaptor.forClass(XmLandingLeadBo.class);
        verify(service).insertByBo(boCaptor.capture());

        XmLandingLeadBo submitted = boCaptor.getValue();
        assertEquals("小林", submitted.getContactName());
        assertEquals("计算机学院", submitted.getOrganizationName());
        assertEquals("pilot@example.com", submitted.getContactEmail());
        assertEquals("教师试点合作", submitted.getSubject());
        assertEquals("希望了解试点方案", submitted.getMessage());
        assertEquals("/landing", submitted.getSourcePage());
        assertEquals("zh-CN", submitted.getSourceLocale());
        assertEquals("pending", submitted.getProcessingStatus());

        assertEquals(R.SUCCESS, response.getCode());
        assertEquals("线索已受理", response.getMsg());
        assertNotNull(response.getData());
        assertEquals("2001", response.getData().getLeadId());
        assertTrue(response.getData().getAccepted());
    }

    @Test
    void shouldReturnFailEnvelopeWhenInsertDoesNotProduceId() {
        IXmLandingLeadService service = mock(IXmLandingLeadService.class);
        XmLandingLeadPublicController controller = new XmLandingLeadPublicController(service);
        when(service.insertByBo(any(XmLandingLeadBo.class))).thenReturn(false);

        PublicLandingLeadSubmitBo request = new PublicLandingLeadSubmitBo();
        request.setContactName("小林");
        request.setOrganizationName(null);
        request.setContactEmail("pilot@example.com");
        request.setSubject("教师试点合作");
        request.setMessage("希望了解试点方案");
        request.setSourcePage("/landing");
        request.setSourceLocale("zh-CN");

        R<CreateLandingLeadVo> response = controller.submitLead(request);

        assertEquals(R.FAIL, response.getCode());
        assertEquals("线索提交失败，请稍后重试", response.getMsg());
    }
}
