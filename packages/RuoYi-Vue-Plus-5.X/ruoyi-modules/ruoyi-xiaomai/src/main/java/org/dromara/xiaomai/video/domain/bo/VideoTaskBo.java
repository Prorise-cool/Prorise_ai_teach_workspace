package org.dromara.xiaomai.video.domain.bo;

import io.github.linpeilie.annotations.AutoMapper;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.xiaomai.video.domain.VideoTask;

import java.io.Serial;

/**
 * 视频任务业务对象。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = VideoTask.class, reverseConvertGenerate = false)
public class VideoTaskBo extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键。
     */
    @NotNull(message = "主键不能为空", groups = {EditGroup.class})
    private Long id;

    /**
     * 任务 ID。
     */
    @NotBlank(message = "任务 ID 不能为空", groups = {AddGroup.class, EditGroup.class})
    private String taskId;

    /**
     * 用户归属。
     */
    @NotNull(message = "用户归属不能为空", groups = {AddGroup.class, EditGroup.class})
    private Long userId;

    /**
     * 任务类型。
     */
    @NotBlank(message = "任务类型不能为空", groups = {AddGroup.class, EditGroup.class})
    private String taskType;

    /**
     * 任务状态。
     */
    @NotBlank(message = "任务状态不能为空", groups = {AddGroup.class, EditGroup.class})
    private String taskState;

    /**
     * 任务摘要。
     */
    @NotBlank(message = "任务摘要不能为空", groups = {AddGroup.class, EditGroup.class})
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
