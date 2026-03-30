package org.dromara.xiaomai.classroom.domain.bo;

import io.github.linpeilie.annotations.AutoMapper;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.xiaomai.classroom.domain.ClassroomSession;

import java.io.Serial;

/**
 * 课堂会话业务对象。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = ClassroomSession.class, reverseConvertGenerate = false)
public class ClassroomSessionBo extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull(message = "主键不能为空", groups = {EditGroup.class})
    private Long id;

    @NotBlank(message = "任务 ID 不能为空", groups = {AddGroup.class, EditGroup.class})
    private String taskId;

    @NotBlank(message = "用户归属不能为空", groups = {AddGroup.class, EditGroup.class})
    private String userId;

    @NotBlank(message = "任务类型不能为空", groups = {AddGroup.class, EditGroup.class})
    private String taskType;

    @NotBlank(message = "任务状态不能为空", groups = {AddGroup.class, EditGroup.class})
    private String taskState;

    @NotBlank(message = "任务摘要不能为空", groups = {AddGroup.class, EditGroup.class})
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
