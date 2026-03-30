package org.dromara.xiaomai.learning.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learning.domain.bo.LearningResultBo;
import org.dromara.xiaomai.learning.domain.vo.LearningResultVo;
import org.dromara.xiaomai.learning.mapper.LearningResultMapper;
import org.dromara.xiaomai.learning.service.impl.LearningResultServiceImpl;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 学习结果长期承接服务测试。
 *
 * @author Codex
 */
@Tag("dev")
@Tag("local")
public class LearningResultServiceImplTest {

    @Test
    void shouldExposeLearningResultCatalogFromMapper() {
        LearningResultMapper mapper = mock(LearningResultMapper.class);
        LearningResultServiceImpl service = new LearningResultServiceImpl(mapper);
        LearningResultVo quiz = new LearningResultVo();
        quiz.setResultType("quiz");
        quiz.setTableName("xm_quiz_result");
        LearningResultVo path = new LearningResultVo();
        path.setResultType("path");
        path.setTableName("xm_learning_path");
        when(mapper.selectCatalogRecords(argThat(query -> query.getResultType() == null))).thenReturn(List.of(quiz, path));

        List<LearningResultVo> list = service.queryCatalogList(new LearningResultBo());

        assertEquals(2, list.size());
        assertTrue(list.stream().anyMatch(item -> "xm_quiz_result".equals(item.getTableName())));
        assertTrue(list.stream().anyMatch(item -> "xm_learning_path".equals(item.getTableName())));
    }

    @Test
    void shouldSupportFilteringAndPagingForRealRecords() {
        LearningResultMapper mapper = mock(LearningResultMapper.class);
        LearningResultServiceImpl service = new LearningResultServiceImpl(mapper);
        LearningResultBo bo = new LearningResultBo();
        bo.setResultType("path");
        LearningResultVo row = new LearningResultVo();
        row.setResultType("path");
        row.setTableName("xm_learning_path");
        row.setUserId("student_001");

        when(mapper.countResultRecords(argThat(query -> "path".equals(query.getResultType())))).thenReturn(1L);
        when(mapper.selectResultRecords(argThat(query -> "path".equals(query.getResultType())), eq(0L), eq(1L)))
            .thenReturn(List.of(row));

        TableDataInfo<LearningResultVo> page = service.queryResultPage(bo, new PageQuery(1, 1));

        assertEquals(1, page.getRows().size());
        assertEquals(1, page.getTotal());
        assertEquals("xm_learning_path", page.getRows().get(0).getTableName());
    }
}
