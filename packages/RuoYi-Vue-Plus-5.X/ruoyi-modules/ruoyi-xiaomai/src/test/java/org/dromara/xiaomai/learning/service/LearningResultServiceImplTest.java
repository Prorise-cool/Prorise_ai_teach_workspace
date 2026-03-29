package org.dromara.xiaomai.learning.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.learning.domain.bo.LearningResultBo;
import org.dromara.xiaomai.learning.domain.vo.LearningResultVo;
import org.dromara.xiaomai.learning.service.impl.LearningResultServiceImpl;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 学习结果长期承接服务测试。
 *
 * @author Codex
 */
@Tag("local")
public class LearningResultServiceImplTest {

    private final LearningResultServiceImpl service = new LearningResultServiceImpl();

    @Test
    void shouldExposeAllLearningResultTypes() {
        List<LearningResultVo> list = service.queryResultList(new LearningResultBo());

        assertEquals(5, list.size());
        assertTrue(list.stream().anyMatch(item -> "xm_learning_path".equals(item.getTableName())));
        assertTrue(list.stream().anyMatch(item -> "version_no + update_time，保留路径版本历史".equals(item.getVersionRule())));
    }

    @Test
    void shouldSupportFilteringAndPaging() {
        LearningResultBo bo = new LearningResultBo();
        bo.setResultType("path");

        List<LearningResultVo> filtered = service.queryResultList(bo);
        TableDataInfo<LearningResultVo> page = service.queryResultPage(bo, new PageQuery(1, 1));

        assertEquals(1, filtered.size());
        assertEquals("xm_learning_path", filtered.get(0).getTableName());
        assertEquals(1, page.getRows().size());
        assertEquals(1, page.getTotal());
    }
}
