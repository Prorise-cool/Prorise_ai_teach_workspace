package org.dromara.xiaomai.learningcenter.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.io.Serial;

/**
 * 收藏记录到文件夹的映射。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_learning_favorite_folder_assignment")
public class XmLearningFavoriteFolderAssignment extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @TableId(value = "assignment_id")
    private Long assignmentId;

    private String userId;

    /**
     * 学习中心聚合记录 ID（与 LearningCenterRecordVo.recordId 对齐）。
     */
    private String recordId;

    /**
     * 文件夹 ID（可为内置文件夹 builtin-folder:* 或用户自建文件夹 fld_*）。
     */
    private String folderId;
}

