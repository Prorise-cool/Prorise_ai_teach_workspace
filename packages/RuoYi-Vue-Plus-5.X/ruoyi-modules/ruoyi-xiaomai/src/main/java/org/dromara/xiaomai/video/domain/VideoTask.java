package org.dromara.xiaomai.video.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.io.Serial;

/**
 * 视频任务长期元数据。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_video_task")
public class VideoTask extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键。
     */
    @TableId(value = "id")
    private Long id;

    /**
     * 任务 ID。
     */
    private String taskId;

    /**
     * 用户归属。
     */
    private String userId;

    /**
     * 任务类型。
     */
    private String taskType;

    /**
     * 任务状态。
     */
    private String taskState;

    /**
     * 任务摘要。
     */
    private String summary;

    /**
     * 结果资源标识。
     */
    private String resultRef;

    /**
     * 结果详情标识。
     */
    private String detailRef;

    /**
     * 失败摘要。
     */
    private String errorSummary;

    /**
     * 来源会话 ID。
     */
    private String sourceSessionId;

    /**
     * 来源产物引用。
     */
    private String sourceArtifactRef;

    /**
     * 回看定位提示。
     */
    private String replayHint;

    /**
     * 开始时间。
     */
    private java.util.Date startTime;

    /**
     * 完成时间。
     */
    private java.util.Date completeTime;

    /**
     * 失败时间。
     */
    private java.util.Date failTime;
}
