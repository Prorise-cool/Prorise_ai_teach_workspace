package org.dromara.xiaomai.ai.binding.domain.vo;

import org.dromara.xiaomai.ai.binding.domain.XmAiModuleBinding;
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
 * 模块阶段到运行资源的绑定关系视图对象 xm_ai_module_binding
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = XmAiModuleBinding.class)
public class XmAiModuleBindingVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @ExcelProperty(value = "主键")
    private Long id;

    /**
     * 关联模块主键
     */
    @ExcelProperty(value = "关联模块主键")
    private Long moduleId;

    /**
     * 阶段编码，如 storyboard/script/narration/companion/search
     */
    @ExcelProperty(value = "阶段编码，如 storyboard/script/narration/companion/search")
    private String stageCode;

    /**
     * 能力类型，llm/tts
     */
    @ExcelProperty(value = "能力类型", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_ai_capability")
    private String capability;

    /**
     * 角色编码，为空表示阶段默认链路
     */
    @ExcelProperty(value = "角色编码，为空表示阶段默认链路")
    private String roleCode;

    /**
     * 关联资源主键
     */
    @ExcelProperty(value = "关联资源主键")
    private Long resourceId;

    /**
     * 优先级，越小越优先
     */
    @ExcelProperty(value = "优先级，越小越优先")
    private Long priority;

    /**
     * 超时时间，单位秒
     */
    @ExcelProperty(value = "超时时间，单位秒")
    private Long timeoutSeconds;

    /**
     * 重试次数
     */
    @ExcelProperty(value = "重试次数")
    private Long retryAttempts;

    /**
     * 健康状态来源
     */
    @ExcelProperty(value = "健康状态来源", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_ai_health_source")
    private String healthSource;

    /**
     * 运行时附加配置 JSON 字符串
     */
    @ExcelProperty(value = "运行时附加配置 JSON 字符串")
    private String runtimeSettingsJson;

    /**
     * 状态（0正常 1停用）
     */
    @ExcelProperty(value = "状态", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "sys_normal_disable")
    private String status;

    /**
     * 是否默认链路（Y/N）
     */
    @ExcelProperty(value = "是否默认链路", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "sys_yes_no")
    private String isDefault;

    /**
     * 备注
     */
    @ExcelProperty(value = "备注")
    private String remark;


}
