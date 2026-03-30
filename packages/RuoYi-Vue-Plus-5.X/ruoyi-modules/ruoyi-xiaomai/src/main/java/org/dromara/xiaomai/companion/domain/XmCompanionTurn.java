package org.dromara.xiaomai.companion.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.util.Date;

/**
 * Companion 会话时刻问答长期记录 xm_companion_turn。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_companion_turn")
public class XmCompanionTurn extends BaseEntity {

    @TableId(value = "turn_id")
    private String turnId;

    private String tenantId;

    private String userId;

    private String sessionId;

    private String contextType;

    private String anchorKind;

    private String anchorRef;

    private String scopeSummary;

    private String scopeWindow;

    private String sourceIdsJson;

    private String questionText;

    private String answerSummary;

    private String sourceSummary;

    private String sourceRefsJson;

    private Boolean whiteboardDegraded;

    private Boolean referenceMissing;

    private Boolean overallFailed;

    private String persistenceStatus;

    private Date turnTime;
}
