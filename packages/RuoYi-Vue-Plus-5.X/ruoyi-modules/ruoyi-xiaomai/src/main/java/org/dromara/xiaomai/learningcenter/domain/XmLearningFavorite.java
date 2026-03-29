package org.dromara.xiaomai.learningcenter.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.io.Serial;
import java.util.Date;

/**
 * 学习中心收藏记录。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_learning_favorite")
public class XmLearningFavorite extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @TableId(value = "favorite_id")
    private Long favoriteId;

    private String userId;

    private String resultType;

    private String sourceTable;

    private String sourceResultId;

    private String sourceSessionId;

    private String detailRef;

    private String activeFlag;

    private Date favoriteTime;

    private Date cancelTime;
}
