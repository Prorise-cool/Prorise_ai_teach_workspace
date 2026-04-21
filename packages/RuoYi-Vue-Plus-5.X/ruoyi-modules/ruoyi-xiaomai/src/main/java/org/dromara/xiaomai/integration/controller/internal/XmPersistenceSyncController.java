package org.dromara.xiaomai.integration.controller.internal;

import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.integration.domain.bo.XmPersistenceSyncBo;
import org.dromara.xiaomai.integration.domain.vo.XmPersistenceSyncVo;
import org.dromara.xiaomai.integration.service.XmPersistenceSyncService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Epic 10 internal sync 控制器。
 *
 * <p>供 FastAPI 防腐层调用，不暴露为后台 RBAC 菜单能力。</p>
 *
 * @author Codex
 */
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/xiaomai")
public class XmPersistenceSyncController {

    private final XmPersistenceSyncService xmPersistenceSyncService;

    @PostMapping("/companion/turns")
    public R<XmPersistenceSyncVo.CompanionTurnSyncVo> syncCompanionTurn(@RequestBody XmPersistenceSyncBo.CompanionTurnSyncBo bo) {
        return R.ok(xmPersistenceSyncService.syncCompanionTurn(bo));
    }

    @GetMapping("/companion/turns/{turnId}")
    public R<XmPersistenceSyncVo.CompanionTurnSyncVo> getCompanionTurn(@PathVariable String turnId) {
        XmPersistenceSyncVo.CompanionTurnSyncVo data = xmPersistenceSyncService.getCompanionTurn(turnId);
        return data == null ? R.fail("Companion turn not found") : R.ok(data);
    }

    @GetMapping("/companion/sessions/{sessionId}/replay")
    public R<XmPersistenceSyncVo.SessionReplaySyncVo> replaySession(@PathVariable String sessionId) {
        return R.ok(xmPersistenceSyncService.replaySession(sessionId));
    }

    @PostMapping("/knowledge/chat-logs")
    public R<XmPersistenceSyncVo.KnowledgeChatSyncVo> syncKnowledgeChat(@RequestBody XmPersistenceSyncBo.KnowledgeChatSyncBo bo) {
        return R.ok(xmPersistenceSyncService.syncKnowledgeChat(bo));
    }

    @GetMapping("/knowledge/chat-logs/{chatLogId}")
    public R<XmPersistenceSyncVo.KnowledgeChatSyncVo> getKnowledgeChat(@PathVariable String chatLogId) {
        XmPersistenceSyncVo.KnowledgeChatSyncVo data = xmPersistenceSyncService.getKnowledgeChat(chatLogId);
        return data == null ? R.fail("Knowledge chat log not found") : R.ok(data);
    }

    @PostMapping("/video/publications")
    public R<XmPersistenceSyncVo.VideoPublicationSyncVo> syncVideoPublication(@RequestBody XmPersistenceSyncBo.VideoPublicationSyncBo bo) {
        return R.ok(xmPersistenceSyncService.syncVideoPublication(bo));
    }

    @GetMapping("/video/publications/{taskRefId}")
    public R<XmPersistenceSyncVo.VideoPublicationSyncVo> getVideoPublication(@PathVariable String taskRefId) {
        XmPersistenceSyncVo.VideoPublicationSyncVo data = xmPersistenceSyncService.getVideoPublication(taskRefId);
        return data == null ? R.fail("Video publication not found") : R.ok(data);
    }

    @GetMapping("/video/publications")
    public TableDataInfo<XmPersistenceSyncVo.VideoPublicationSyncVo> listVideoPublications(
        XmPersistenceSyncBo.VideoPublicationQueryBo bo,
        PageQuery pageQuery
    ) {
        return xmPersistenceSyncService.listVideoPublications(bo, pageQuery);
    }

    @PostMapping("/video/session-artifacts")
    public R<XmPersistenceSyncVo.SessionArtifactBatchSyncVo> syncVideoSessionArtifacts(
        @RequestBody XmPersistenceSyncBo.SessionArtifactBatchSyncBo bo
    ) {
        return R.ok(xmPersistenceSyncService.syncSessionArtifacts(bo));
    }

    @PostMapping("/learning/results")
    public R<XmPersistenceSyncVo.LearningResultBatchSyncVo> syncLearningResults(@RequestBody XmPersistenceSyncBo.LearningResultBatchSyncBo bo) {
        return R.ok(xmPersistenceSyncService.syncLearningResults(bo));
    }

    @GetMapping("/learning/paths/payload")
    public R<XmPersistenceSyncVo.LearningPathPayloadVo> getLearningPathPayload(
        @RequestParam String userId,
        @RequestParam String sourceResultId
    ) {
        XmPersistenceSyncVo.LearningPathPayloadVo data = xmPersistenceSyncService.getLearningPathPayload(userId, sourceResultId);
        return data == null ? R.fail("Learning path payload not found") : R.ok(data);
    }
}
