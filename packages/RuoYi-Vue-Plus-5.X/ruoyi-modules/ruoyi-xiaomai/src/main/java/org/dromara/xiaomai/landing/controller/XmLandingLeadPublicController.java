package org.dromara.xiaomai.landing.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.xiaomai.landing.domain.bo.XmLandingLeadBo;
import org.dromara.xiaomai.landing.service.IXmLandingLeadService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 落地页匿名线索提交通道。
 *
 * <p>供 student-web 营销落地页直接调用，不要求登录态。</p>
 *
 * @author Codex
 */
@SaIgnore
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/public/landing-leads")
public class XmLandingLeadPublicController {

    private static final String DEFAULT_SOURCE_PAGE = "/landing";

    private static final String DEFAULT_SOURCE_LOCALE = "zh-CN";

    private static final String DEFAULT_PROCESSING_STATUS = "pending";

    private final IXmLandingLeadService xmLandingLeadService;

    /**
     * 匿名提交落地页线索。
     *
     * @param request 线索提交请求
     * @return 线索受理结果
     */
    @Log(title = "营销落地页线索", businessType = BusinessType.INSERT)
    @RepeatSubmit
    @PostMapping
    public R<CreateLandingLeadResponse> submitLead(@Valid @RequestBody PublicLandingLeadSubmitRequest request) {
        XmLandingLeadBo bo = new XmLandingLeadBo();
        bo.setContactName(StringUtils.trim(request.contactName()));
        bo.setOrganizationName(StringUtils.trimToNull(request.organizationName()));
        bo.setContactEmail(StringUtils.trim(request.contactEmail()));
        bo.setSubject(StringUtils.trim(request.subject()));
        bo.setMessage(StringUtils.trim(request.message()));
        bo.setSourcePage(StringUtils.defaultIfBlank(StringUtils.trim(request.sourcePage()), DEFAULT_SOURCE_PAGE));
        bo.setSourceLocale(StringUtils.defaultIfBlank(StringUtils.trim(request.sourceLocale()), DEFAULT_SOURCE_LOCALE));
        bo.setProcessingStatus(DEFAULT_PROCESSING_STATUS);

        boolean inserted = xmLandingLeadService.insertByBo(bo);

        if (!inserted || bo.getId() == null) {
            return R.fail("线索提交失败，请稍后重试");
        }

        String acceptedMessage = "线索已受理";
        return R.ok(
            acceptedMessage,
            new CreateLandingLeadResponse(String.valueOf(bo.getId()), Boolean.TRUE, acceptedMessage)
        );
    }

    /**
     * 匿名线索提交通道请求体。
     */
    public record PublicLandingLeadSubmitRequest(
        @NotBlank(message = "联系人姓名不能为空")
        String contactName,
        String organizationName,
        @NotBlank(message = "联系邮箱不能为空")
        @Email(message = "联系邮箱格式不正确")
        String contactEmail,
        @NotBlank(message = "咨询主题不能为空")
        String subject,
        @NotBlank(message = "留言内容不能为空")
        String message,
        String sourcePage,
        String sourceLocale
    ) {
    }

    /**
     * 匿名线索提交结果。
     */
    public record CreateLandingLeadResponse(
        String leadId,
        Boolean accepted,
        String message
    ) {
    }
}
