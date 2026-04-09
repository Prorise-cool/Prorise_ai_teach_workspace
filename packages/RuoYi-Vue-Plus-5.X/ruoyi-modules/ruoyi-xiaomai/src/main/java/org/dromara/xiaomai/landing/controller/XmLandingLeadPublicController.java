package org.dromara.xiaomai.landing.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.ratelimiter.annotation.RateLimiter;
import org.dromara.xiaomai.landing.domain.bo.PublicLandingLeadSubmitBo;
import org.dromara.xiaomai.landing.domain.bo.XmLandingLeadBo;
import org.dromara.xiaomai.landing.domain.vo.CreateLandingLeadVo;
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
     * @param bo 线索提交请求
     * @return 线索受理结果
     */
    @Log(title = "营销落地页线索", businessType = BusinessType.INSERT)
    @RateLimiter(key = "landing_lead_submit", time = 60, count = 10)
    @RepeatSubmit
    @PostMapping
    public R<CreateLandingLeadVo> submitLead(@Valid @RequestBody PublicLandingLeadSubmitBo bo) {
        XmLandingLeadBo leadBo = new XmLandingLeadBo();
        leadBo.setContactName(StringUtils.trim(bo.getContactName()));
        leadBo.setOrganizationName(StringUtils.trimToNull(bo.getOrganizationName()));
        leadBo.setContactEmail(StringUtils.trim(bo.getContactEmail()));
        leadBo.setSubject(StringUtils.trim(bo.getSubject()));
        leadBo.setMessage(StringUtils.trim(bo.getMessage()));
        leadBo.setSourcePage(StringUtils.defaultIfBlank(StringUtils.trim(bo.getSourcePage()), DEFAULT_SOURCE_PAGE));
        leadBo.setSourceLocale(StringUtils.defaultIfBlank(StringUtils.trim(bo.getSourceLocale()), DEFAULT_SOURCE_LOCALE));
        leadBo.setProcessingStatus(DEFAULT_PROCESSING_STATUS);

        boolean inserted = xmLandingLeadService.insertByBo(leadBo);

        if (!inserted || leadBo.getId() == null) {
            return R.fail("线索提交失败，请稍后重试");
        }

        String acceptedMessage = "线索已受理";
        return R.ok(
            acceptedMessage,
            new CreateLandingLeadVo(String.valueOf(leadBo.getId()), Boolean.TRUE, acceptedMessage)
        );
    }
}
