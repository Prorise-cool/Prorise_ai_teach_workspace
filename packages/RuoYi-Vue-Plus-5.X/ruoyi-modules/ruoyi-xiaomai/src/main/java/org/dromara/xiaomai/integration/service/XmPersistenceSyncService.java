package org.dromara.xiaomai.integration.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.mybatis.utils.IdGeneratorUtil;
import org.dromara.xiaomai.companion.domain.XmCompanionTurn;
import org.dromara.xiaomai.companion.domain.XmWhiteboardActionLog;
import org.dromara.xiaomai.companion.mapper.XmCompanionTurnMapper;
import org.dromara.xiaomai.companion.mapper.XmWhiteboardActionLogMapper;
import org.dromara.xiaomai.integration.domain.bo.XmPersistenceSyncBo;
import org.dromara.xiaomai.integration.domain.vo.XmPersistenceSyncVo;
import org.dromara.xiaomai.integration.mapper.SessionArtifactMapper;
import org.dromara.xiaomai.integration.mapper.VideoPublicationMapper;
import org.dromara.xiaomai.knowledge.domain.XmKnowledgeChatLog;
import org.dromara.xiaomai.knowledge.mapper.XmKnowledgeChatLogMapper;
import org.dromara.xiaomai.learning.mapper.LearningResultMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Epic 10 internal sync 持久化服务。
 *
 * <p>仅承接 FastAPI -> RuoYi 的长期落表，不扩展新的后台业务流。</p>
 *
 * @author Codex
 */
@Service
@RequiredArgsConstructor
public class XmPersistenceSyncService {

    private final ObjectMapper objectMapper;
    private final XmCompanionTurnMapper companionTurnMapper;
    private final XmWhiteboardActionLogMapper whiteboardActionLogMapper;
    private final XmKnowledgeChatLogMapper knowledgeChatLogMapper;
    private final LearningResultMapper learningResultMapper;
    private final VideoPublicationMapper videoPublicationMapper;
    private final SessionArtifactMapper sessionArtifactMapper;

    @Transactional(rollbackFor = Exception.class)
    public XmPersistenceSyncVo.CompanionTurnSyncVo syncCompanionTurn(XmPersistenceSyncBo.CompanionTurnSyncBo bo) {
        Date now = new Date();
        XmCompanionTurn entity = new XmCompanionTurn();
        entity.setTurnId(nextIdWithPrefix("turn_"));
        entity.setTenantId("000000");
        entity.setUserId(bo.getUserId());
        entity.setSessionId(bo.getSessionId());
        entity.setContextType(bo.getContextType());
        entity.setAnchorKind(bo.getAnchor().getAnchorKind());
        entity.setAnchorRef(bo.getAnchor().getAnchorRef());
        entity.setScopeSummary(bo.getAnchor().getScopeSummary());
        entity.setScopeWindow(bo.getAnchor().getScopeWindow());
        entity.setSourceIdsJson(writeJson(bo.getAnchor().getSourceIds()));
        entity.setQuestionText(bo.getQuestionText());
        entity.setAnswerSummary(bo.getAnswerSummary());
        entity.setSourceSummary(bo.getSourceSummary());
        entity.setSourceRefsJson(writeJson(bo.getSourceRefs()));
        entity.setWhiteboardDegraded(Boolean.TRUE.equals(bo.getWhiteboardDegraded()));
        entity.setReferenceMissing(Boolean.TRUE.equals(bo.getReferenceMissing()));
        entity.setOverallFailed(Boolean.TRUE.equals(bo.getOverallFailed()));
        entity.setPersistenceStatus(resolveCompanionStatus(bo));
        entity.setTurnTime(now);
        companionTurnMapper.insert(entity);

        List<XmWhiteboardActionLog> actions = new ArrayList<>();
        for (XmPersistenceSyncBo.WhiteboardActionBo actionBo : safeList(bo.getWhiteboardActions())) {
            XmWhiteboardActionLog action = new XmWhiteboardActionLog();
            action.setActionId(nextIdWithPrefix("wb_"));
            action.setTenantId("000000");
            action.setTurnId(entity.getTurnId());
            action.setUserId(entity.getUserId());
            action.setSessionId(entity.getSessionId());
            action.setActionType(actionBo.getActionType());
            action.setActionPayloadJson(writeJson(actionBo.getPayload()));
            action.setObjectRef(actionBo.getObjectRef());
            action.setRenderUri(actionBo.getRenderUri());
            action.setRenderState(actionBo.getRenderState());
            action.setActionTime(now);
            whiteboardActionLogMapper.insert(action);
            actions.add(action);
        }
        return toCompanionVo(entity, actions);
    }

    public XmPersistenceSyncVo.CompanionTurnSyncVo getCompanionTurn(String turnId) {
        XmCompanionTurn entity = companionTurnMapper.selectById(turnId);
        if (entity == null) {
            return null;
        }
        List<XmWhiteboardActionLog> actions = listWhiteboardActionsByTurnId(turnId);
        return toCompanionVo(entity, actions);
    }

    public XmPersistenceSyncVo.SessionReplaySyncVo replaySession(String sessionId) {
        List<XmCompanionTurn> turns = companionTurnMapper.selectList(
            Wrappers.<XmCompanionTurn>lambdaQuery()
                .eq(XmCompanionTurn::getSessionId, sessionId)
                .orderByAsc(XmCompanionTurn::getTurnTime, XmCompanionTurn::getTurnId)
        );
        List<XmWhiteboardActionLog> actions = whiteboardActionLogMapper.selectList(
            Wrappers.<XmWhiteboardActionLog>lambdaQuery()
                .eq(XmWhiteboardActionLog::getSessionId, sessionId)
                .orderByAsc(XmWhiteboardActionLog::getActionTime, XmWhiteboardActionLog::getActionId)
        );
        List<XmKnowledgeChatLog> chats = knowledgeChatLogMapper.selectList(
            Wrappers.<XmKnowledgeChatLog>lambdaQuery()
                .eq(XmKnowledgeChatLog::getSessionId, sessionId)
                .orderByAsc(XmKnowledgeChatLog::getChatTime, XmKnowledgeChatLog::getChatLogId)
        );

        Map<String, List<XmWhiteboardActionLog>> actionMap = actions.stream()
            .collect(Collectors.groupingBy(XmWhiteboardActionLog::getTurnId));

        XmPersistenceSyncVo.SessionReplaySyncVo replay = new XmPersistenceSyncVo.SessionReplaySyncVo();
        replay.setSessionId(sessionId);
        replay.setCompanionTurns(
            turns.stream()
                .map(turn -> toCompanionVo(turn, actionMap.getOrDefault(turn.getTurnId(), List.of())))
                .toList()
        );
        replay.setWhiteboardActionLogs(actions.stream().map(this::toWhiteboardActionVo).toList());
        replay.setKnowledgeChatLogs(chats.stream().map(this::toKnowledgeChatVo).toList());
        return replay;
    }

    @Transactional(rollbackFor = Exception.class)
    public XmPersistenceSyncVo.KnowledgeChatSyncVo syncKnowledgeChat(XmPersistenceSyncBo.KnowledgeChatSyncBo bo) {
        Date now = new Date();
        XmKnowledgeChatLog entity = new XmKnowledgeChatLog();
        entity.setChatLogId(nextIdWithPrefix("chat_"));
        entity.setTenantId("000000");
        entity.setUserId(bo.getUserId());
        entity.setSessionId(bo.getSessionId());
        entity.setContextType(bo.getContextType());
        entity.setAnchorKind(bo.getRetrievalScope().getAnchorKind());
        entity.setAnchorRef(bo.getRetrievalScope().getAnchorRef());
        entity.setScopeSummary(bo.getRetrievalScope().getScopeSummary());
        entity.setScopeWindow(bo.getRetrievalScope().getScopeWindow());
        entity.setSourceIdsJson(writeJson(bo.getRetrievalScope().getSourceIds()));
        entity.setQuestionText(bo.getQuestionText());
        entity.setAnswerSummary(bo.getAnswerSummary());
        entity.setSourceSummary(bo.getSourceSummary());
        entity.setSourceRefsJson(writeJson(bo.getSourceRefs()));
        entity.setReferenceMissing(Boolean.TRUE.equals(bo.getReferenceMissing()));
        entity.setOverallFailed(Boolean.TRUE.equals(bo.getOverallFailed()));
        entity.setPersistenceStatus(resolveKnowledgeStatus(bo));
        entity.setChatTime(now);
        knowledgeChatLogMapper.insert(entity);
        return toKnowledgeChatVo(entity);
    }

    public XmPersistenceSyncVo.KnowledgeChatSyncVo getKnowledgeChat(String chatLogId) {
        XmKnowledgeChatLog entity = knowledgeChatLogMapper.selectById(chatLogId);
        if (entity == null) {
            return null;
        }
        return toKnowledgeChatVo(entity);
    }

    @Transactional(rollbackFor = Exception.class)
    public XmPersistenceSyncVo.VideoPublicationSyncVo syncVideoPublication(XmPersistenceSyncBo.VideoPublicationSyncBo bo) {
        XmPersistenceSyncVo.VideoPublicationSyncVo existing = videoPublicationMapper.selectByTaskRefId(
            normalizeWorkType(bo.getWorkType()),
            bo.getTaskRefId()
        );
        XmPersistenceSyncBo.VideoPublicationSyncBo record = normalizeVideoPublication(bo, existing);
        if (existing == null) {
            int inserted = videoPublicationMapper.insertPublication(record);
            if (inserted != 1) {
                throw new ServiceException("视频公开记录写入失败");
            }
        } else {
            int updated = videoPublicationMapper.updatePublication(record);
            if (updated != 1) {
                throw new ServiceException("视频公开记录版本冲突，请重试");
            }
        }
        return getVideoPublication(record.getTaskRefId());
    }

    public XmPersistenceSyncVo.VideoPublicationSyncVo getVideoPublication(String taskRefId) {
        return videoPublicationMapper.selectByTaskRefId("video", taskRefId);
    }

    public TableDataInfo<XmPersistenceSyncVo.VideoPublicationSyncVo> listVideoPublications(
        XmPersistenceSyncBo.VideoPublicationQueryBo bo,
        PageQuery pageQuery
    ) {
        XmPersistenceSyncBo.VideoPublicationQueryBo query = bo == null ? new XmPersistenceSyncBo.VideoPublicationQueryBo() : bo;
        query.setWorkType(normalizeWorkType(query.getWorkType()));
        PageQuery resolvedPageQuery = pageQuery == null ? new PageQuery(PageQuery.DEFAULT_PAGE_SIZE, PageQuery.DEFAULT_PAGE_NUM) : pageQuery;
        Page<?> page = resolvedPageQuery.build();
        long total = videoPublicationMapper.countPublications(query);
        if (total <= 0) {
            return new TableDataInfo<>(List.of(), 0);
        }
        long offset = (page.getCurrent() - 1) * page.getSize();
        List<XmPersistenceSyncVo.VideoPublicationSyncVo> rows = videoPublicationMapper.selectPublications(
            query,
            offset,
            page.getSize()
        );
        return new TableDataInfo<>(rows, total);
    }

    @Transactional(rollbackFor = Exception.class)
    public XmPersistenceSyncVo.SessionArtifactBatchSyncVo syncSessionArtifacts(XmPersistenceSyncBo.SessionArtifactBatchSyncBo bo) {
        XmPersistenceSyncBo.SessionArtifactBatchSyncBo batch = normalizeSessionArtifacts(bo);
        sessionArtifactMapper.deleteBySession(batch.getSessionType(), batch.getSessionRefId());
        if (!safeList(batch.getArtifacts()).isEmpty()) {
            sessionArtifactMapper.insertBatch(batch.getArtifacts());
        }

        XmPersistenceSyncVo.SessionArtifactBatchSyncVo response = new XmPersistenceSyncVo.SessionArtifactBatchSyncVo();
        response.setSessionType(batch.getSessionType());
        response.setSessionRefId(batch.getSessionRefId());
        response.setPayloadRef(batch.getPayloadRef());
        response.setSyncedCount(safeList(batch.getArtifacts()).size());
        response.setArtifacts(
            safeList(batch.getArtifacts()).stream()
                .map(this::toSessionArtifactVo)
                .toList()
        );
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public XmPersistenceSyncVo.LearningResultBatchSyncVo syncLearningResults(XmPersistenceSyncBo.LearningResultBatchSyncBo bo) {
        XmPersistenceSyncVo.LearningResultBatchSyncVo response = new XmPersistenceSyncVo.LearningResultBatchSyncVo();
        response.setUserId(bo.getUserId());
        response.setRecords(
            safeList(bo.getRecords()).stream()
                .map(record -> persistLearningRecord(bo.getUserId(), record))
                .toList()
        );
        response.setTableSummary(new LinkedHashMap<>(Map.of(
            "checkpoint", "xm_learning_record",
            "quiz", "xm_quiz_result",
            "wrongbook", "xm_learning_wrongbook",
            "recommendation", "xm_learning_recommendation",
            "path", "xm_learning_path"
        )));
        return response;
    }

    private XmPersistenceSyncVo.LearningResultSyncItemVo persistLearningRecord(String userId, XmPersistenceSyncBo.LearningResultSyncItemBo source) {
        XmPersistenceSyncBo.LearningResultSyncItemBo record = normalizeLearningRecord(userId, source);
        switch (record.getResultType()) {
            case "checkpoint" -> persistCheckpointRecord(record);
            case "quiz" -> persistQuizRecord(record);
            case "wrongbook" -> persistWrongbookRecord(record);
            case "recommendation" -> persistRecommendationRecord(record);
            case "path" -> persistPathRecord(record);
            default -> throw new ServiceException("暂不支持的 learning resultType: " + record.getResultType());
        }
        return toLearningResultVo(record);
    }

    private void persistCheckpointRecord(XmPersistenceSyncBo.LearningResultSyncItemBo record) {
        XmPersistenceSyncBo.LearningResultSyncItemBo existing = selectExistingAggregate(record);
        if (existing == null) {
            record.setRecordId(nextLongId());
            learningResultMapper.insertCheckpointRecord(record);
            return;
        }
        reuseExistingAggregate(record, existing);
        learningResultMapper.updateAggregateRecord(record);
    }

    private void persistQuizRecord(XmPersistenceSyncBo.LearningResultSyncItemBo record) {
        upsertAggregateRecord(record);
        XmPersistenceSyncBo.LearningResultSyncItemBo existingDetail = learningResultMapper.selectQuizRecordByRecordId(record.getRecordId());
        if (existingDetail == null) {
            record.setGeneratedId(nextLongId());
            learningResultMapper.insertQuizRecord(record);
            return;
        }
        record.setGeneratedId(existingDetail.getGeneratedId());
        learningResultMapper.updateQuizRecord(record);
    }

    private void persistWrongbookRecord(XmPersistenceSyncBo.LearningResultSyncItemBo record) {
        upsertAggregateRecord(record);
        XmPersistenceSyncBo.LearningResultSyncItemBo existingDetail = learningResultMapper.selectWrongbookRecordByRecordId(record.getRecordId());
        if (existingDetail == null) {
            record.setGeneratedId(nextLongId());
            learningResultMapper.insertWrongbookRecord(record);
            return;
        }
        record.setGeneratedId(existingDetail.getGeneratedId());
        learningResultMapper.updateWrongbookRecord(record);
    }

    private void persistRecommendationRecord(XmPersistenceSyncBo.LearningResultSyncItemBo record) {
        upsertAggregateRecord(record);
        XmPersistenceSyncBo.LearningResultSyncItemBo existingDetail = learningResultMapper.selectRecommendationRecordByRecordId(record.getRecordId());
        if (existingDetail == null) {
            record.setGeneratedId(nextLongId());
            learningResultMapper.insertRecommendationRecord(record);
            return;
        }
        record.setGeneratedId(existingDetail.getGeneratedId());
        learningResultMapper.updateRecommendationRecord(record);
    }

    private void persistPathRecord(XmPersistenceSyncBo.LearningResultSyncItemBo record) {
        XmPersistenceSyncBo.LearningResultSyncItemBo existing = selectExistingAggregate(record);
        if (existing != null) {
            reuseExistingAggregate(record, existing);
            record.setVersionNo(maxVersion(existing.getVersionNo(), record.getVersionNo()));
            record.setUpdatedAt(latestDate(existing.getUpdatedAt(), record.getUpdatedAt()));
            record.setOccurredAt(latestDate(existing.getOccurredAt(), record.getOccurredAt()));
        } else {
            record.setRecordId(nextLongId());
            learningResultMapper.insertAggregateRecord(record);
        }
        XmPersistenceSyncBo.LearningResultSyncItemBo existingDetail = learningResultMapper.selectPathRecordByRecordId(record.getRecordId());
        if (existingDetail == null) {
            record.setGeneratedId(nextLongId());
            learningResultMapper.insertPathRecord(record);
            if (existing != null) {
                learningResultMapper.updateAggregateRecord(record);
            }
            return;
        }
        record.setGeneratedId(existingDetail.getGeneratedId());
        if (existing != null) {
            learningResultMapper.updateAggregateRecord(record);
        }
        learningResultMapper.updatePathRecord(record);
    }

    private void upsertAggregateRecord(XmPersistenceSyncBo.LearningResultSyncItemBo record) {
        XmPersistenceSyncBo.LearningResultSyncItemBo existing = selectExistingAggregate(record);
        if (existing == null) {
            record.setRecordId(nextLongId());
            learningResultMapper.insertAggregateRecord(record);
            return;
        }
        reuseExistingAggregate(record, existing);
        learningResultMapper.updateAggregateRecord(record);
    }

    private XmPersistenceSyncBo.LearningResultSyncItemBo selectExistingAggregate(XmPersistenceSyncBo.LearningResultSyncItemBo record) {
        return learningResultMapper.selectAggregateRecord(
            record.getUserId(),
            record.getTableName(),
            record.getSourceResultId()
        );
    }

    private void reuseExistingAggregate(
        XmPersistenceSyncBo.LearningResultSyncItemBo target,
        XmPersistenceSyncBo.LearningResultSyncItemBo existing
    ) {
        target.setRecordId(existing.getRecordId());
        if (StringUtils.isBlank(target.getSourceResultId())) {
            target.setSourceResultId(existing.getSourceResultId());
        }
    }

    private XmPersistenceSyncBo.LearningResultSyncItemBo normalizeLearningRecord(
        String userId,
        XmPersistenceSyncBo.LearningResultSyncItemBo source
    ) {
        XmPersistenceSyncBo.LearningResultSyncItemBo record = new XmPersistenceSyncBo.LearningResultSyncItemBo();
        Date occurredAt = source.getOccurredAt() == null ? source.getUpdatedAt() : source.getOccurredAt();
        Date updatedAt = source.getUpdatedAt() == null ? occurredAt : source.getUpdatedAt();
        if (occurredAt == null) {
            occurredAt = new Date();
        }
        if (updatedAt == null) {
            updatedAt = occurredAt;
        }
        record.setUserId(userId);
        record.setResultType(source.getResultType());
        record.setSourceType(source.getSourceType());
        record.setSourceSessionId(source.getSourceSessionId());
        record.setSourceTaskId(source.getSourceTaskId());
        record.setSourceResultId(firstNotBlank(
            source.getSourceResultId(),
            source.getDetailRef(),
            source.getSourceTaskId(),
            source.getResultType() + ":" + source.getSourceSessionId()
        ));
        record.setOccurredAt(occurredAt);
        record.setUpdatedAt(updatedAt);
        record.setScore(source.getScore());
        record.setQuestionTotal(source.getQuestionTotal());
        record.setCorrectTotal(source.getCorrectTotal());
        record.setQuestionText(source.getQuestionText());
        record.setWrongAnswerText(source.getWrongAnswerText());
        record.setReferenceAnswerText(source.getReferenceAnswerText());
        record.setTargetType(source.getTargetType());
        record.setTargetRefId(source.getTargetRefId());
        record.setPathTitle(source.getPathTitle());
        record.setStepCount(source.getStepCount());
        record.setAnalysisSummary(source.getAnalysisSummary());
        record.setStatus(StringUtils.isBlank(source.getStatus()) ? "completed" : source.getStatus());
        record.setDetailRef(StringUtils.isNotBlank(source.getDetailRef()) ? source.getDetailRef() : firstNotBlank(record.getSourceResultId(), source.getSourceSessionId()));
        record.setVersionNo(source.getVersionNo());
        record.setTableName(resolveLearningTableName(source.getResultType()));
        record.setDisplayName(resolveLearningDisplayName(source.getResultType()));
        record.setNote(resolveLearningNote(source.getResultType()));
        if ("path".equals(source.getResultType()) && record.getVersionNo() == null) {
            record.setVersionNo(1);
        }
        return record;
    }

    private String resolveLearningTableName(String resultType) {
        return switch (resultType) {
            case "checkpoint" -> "xm_learning_record";
            case "quiz" -> "xm_quiz_result";
            case "wrongbook" -> "xm_learning_wrongbook";
            case "recommendation" -> "xm_learning_recommendation";
            case "path" -> "xm_learning_path";
            default -> throw new ServiceException("暂不支持的 learning resultType: " + resultType);
        };
    }

    private String resolveLearningDisplayName(String resultType) {
        return switch (resultType) {
            case "checkpoint" -> "学习起点 / checkpoint";
            case "quiz" -> "测验结果";
            case "wrongbook" -> "错题本";
            case "recommendation" -> "知识推荐";
            case "path" -> "学习路径";
            default -> resultType;
        };
    }

    private String resolveLearningNote(String resultType) {
        return switch (resultType) {
            case "checkpoint" -> "学习起点结果记录，供学习中心聚合与回看。";
            case "quiz" -> "测验完成后沉淀为长期结果，不回退到运行态。";
            case "wrongbook" -> "错题本挂接测验来源，便于后续回看与导出。";
            case "recommendation" -> "推荐结果作为长期学习资产保留，不丢失来源。";
            case "path" -> "路径记录必须保留版本信息，不能简单覆盖。";
            default -> resultType;
        };
    }

    private XmPersistenceSyncBo.VideoPublicationSyncBo normalizeVideoPublication(
        XmPersistenceSyncBo.VideoPublicationSyncBo source,
        XmPersistenceSyncVo.VideoPublicationSyncVo existing
    ) {
        Date now = new Date();
        if (source == null || StringUtils.isBlank(source.getTaskRefId())) {
            throw new ServiceException("视频公开记录缺少 taskRefId");
        }
        XmPersistenceSyncBo.VideoPublicationSyncBo record = new XmPersistenceSyncBo.VideoPublicationSyncBo();
        Long userId = source.getUserId() == null
            ? (existing == null ? null : requireNumericUserId(existing.getUserId()))
            : source.getUserId();
        if (userId == null) {
            throw new ServiceException("视频公开记录缺少 userId");
        }
        record.setId(existing == null ? nextLongId() : existing.getWorkId());
        record.setUserId(userId);
        record.setWorkType(normalizeWorkType(source.getWorkType()));
        record.setTaskRefId(source.getTaskRefId());
        record.setTitle(firstNotBlank(source.getTitle(), existing == null ? null : existing.getTitle(), source.getTaskRefId()));
        record.setDescription(firstNotBlank(source.getDescription(), existing == null ? null : existing.getDescription()));
        record.setCoverUrl(firstNotBlank(source.getCoverUrl(), existing == null ? null : existing.getCoverUrl()));
        record.setIsPublic(Boolean.TRUE.equals(source.getIsPublic()));
        record.setStatus(firstNotBlank(source.getStatus(), existing == null ? null : existing.getStatus(), "normal"));
        record.setCreateBy(existing == null ? userId : null);
        record.setUpdateBy(userId);
        record.setCreatedAt(existing == null ? now : (existing.getCreatedAt() == null ? now : existing.getCreatedAt()));
        record.setUpdatedAt(now);
        Integer previousVersion = existing == null ? null : (existing.getVersion() == null ? 0 : existing.getVersion());
        record.setPreviousVersion(previousVersion);
        record.setVersion(existing == null ? 0 : (previousVersion + 1));
        return record;
    }

    private XmPersistenceSyncBo.SessionArtifactBatchSyncBo normalizeSessionArtifacts(
        XmPersistenceSyncBo.SessionArtifactBatchSyncBo source
    ) {
        if (source == null || StringUtils.isBlank(source.getSessionRefId())) {
            throw new ServiceException("Session artifact 缺少 sessionRefId");
        }
        XmPersistenceSyncBo.SessionArtifactBatchSyncBo batch = new XmPersistenceSyncBo.SessionArtifactBatchSyncBo();
        Date occurredAt = source.getOccurredAt() == null ? new Date() : source.getOccurredAt();
        batch.setSessionType(StringUtils.defaultIfBlank(source.getSessionType(), "video"));
        batch.setSessionRefId(source.getSessionRefId());
        batch.setObjectKey(source.getObjectKey());
        batch.setPayloadRef(source.getPayloadRef());
        batch.setOccurredAt(occurredAt);

        List<XmPersistenceSyncBo.SessionArtifactItemBo> items = new ArrayList<>();
        for (XmPersistenceSyncBo.SessionArtifactItemBo item : safeList(source.getArtifacts())) {
            XmPersistenceSyncBo.SessionArtifactItemBo normalized = new XmPersistenceSyncBo.SessionArtifactItemBo();
            normalized.setId(nextLongId());
            normalized.setSessionType(batch.getSessionType());
            normalized.setSessionRefId(batch.getSessionRefId());
            normalized.setArtifactType(item.getArtifactType());
            normalized.setAnchorType(item.getAnchorType());
            normalized.setAnchorKey(item.getAnchorKey());
            normalized.setSequenceNo(item.getSequenceNo());
            normalized.setTitle(item.getTitle());
            normalized.setSummary(item.getSummary());
            normalized.setObjectKey(firstNotBlank(item.getObjectKey(), batch.getObjectKey()));
            normalized.setPayloadRef(firstNotBlank(item.getPayloadRef(), batch.getPayloadRef()));
            normalized.setMetadata(item.getMetadata() == null ? Map.of() : item.getMetadata());
            normalized.setMetadataJson(writeJson(normalized.getMetadata()));
            normalized.setOccurredAt(item.getOccurredAt() == null ? occurredAt : item.getOccurredAt());
            items.add(normalized);
        }
        batch.setArtifacts(items);
        return batch;
    }

    private XmPersistenceSyncVo.SessionArtifactSyncVo toSessionArtifactVo(XmPersistenceSyncBo.SessionArtifactItemBo record) {
        XmPersistenceSyncVo.SessionArtifactSyncVo vo = new XmPersistenceSyncVo.SessionArtifactSyncVo();
        vo.setSessionType(record.getSessionType());
        vo.setSessionRefId(record.getSessionRefId());
        vo.setArtifactType(record.getArtifactType());
        vo.setAnchorType(record.getAnchorType());
        vo.setAnchorKey(record.getAnchorKey());
        vo.setSequenceNo(record.getSequenceNo());
        vo.setTitle(record.getTitle());
        vo.setSummary(record.getSummary());
        vo.setObjectKey(record.getObjectKey());
        vo.setPayloadRef(record.getPayloadRef());
        vo.setMetadata(record.getMetadata() == null ? Map.of() : record.getMetadata());
        vo.setOccurredAt(record.getOccurredAt());
        return vo;
    }

    private XmPersistenceSyncVo.CompanionTurnSyncVo toCompanionVo(XmCompanionTurn entity, List<XmWhiteboardActionLog> actions) {
        XmPersistenceSyncVo.CompanionTurnSyncVo vo = new XmPersistenceSyncVo.CompanionTurnSyncVo();
        vo.setTurnId(entity.getTurnId());
        vo.setSessionId(entity.getSessionId());
        vo.setUserId(entity.getUserId());
        vo.setContextType(entity.getContextType());
        vo.setAnchor(toAnchorVo(entity));
        vo.setQuestionText(entity.getQuestionText());
        vo.setAnswerSummary(entity.getAnswerSummary());
        vo.setSourceSummary(entity.getSourceSummary());
        vo.setSourceRefs(readSourceRefs(entity.getSourceRefsJson()));
        vo.setWhiteboardActions(actions.stream().map(this::toWhiteboardActionVo).toList());
        vo.setWhiteboardDegraded(entity.getWhiteboardDegraded());
        vo.setReferenceMissing(entity.getReferenceMissing());
        vo.setOverallFailed(entity.getOverallFailed());
        vo.setPersistenceStatus(entity.getPersistenceStatus());
        vo.setCreatedAt(entity.getTurnTime());
        return vo;
    }

    private XmPersistenceSyncVo.WhiteboardActionVo toWhiteboardActionVo(XmWhiteboardActionLog entity) {
        XmPersistenceSyncVo.WhiteboardActionVo vo = new XmPersistenceSyncVo.WhiteboardActionVo();
        vo.setActionId(entity.getActionId());
        vo.setTurnId(entity.getTurnId());
        vo.setSessionId(entity.getSessionId());
        vo.setUserId(entity.getUserId());
        vo.setActionType(entity.getActionType());
        vo.setPayload(readObjectMap(entity.getActionPayloadJson()));
        vo.setObjectRef(entity.getObjectRef());
        vo.setRenderUri(entity.getRenderUri());
        vo.setRenderState(entity.getRenderState());
        vo.setCreatedAt(entity.getActionTime());
        return vo;
    }

    private XmPersistenceSyncVo.KnowledgeChatSyncVo toKnowledgeChatVo(XmKnowledgeChatLog entity) {
        XmPersistenceSyncVo.KnowledgeChatSyncVo vo = new XmPersistenceSyncVo.KnowledgeChatSyncVo();
        vo.setChatLogId(entity.getChatLogId());
        vo.setSessionId(entity.getSessionId());
        vo.setUserId(entity.getUserId());
        vo.setContextType(entity.getContextType());
        vo.setRetrievalScope(toAnchorVo(entity));
        vo.setQuestionText(entity.getQuestionText());
        vo.setAnswerSummary(entity.getAnswerSummary());
        vo.setSourceSummary(entity.getSourceSummary());
        vo.setSourceRefs(readSourceRefs(entity.getSourceRefsJson()));
        vo.setReferenceMissing(entity.getReferenceMissing());
        vo.setOverallFailed(entity.getOverallFailed());
        vo.setPersistenceStatus(entity.getPersistenceStatus());
        vo.setCreatedAt(entity.getChatTime());
        return vo;
    }

    private XmPersistenceSyncVo.AnchorVo toAnchorVo(XmCompanionTurn entity) {
        XmPersistenceSyncVo.AnchorVo vo = new XmPersistenceSyncVo.AnchorVo();
        vo.setContextType(entity.getContextType());
        vo.setAnchorKind(entity.getAnchorKind());
        vo.setAnchorRef(entity.getAnchorRef());
        vo.setScopeSummary(entity.getScopeSummary());
        vo.setScopeWindow(entity.getScopeWindow());
        vo.setSourceIds(readStringList(entity.getSourceIdsJson()));
        return vo;
    }

    private XmPersistenceSyncVo.AnchorVo toAnchorVo(XmKnowledgeChatLog entity) {
        XmPersistenceSyncVo.AnchorVo vo = new XmPersistenceSyncVo.AnchorVo();
        vo.setContextType(entity.getContextType());
        vo.setAnchorKind(entity.getAnchorKind());
        vo.setAnchorRef(entity.getAnchorRef());
        vo.setScopeSummary(entity.getScopeSummary());
        vo.setScopeWindow(entity.getScopeWindow());
        vo.setSourceIds(readStringList(entity.getSourceIdsJson()));
        return vo;
    }

    private XmPersistenceSyncVo.LearningResultSyncItemVo toLearningResultVo(XmPersistenceSyncBo.LearningResultSyncItemBo record) {
        XmPersistenceSyncVo.LearningResultSyncItemVo vo = new XmPersistenceSyncVo.LearningResultSyncItemVo();
        vo.setTableName(record.getTableName());
        vo.setUserId(record.getUserId());
        vo.setResultType(record.getResultType());
        vo.setSourceType(record.getSourceType());
        vo.setSourceSessionId(record.getSourceSessionId());
        vo.setSourceTaskId(record.getSourceTaskId());
        vo.setSourceResultId(record.getSourceResultId());
        vo.setOccurredAt(record.getOccurredAt());
        vo.setUpdatedAt(record.getUpdatedAt());
        vo.setScore(record.getScore());
        vo.setQuestionTotal(record.getQuestionTotal());
        vo.setCorrectTotal(record.getCorrectTotal());
        vo.setQuestionText(record.getQuestionText());
        vo.setWrongAnswerText(record.getWrongAnswerText());
        vo.setReferenceAnswerText(record.getReferenceAnswerText());
        vo.setTargetType(record.getTargetType());
        vo.setTargetRefId(record.getTargetRefId());
        vo.setPathTitle(record.getPathTitle());
        vo.setStepCount(record.getStepCount());
        vo.setAnalysisSummary(record.getAnalysisSummary());
        vo.setStatus(record.getStatus());
        vo.setDetailRef(record.getDetailRef());
        vo.setVersionNo(record.getVersionNo());
        return vo;
    }

    private List<XmWhiteboardActionLog> listWhiteboardActionsByTurnId(String turnId) {
        LambdaQueryWrapper<XmWhiteboardActionLog> query = Wrappers.lambdaQuery();
        query.eq(XmWhiteboardActionLog::getTurnId, turnId);
        query.orderByAsc(XmWhiteboardActionLog::getActionTime, XmWhiteboardActionLog::getActionId);
        return whiteboardActionLogMapper.selectList(query);
    }

    private String resolveCompanionStatus(XmPersistenceSyncBo.CompanionTurnSyncBo bo) {
        if (StringUtils.isNotBlank(bo.getPersistenceStatus())) {
            return bo.getPersistenceStatus();
        }
        if (Boolean.TRUE.equals(bo.getOverallFailed())) {
            return "overall_failure";
        }
        if (Boolean.TRUE.equals(bo.getWhiteboardDegraded()) && Boolean.TRUE.equals(bo.getReferenceMissing())) {
            return "partial_failure";
        }
        if (Boolean.TRUE.equals(bo.getWhiteboardDegraded())) {
            return "whiteboard_degraded";
        }
        if (Boolean.TRUE.equals(bo.getReferenceMissing())) {
            return "reference_missing";
        }
        return "complete_success";
    }

    private String resolveKnowledgeStatus(XmPersistenceSyncBo.KnowledgeChatSyncBo bo) {
        if (StringUtils.isNotBlank(bo.getPersistenceStatus())) {
            return bo.getPersistenceStatus();
        }
        if (Boolean.TRUE.equals(bo.getOverallFailed())) {
            return "overall_failure";
        }
        if (Boolean.TRUE.equals(bo.getReferenceMissing())) {
            return "reference_missing";
        }
        return "complete_success";
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new ServiceException("序列化长期记录字段失败");
        }
    }

    private List<String> readStringList(String json) {
        if (StringUtils.isBlank(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (JsonProcessingException e) {
            throw new ServiceException("解析长期记录字段失败");
        }
    }

    private List<XmPersistenceSyncVo.SourceReferenceVo> readSourceRefs(String json) {
        if (StringUtils.isBlank(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<XmPersistenceSyncVo.SourceReferenceVo>>() {
            });
        } catch (JsonProcessingException e) {
            throw new ServiceException("解析来源引用失败");
        }
    }

    private Map<String, Object> readObjectMap(String json) {
        if (StringUtils.isBlank(json)) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (JsonProcessingException e) {
            throw new ServiceException("解析白板动作失败");
        }
    }

    private String firstNotBlank(String... values) {
        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private Long nextLongId() {
        try {
            return IdGeneratorUtil.nextLongId();
        } catch (Throwable ignored) {
            return IdWorker.getId();
        }
    }

    private String nextIdWithPrefix(String prefix) {
        try {
            return IdGeneratorUtil.nextIdWithPrefix(prefix);
        } catch (Throwable ignored) {
            return prefix + IdWorker.getIdStr();
        }
    }

    private String normalizeWorkType(String workType) {
        return StringUtils.isBlank(workType) ? "video" : workType;
    }

    private Long requireNumericUserId(String userId) {
        if (StringUtils.isBlank(userId)) {
            return null;
        }
        try {
            return Long.valueOf(userId);
        } catch (NumberFormatException ex) {
            throw new ServiceException("视频公开记录 userId 必须为数字: " + userId);
        }
    }

    private Integer maxVersion(Integer first, Integer second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        return Math.max(first, second);
    }

    private Date latestDate(Date first, Date second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        return first.after(second) ? first : second;
    }

    private <T> List<T> safeList(List<T> value) {
        return value == null ? List.of() : value;
    }
}
