package org.dromara.xiaomai.video.domain.vo;

import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.common.translation.annotation.Translation;
import org.dromara.common.translation.constant.TransConstant;
import org.dromara.xiaomai.video.domain.VideoTask;

import java.io.Serial;
import java.io.Serializable;

/**
 * 视频任务视图对象。
 *
 * @author Codex
 */
@Data
@AutoMapper(target = VideoTask.class)
public class VideoTaskVo extends BaseEntity implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long id;

    private String taskId;

    private Long userId;

    @Translation(type = TransConstant.USER_ID_TO_NAME, mapper = "userId")
    private String userName;

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
