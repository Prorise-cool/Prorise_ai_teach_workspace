package org.dromara.xiaomai.classroom.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.io.Serial;

/**
 * 课堂会话长期元数据。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_classroom_session")
public class ClassroomSession extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @TableId(value = "id")
    private Long id;

    private String taskId;

    private String userId;

    private String taskType;

    private String taskState;

    private String summary;

    private String resultRef;

    private String detailRef;

    private String errorSummary;

    private String sourceSessionId;

    private String sourceArtifactRef;

    private String replayHint;

    private java.util.Date startTime;

    private java.util.Date completeTime;

    private java.util.Date failTime;
}
