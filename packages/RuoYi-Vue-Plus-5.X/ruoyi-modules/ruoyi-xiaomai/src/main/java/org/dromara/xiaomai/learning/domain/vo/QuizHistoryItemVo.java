package org.dromara.xiaomai.learning.domain.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;
import java.util.Map;

/**
 * 测验历史每题明细 VO。
 *
 * @author Codex
 */
@Data
public class QuizHistoryItemVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String questionId;
    private String stem;
    /** 选项明细：[{optionId,label,text}]；允许为空（历史早期数据）。 */
    private List<Map<String, Object>> options;
    private String selectedOptionId;
    private String correctOptionId;
    private Boolean isCorrect;
    private String explanation;
}
