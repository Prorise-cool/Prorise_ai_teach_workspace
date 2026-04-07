package org.dromara.xiaomai.integration.domain.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * FastAPI <- RuoYi 最小长期回写响应体。
 *
 * @author Codex
 */
public final class XmPersistenceSyncVo {

    private XmPersistenceSyncVo() {
    }

    @Data
    public static class AnchorVo {
        private String contextType;
        private String anchorKind;
        private String anchorRef;
        private String scopeSummary;
        private String scopeWindow;
        private List<String> sourceIds = new ArrayList<>();
    }

    @Data
    public static class SourceReferenceVo {
        private String sourceId;
        private String sourceTitle;
        private String sourceKind;
        private String sourceAnchor;
        private String sourceExcerpt;
        private String sourceUri;
        private Double sourceScore;
    }

    @Data
    public static class WhiteboardActionVo {
        private String tableName = "xm_whiteboard_action_log";
        private String actionId;
        private String turnId;
        private String sessionId;
        private String userId;
        private String actionType;
        private Map<String, Object> payload;
        private String objectRef;
        private String renderUri;
        private String renderState;
        private Date createdAt;
    }

    @Data
    public static class CompanionTurnSyncVo {
        private String tableName = "xm_companion_turn";
        private String turnId;
        private String sessionId;
        private String userId;
        private String contextType;
        private String conversationDomain = "companion";
        private AnchorVo anchor;
        private String questionText;
        private String answerSummary;
        private String sourceSummary;
        private List<SourceReferenceVo> sourceRefs = new ArrayList<>();
        private List<WhiteboardActionVo> whiteboardActions = new ArrayList<>();
        private Boolean whiteboardDegraded;
        private Boolean referenceMissing;
        private Boolean overallFailed;
        private String persistenceStatus;
        private Date createdAt;
    }

    @Data
    public static class KnowledgeChatSyncVo {
        private String tableName = "xm_knowledge_chat_log";
        private String chatLogId;
        private String sessionId;
        private String userId;
        private String contextType;
        private String conversationDomain = "evidence";
        private AnchorVo retrievalScope;
        private String questionText;
        private String answerSummary;
        private String sourceSummary;
        private List<SourceReferenceVo> sourceRefs = new ArrayList<>();
        private Boolean referenceMissing;
        private Boolean overallFailed;
        private String persistenceStatus;
        private Date createdAt;
    }

    @Data
    public static class VideoPublicationSyncVo {
        private String tableName = "xm_user_work";
        private Long workId;
        private String workType;
        private String taskRefId;
        private String userId;
        private String title;
        private String description;
        private String coverUrl;
        private Boolean isPublic;
        private String status;
        private Date publishedAt;
        private Date createdAt;
        private Date updatedAt;
        private Integer version;
    }

    @Data
    public static class SessionArtifactSyncVo {
        private String tableName = "xm_session_artifact";
        private String sessionType;
        private String sessionRefId;
        private String artifactType;
        private String anchorType;
        private String anchorKey;
        private Integer sequenceNo;
        private String title;
        private String summary;
        private String objectKey;
        private String payloadRef;
        private Map<String, Object> metadata = new LinkedHashMap<>();
        private Date occurredAt;
    }

    @Data
    public static class SessionArtifactBatchSyncVo {
        private String tableName = "xm_session_artifact";
        private String sessionType;
        private String sessionRefId;
        private String payloadRef;
        private Integer syncedCount;
        private List<SessionArtifactSyncVo> artifacts = new ArrayList<>();
    }

    @Data
    public static class SessionReplaySyncVo {
        private String sessionId;
        private List<String> storageTables = new ArrayList<>(List.of(
            "xm_companion_turn",
            "xm_whiteboard_action_log",
            "xm_knowledge_chat_log"
        ));
        private List<CompanionTurnSyncVo> companionTurns = new ArrayList<>();
        private List<WhiteboardActionVo> whiteboardActionLogs = new ArrayList<>();
        private List<KnowledgeChatSyncVo> knowledgeChatLogs = new ArrayList<>();
    }

    @Data
    public static class LearningResultSyncItemVo {
        private String tableName;
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

    @Data
    public static class LearningResultBatchSyncVo {
        private String userId;
        private List<LearningResultSyncItemVo> records = new ArrayList<>();
        private Map<String, String> tableSummary = new LinkedHashMap<>();
        private String traceabilityRule = "version-or-updated-at";
    }
}
