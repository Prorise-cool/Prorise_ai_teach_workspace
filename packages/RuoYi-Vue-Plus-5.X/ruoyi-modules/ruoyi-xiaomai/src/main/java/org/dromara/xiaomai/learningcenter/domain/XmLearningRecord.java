package org.dromara.xiaomai.learningcenter.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;

import java.io.Serial;
import java.util.Date;

/**
 * 学习中心聚合记录。
 *
 * @author Codex
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xm_learning_record")
public class XmLearningRecord extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @TableId(value = "record_id")
    private Long recordId;

    private String userId;

    private String resultType;

    private String displayTitle;

    private String sourceType;

    private String sourceTable;

    private String sourceSessionId;

    private String sourceTaskId;

    private String sourceResultId;

    private Date sourceTime;

    private String status;

    private Integer score;

    private String analysisSummary;

    private String detailRef;

    private Integer versionNo;

    private String deletedFlag;
}
