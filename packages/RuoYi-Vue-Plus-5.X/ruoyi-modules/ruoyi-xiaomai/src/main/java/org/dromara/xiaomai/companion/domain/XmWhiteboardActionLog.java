package org.dromara.xiaomai.companion.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.util.Date;

/**
 * Companion 白板动作日志 xm_whiteboard_action_log。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_whiteboard_action_log")
public class XmWhiteboardActionLog extends BaseEntity {

    @TableId(value = "action_id")
    private String actionId;

    private String tenantId;

    private String turnId;

    private Long userId;

    private String sessionId;

    private String actionType;

    private String actionPayloadJson;

    private String objectRef;

    private String renderUri;

    private String renderState;

    private Date actionTime;
}
