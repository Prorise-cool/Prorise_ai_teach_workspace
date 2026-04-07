package org.dromara.xiaomai.ai.provider.domain;

import org.dromara.common.tenant.core.TenantEntity;
import org.dromara.common.encrypt.annotation.EncryptField;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;

/**
 * AI Provider 实例配置对象 xm_ai_provider
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_ai_provider")
public class XmAiProvider extends TenantEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @TableId(value = "id")
    private Long id;

    /**
     * Provider 实例编码，如 volcengine-prod
     */
    private String providerCode;

    /**
     * Provider 实例名称
     */
    private String providerName;

    /**
     * 供应商编码，如 volcengine/deepseek/openai
     */
    private String vendorCode;

    /**
     * 鉴权类型，如 api_key/app_key_secret/access_token/custom
     */
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
    @EncryptField
    private String apiKey;

    /**
     * API Secret（敏感）
     */
    @EncryptField
    private String apiSecret;

    /**
     * Access Token（敏感）
     */
    @EncryptField
    private String accessToken;

    /**
     * 扩展鉴权配置 JSON 字符串
     */
    private String extraAuthJson;

    /**
     * 状态（0正常 1停用）
     */
    private String status;

    /**
     * 排序号
     */
    private Long sortOrder;

    /**
     * 备注
     */
    private String remark;

    /**
     * 删除标志（0代表存在 1代表删除）
     */
    @TableLogic
    private String delFlag;


}
