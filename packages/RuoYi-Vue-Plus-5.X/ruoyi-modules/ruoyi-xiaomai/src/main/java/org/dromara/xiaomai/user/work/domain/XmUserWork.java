package org.dromara.xiaomai.user.work.domain;

import org.dromara.common.tenant.core.TenantEntity;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;

/**
 * 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用对象 xm_user_work
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_user_work")
public class XmUserWork extends TenantEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键（Snowflake）
     */
    @TableId(value = "id")
    private Long id;

    /**
     * 作品所有者（关联 sys_user.user_id）
     */
    private Long userId;

    /**
     * 作品类型（video / classroom）
     */
    private String workType;

    /**
     * 来源任务ID（对应 xm_video_task.task_id 或 xm_classroom_session.task_id）
     */
    private String taskRefId;

    /**
     * 作品标题
     */
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
    private Long isPublic;

    /**
     * 管理状态（normal/hidden/blocked）—— 管理员在 RuoYi 后台可操作
     */
    private String status;

    /**
     * 浏览量
     */
    private Long viewCount;

    /**
     * 点赞量
     */
    private Long likeCount;

    /**
     * 乐观锁版本
     */
    @Version
    private Long version;

    /**
     * 删除标志（0-存在 1-删除）
     */
    @TableLogic
    private Long delFlag;


}
