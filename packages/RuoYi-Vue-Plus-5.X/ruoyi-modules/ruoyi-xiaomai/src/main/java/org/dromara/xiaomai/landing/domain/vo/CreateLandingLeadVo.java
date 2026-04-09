package org.dromara.xiaomai.landing.domain.vo;

import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;

/**
 * 匿名线索提交结果。
 *
 * @author Codex
 */
@Data
public class CreateLandingLeadVo {

    /** 线索ID */
    private String leadId;

    /** 是否已受理 */
    private Boolean accepted;

    /** 消息 */
    private String message;

    public CreateLandingLeadVo() {
    }

    public CreateLandingLeadVo(String leadId, Boolean accepted, String message) {
        this.leadId = leadId;
        this.accepted = accepted;
        this.message = message;
    }
}
