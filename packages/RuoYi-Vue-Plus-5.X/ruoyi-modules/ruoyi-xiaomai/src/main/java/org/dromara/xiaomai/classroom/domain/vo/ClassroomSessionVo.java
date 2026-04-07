package org.dromara.xiaomai.classroom.domain.vo;

import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.xiaomai.classroom.domain.ClassroomSession;

import java.io.Serial;
import java.io.Serializable;

/**
 * 课堂会话视图对象。
 *
 * @author Codex
 */
@Data
@AutoMapper(target = ClassroomSession.class)
public class ClassroomSessionVo extends BaseEntity implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long id;

    private String taskId;

    private Long userId;

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
