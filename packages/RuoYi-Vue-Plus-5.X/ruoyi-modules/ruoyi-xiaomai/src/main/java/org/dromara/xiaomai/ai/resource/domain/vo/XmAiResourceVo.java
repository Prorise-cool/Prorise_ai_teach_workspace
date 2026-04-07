package org.dromara.xiaomai.ai.resource.domain.vo;

import org.dromara.xiaomai.ai.resource.domain.XmAiResource;
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
 * AI 模型 / 音色等可调度资源视图对象 xm_ai_resource
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = XmAiResource.class)
public class XmAiResourceVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @ExcelProperty(value = "主键")
    private Long id;

    /**
     * 关联 Provider 主键
     */
    @ExcelProperty(value = "关联 Provider 主键")
    private Long providerId;

    /**
     * 能力类型，llm/tts
     */
    @ExcelProperty(value = "能力类型", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_ai_capability")
    private String capability;

    /**
     * 资源编码
     */
    @ExcelProperty(value = "资源编码")
    private String resourceCode;

    /**
     * 资源名称
     */
    @ExcelProperty(value = "资源名称")
    private String resourceName;

    /**
     * 资源类型，如 chat/reasoning/vision/voice
     */
    @ExcelProperty(value = "资源类型", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_ai_resource_type")
    private String resourceType;

    /**
     * FastAPI 运行时 Provider ID，需符合 vendor-model_or_voice 规范
     */
    @ExcelProperty(value = "FastAPI 运行时 Provider ID，需符合 vendor-model_or_voice 规范")
    private String runtimeProviderId;

    /**
     * 上游模型名称
     */
    @ExcelProperty(value = "上游模型名称")
    private String modelName;

    /**
     * 音色编码，TTS 使用
     */
    @ExcelProperty(value = "音色编码，TTS 使用")
    private String voiceCode;

    /**
     * 语言编码
     */
    @ExcelProperty(value = "语言编码")
    private String languageCode;

    /**
     * 资源级扩展配置 JSON 字符串
     */
    @ExcelProperty(value = "资源级扩展配置 JSON 字符串")
    private String resourceSettingsJson;

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
