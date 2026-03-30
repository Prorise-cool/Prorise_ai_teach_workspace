package org.dromara.xiaomai.integration.domain.bo;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * FastAPI -> RuoYi 最小长期回写请求体。
 *
 * <p>当前仅承接 Epic 10 review 修复所需的 internal sync 能力。</p>
 *
 * @author Codex
 */
public final class XmPersistenceSyncBo {

    private XmPersistenceSyncBo() {
    }

    @Data
    public static class AnchorBo {
        private String contextType;
        private String anchorKind;
        private String anchorRef;
        private String scopeSummary;
        private String scopeWindow;
        private List<String> sourceIds = new ArrayList<>();
    }

    @Data
    public static class SourceReferenceBo {
        private String sourceId;
        private String sourceTitle;
        private String sourceKind;
        private String sourceAnchor;
        private String sourceExcerpt;
        private String sourceUri;
        private Double sourceScore;
    }

    @Data
    public static class WhiteboardActionBo {
        private String actionType;
        private Map<String, Object> payload;
        private String objectRef;
        private String renderUri;
        private String renderState;
    }

    @Data
    public static class CompanionTurnSyncBo {
        private String userId;
        private String sessionId;
        private String contextType;
        private AnchorBo anchor;
        private String questionText;
        private String answerSummary;
        private String sourceSummary;
        private List<SourceReferenceBo> sourceRefs = new ArrayList<>();
        private List<WhiteboardActionBo> whiteboardActions = new ArrayList<>();
        private Boolean whiteboardDegraded;
        private Boolean referenceMissing;
        private Boolean overallFailed;
        private String persistenceStatus;
    }

    @Data
    public static class KnowledgeChatSyncBo {
        private String userId;
        private String sessionId;
        private String contextType;
        private AnchorBo retrievalScope;
        private String questionText;
        private String answerSummary;
        private String sourceSummary;
        private List<SourceReferenceBo> sourceRefs = new ArrayList<>();
        private Boolean referenceMissing;
        private Boolean overallFailed;
        private String persistenceStatus;
    }

    @Data
    public static class LearningResultBatchSyncBo {
        private String userId;
        private List<LearningResultSyncItemBo> records = new ArrayList<>();
    }

    @Data
    public static class LearningResultSyncItemBo {
        private Long recordId;
        private Long generatedId;
        private String tableName;
        private String displayName;
        private String note;
        private String userId;
        private String resultType;
        private String sourceType;
        private String sourceSessionId;
        private String sourceTaskId;
        private String sourceResultId;
        private Date occurredAt;
        private Date updatedAt;
        private Integer score;
        private Integer questionTotal;
        private Integer correctTotal;
        private String questionText;
        private String wrongAnswerText;
        private String referenceAnswerText;
        private String targetType;
        private String targetRefId;
        private String pathTitle;
        private Integer stepCount;
        private String analysisSummary;
        private String status;
        private String detailRef;
        private Integer versionNo;
    }
}
