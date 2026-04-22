package org.dromara.xiaomai.learning.domain.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;
import java.util.List;

/**
 * 测验历史回看 VO。
 *
 * <p>响应结构与 FastAPI 侧 QuizHistoryPayload 对齐：quizId/sourceType/questionTotal/correctTotal/score/summary/occurredAt + items[]。</p>
 *
 * @author Codex
 */
@Data
public class QuizHistoryVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String quizId;
    private String sourceType;
    private String sourceSessionId;
    private String sourceTaskId;
    private Integer questionTotal;
    private Integer correctTotal;
    private Integer score;
    /** 对应 xm_quiz_result.analysis_summary。 */
    private String summary;
    private Date occurredAt;
    /** 来自 xm_quiz_result.question_items_json 反序列化后的明细列表；无数据时为空列表。 */
    private List<QuizHistoryItemVo> items;
}
