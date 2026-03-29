package org.dromara.xiaomai.knowledge.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.util.Date;

/**
 * Evidence / Retrieval 历史问答记录 xm_knowledge_chat_log。
 * 该表名为历史承接表名，当前继续用于来源问答与 Evidence 问答沉淀。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_knowledge_chat_log")
public class XmKnowledgeChatLog extends BaseEntity {

    @TableId(value = "chat_log_id")
    private String chatLogId;

    private String tenantId;

    private Long userId;

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

    private Boolean referenceMissing;

    private Boolean overallFailed;

    private String persistenceStatus;

    private Date chatTime;
}
