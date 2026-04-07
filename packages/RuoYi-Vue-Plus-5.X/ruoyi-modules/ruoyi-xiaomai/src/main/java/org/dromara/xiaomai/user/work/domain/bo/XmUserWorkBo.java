package org.dromara.xiaomai.user.work.domain.bo;

import org.dromara.xiaomai.user.work.domain.XmUserWork;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.*;

/**
 * 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用业务对象 xm_user_work
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = XmUserWork.class, reverseConvertGenerate = false)
public class XmUserWorkBo extends BaseEntity {

    /**
     * 主键（Snowflake）
     */
    @NotNull(message = "主键（Snowflake）不能为空", groups = { EditGroup.class })
    private Long id;

    /**
     * 作品所有者（关联 sys_user.user_id）
     */
    @NotNull(message = "作品所有者（关联 sys_user.user_id）不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long userId;

    /**
     * 作品类型（video / classroom）
     */
    @NotBlank(message = "作品类型（video / classroom）不能为空", groups = { AddGroup.class, EditGroup.class })
    private String workType;

    /**
     * 来源任务ID（对应 xm_video_task.task_id 或 xm_classroom_session.task_id）
     */
    @NotBlank(message = "来源任务ID（对应 xm_video_task.task_id 或 xm_classroom_session.task_id）不能为空", groups = { AddGroup.class, EditGroup.class })
    private String taskRefId;

    /**
     * 作品标题
     */
    @NotBlank(message = "作品标题不能为空", groups = { AddGroup.class, EditGroup.class })
    private String title;

    /**
     * 作品描述
     */
    private String description;

    /**
     * 封面图 OSS ID（关联 sys_oss.oss_id）
     */
    private Long coverOssId;

    /**
     * 封面图直链（冗余缓存，避免高频 JOIN sys_oss）
     */
    private String coverUrl;

    /**
     * 是否公开到社区（0-私有 1-公开）
     */
    @NotNull(message = "是否公开到社区（0-私有 1-公开）不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long isPublic;

    /**
     * 管理状态（normal/hidden/blocked）—— 管理员在 RuoYi 后台可操作
     */
    @NotBlank(message = "管理状态（normal/hidden/blocked）—— 管理员在 RuoYi 后台可操作不能为空", groups = { AddGroup.class, EditGroup.class })
    private String status;

    /**
     * 浏览量
     */
    @NotNull(message = "浏览量不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long viewCount;

    /**
     * 点赞量
     */
    @NotNull(message = "点赞量不能为空", groups = { AddGroup.class, EditGroup.class })
    private Long likeCount;


}
