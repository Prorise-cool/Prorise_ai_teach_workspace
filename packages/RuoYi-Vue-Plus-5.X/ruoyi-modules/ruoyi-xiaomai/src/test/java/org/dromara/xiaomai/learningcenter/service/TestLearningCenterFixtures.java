package org.dromara.xiaomai.learningcenter.service;

import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterActionBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterRecordVo;

import java.util.Date;

/**
 * 学习中心测试样例。
 *
 * @author Codex
 */
final class TestLearningCenterFixtures {

    private TestLearningCenterFixtures() {
    }

    static LearningCenterRecordVo sampleRecord(String sourceTable, String sourceResultId, String resultType) {
        LearningCenterRecordVo record = new LearningCenterRecordVo();
        record.setRecordId(sourceTable + ":" + sourceResultId);
        record.setUserId("student_001");
        record.setResultType(resultType);
        record.setSourceType(resultType);
        record.setSourceTable(sourceTable);
        record.setSourceResultId(sourceResultId);
        record.setSourceSessionId("session_001");
        record.setDisplayTitle("学习记录标题");
        record.setSummary("学习记录摘要");
        record.setStatus("completed");
        record.setDetailRef("detail://" + sourceResultId);
        record.setSourceTime(new Date());
        record.setFavorite(Boolean.TRUE);
        return record;
    }

    static LearningCenterActionBo favoriteAction(String userId, String sourceTable, String sourceResultId) {
        LearningCenterActionBo action = new LearningCenterActionBo();
        action.setUserId(userId);
        action.setSourceTable(sourceTable);
        action.setSourceResultId(sourceResultId);
        return action;
    }
}
