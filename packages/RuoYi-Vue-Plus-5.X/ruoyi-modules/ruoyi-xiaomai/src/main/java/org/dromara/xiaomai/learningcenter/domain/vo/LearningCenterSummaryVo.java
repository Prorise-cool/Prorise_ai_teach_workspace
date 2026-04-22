package org.dromara.xiaomai.learningcenter.domain.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;

/**
 * 学习中心聚合摘要 VO（TASK-009 新增）。
 *
 * <p>前端学习中心侧边栏三张卡一次取齐：averageQuizScore、latestRecommendation、activeLearningPath。
 * 任一字段上游无数据时保持 null，由前端按空态渲染，不硬编码占位。</p>
 *
 * @author Codex
 */
@Data
public class LearningCenterSummaryVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 来自 xm_quiz_result 的平均分（ROUND(AVG(score))）；无 quiz 记录时为 null。 */
    private Integer averageQuizScore;

    private LatestRecommendationVo latestRecommendation;

    private ActiveLearningPathVo activeLearningPath;

    @Data
    public static class LatestRecommendationVo implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        /** 对应 xm_learning_recommendation.recommendation_reason。 */
        private String summary;
        private String targetRefId;
        private Date sourceTime;
    }

    @Data
    public static class ActiveLearningPathVo implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        private String pathId;
        /** 对应 xm_learning_path.path_title。 */
        private String title;
        private Integer completedStepCount;
        private Integer totalStepCount;
        private Integer versionNo;
    }
}
