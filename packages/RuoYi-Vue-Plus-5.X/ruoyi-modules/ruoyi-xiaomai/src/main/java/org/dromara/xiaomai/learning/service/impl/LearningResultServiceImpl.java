package org.dromara.xiaomai.learning.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.integration.domain.bo.XmPersistenceSyncBo;
import org.dromara.xiaomai.learning.domain.bo.LearningResultBo;
import org.dromara.xiaomai.learning.domain.vo.LearningResultVo;
import org.dromara.xiaomai.learning.domain.vo.QuizHistoryItemVo;
import org.dromara.xiaomai.learning.domain.vo.QuizHistoryVo;
import org.dromara.xiaomai.learning.mapper.LearningResultMapper;
import org.dromara.xiaomai.learning.service.ILearningResultService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 学习结果长期承接服务实现。
 *
 * @author Codex
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LearningResultServiceImpl implements ILearningResultService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<Map<String, Object>>> ITEM_LIST_TYPE =
        new TypeReference<List<Map<String, Object>>>() {};

    private final LearningResultMapper baseMapper;

    @Override
    public List<LearningResultVo> queryCatalogList(LearningResultBo bo) {
        return baseMapper.selectCatalogRecords(bo == null ? new LearningResultBo() : bo);
    }

    @Override
    public TableDataInfo<LearningResultVo> queryResultPage(LearningResultBo bo, PageQuery pageQuery) {
        PageQuery query = pageQuery == null ? new PageQuery(PageQuery.DEFAULT_PAGE_SIZE, PageQuery.DEFAULT_PAGE_NUM) : pageQuery;
        Page<LearningResultVo> page = query.build();
        long total = baseMapper.countResultRecords(bo == null ? new LearningResultBo() : bo);
        if (total <= 0) {
            return new TableDataInfo<>(List.of(), 0);
        }
        long offset = (page.getCurrent() - 1) * page.getSize();
        List<LearningResultVo> rows = baseMapper.selectResultRecords(bo == null ? new LearningResultBo() : bo, offset, page.getSize());
        return new TableDataInfo<>(rows, total);
    }

    @Override
    public QuizHistoryVo queryQuizHistory(String quizId) {
        if (quizId == null || quizId.isBlank()) {
            return null;
        }
        XmPersistenceSyncBo.LearningResultSyncItemBo row = baseMapper.selectQuizBySourceResultId(quizId);
        if (row == null) {
            return null;
        }
        QuizHistoryVo vo = new QuizHistoryVo();
        vo.setQuizId(row.getSourceResultId() != null ? row.getSourceResultId() : quizId);
        vo.setSourceType(row.getSourceType());
        vo.setSourceSessionId(row.getSourceSessionId());
        vo.setSourceTaskId(row.getSourceTaskId());
        vo.setQuestionTotal(row.getQuestionTotal());
        vo.setCorrectTotal(row.getCorrectTotal());
        vo.setScore(row.getScore());
        vo.setSummary(row.getAnalysisSummary());
        vo.setOccurredAt(row.getOccurredAt());
        vo.setItems(parseItems(row.getQuestionItemsJson(), quizId));
        return vo;
    }

    private List<QuizHistoryItemVo> parseItems(String json, String quizId) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            List<Map<String, Object>> raw = OBJECT_MAPPER.readValue(json, ITEM_LIST_TYPE);
            List<QuizHistoryItemVo> items = new ArrayList<>(raw.size());
            for (Map<String, Object> entry : raw) {
                QuizHistoryItemVo item = new QuizHistoryItemVo();
                item.setQuestionId(asString(entry.get("questionId"), entry.get("question_id")));
                item.setStem(asString(entry.get("stem"), entry.get("questionText"), entry.get("question_text")));
                Object options = entry.get("options");
                if (options instanceof List<?> list) {
                    List<Map<String, Object>> optionList = new ArrayList<>(list.size());
                    for (Object option : list) {
                        if (option instanceof Map<?, ?> map) {
                            Map<String, Object> copy = new java.util.LinkedHashMap<>();
                            for (Map.Entry<?, ?> e : map.entrySet()) {
                                copy.put(String.valueOf(e.getKey()), e.getValue());
                            }
                            optionList.add(copy);
                        }
                    }
                    item.setOptions(optionList);
                }
                item.setSelectedOptionId(asString(entry.get("selectedOptionId"), entry.get("selected_option_id")));
                item.setCorrectOptionId(asString(entry.get("correctOptionId"), entry.get("correct_option_id")));
                Object isCorrect = entry.get("isCorrect");
                if (isCorrect == null) {
                    isCorrect = entry.get("is_correct");
                }
                item.setIsCorrect(isCorrect instanceof Boolean b ? b : null);
                item.setExplanation(asString(entry.get("explanation")));
                items.add(item);
            }
            return items;
        } catch (Exception ex) {
            log.warn("quiz history question_items_json parse failed: quizId={}, err={}", quizId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private String asString(Object... candidates) {
        for (Object candidate : candidates) {
            if (candidate != null) {
                return String.valueOf(candidate);
            }
        }
        return null;
    }
}
