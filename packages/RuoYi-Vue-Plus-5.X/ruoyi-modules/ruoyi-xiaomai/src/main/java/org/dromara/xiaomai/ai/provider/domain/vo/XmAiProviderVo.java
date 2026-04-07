package org.dromara.xiaomai.ai.provider.domain.vo;

import org.dromara.xiaomai.ai.provider.domain.XmAiProvider;
import cn.idev.excel.annotation.ExcelIgnoreUnannotated;
import cn.idev.excel.annotation.ExcelProperty;
import org.dromara.common.excel.annotation.ExcelDictFormat;
import org.dromara.common.excel.convert.ExcelDictConvert;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;



/**
 * AI Provider 实例配置视图对象 xm_ai_provider
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = XmAiProvider.class)
public class XmAiProviderVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @ExcelProperty(value = "主键")
    private Long id;

    /**
     * Provider 实例编码，如 volcengine-prod
     */
    @ExcelProperty(value = "Provider 实例编码，如 volcengine-prod")
    private String providerCode;

    /**
     * Provider 实例名称
     */
    @ExcelProperty(value = "Provider 实例名称")
    private String providerName;

    /**
     * 供应商编码，如 volcengine/deepseek/openai
     */
    @ExcelProperty(value = "供应商编码", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_ai_vendor_code")
    private String vendorCode;

    /**
     * 鉴权类型，如 api_key/app_key_secret/access_token/custom
     */
    @ExcelProperty(value = "鉴权类型", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_ai_auth_type")
    private String authType;

    /**
     * 基础请求地址
     */
    @ExcelProperty(value = "基础请求地址")
    private String endpointUrl;

    /**
     * 应用 ID
     */
    @ExcelProperty(value = "应用 ID")
    private String appId;

    /**
     * API Key（敏感）
     */
    @ExcelProperty(value = "API Key")
    private String apiKey;

    /**
     * API Secret（敏感）
     */
    @ExcelProperty(value = "API Secret")
    private String apiSecret;

    /**
     * Access Token（敏感）
     */
    @ExcelProperty(value = "Access Token")
    private String accessToken;

    /**
     * 扩展鉴权配置 JSON 字符串
     */
    @ExcelProperty(value = "扩展鉴权配置 JSON 字符串")
    private String extraAuthJson;

    /**
     * 状态（0正常 1停用）
     */
    @ExcelProperty(value = "状态", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "sys_normal_disable")
    private String status;

    /**
     * 排序号
     */
    @ExcelProperty(value = "排序号")
    private Long sortOrder;

    /**
     * 备注
     */
    @ExcelProperty(value = "备注")
    private String remark;


}
