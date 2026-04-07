package org.dromara.xiaomai.ai.binding.domain;

import org.dromara.common.tenant.core.TenantEntity;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;

/**
 * 模块阶段到运行资源的绑定关系对象 xm_ai_module_binding
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_ai_module_binding")
public class XmAiModuleBinding extends TenantEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键
     */
    @TableId(value = "id")
    private Long id;

    /**
     * 关联模块主键
     */
    private Long moduleId;

    /**
     * 阶段编码，如 storyboard/script/narration/companion/search
     */
    private String stageCode;

    /**
     * 能力类型，llm/tts
     */
    private String capability;

    /**
     * 角色编码，为空表示阶段默认链路
     */
    private String roleCode;

    /**
     * 关联资源主键
     */
    private Long resourceId;

    /**
     * 优先级，越小越优先
     */
    private Long priority;

    /**
     * 超时时间，单位秒
     */
    private Long timeoutSeconds;

    /**
     * 重试次数
     */
    private Long retryAttempts;

    /**
     * 健康状态来源
     */
    private String healthSource;

    /**
     * 运行时附加配置 JSON 字符串
     */
    private String runtimeSettingsJson;

    /**
     * 状态（0正常 1停用）
     */
    private String status;

    /**
     * 是否默认链路（Y/N）
     */
    private String isDefault;

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
