package org.dromara.xiaomai.learningcenter.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.io.Serial;

/**
 * 学习中心收藏文件夹（用户自定义）。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_learning_favorite_folder")
public class XmLearningFavoriteFolder extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 文件夹 ID（字符串主键，如 fld_xxx）。
     */
    @TableId(value = "folder_id")
    private String folderId;

    /**
     * 用户 ID。
     */
    private String userId;

    /**
     * 文件夹名称。
     */
    private String folderName;

    /**
     * 删除标记（0-存在 1-删除）。
     */
    @TableLogic
    private String delFlag;
}
