package org.dromara.xiaomai.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.constant.XmPermissionConstants;
import org.dromara.xiaomai.domain.bo.XmModuleResourceBo;
import org.dromara.xiaomai.domain.vo.XmModuleBoundaryVo;
import org.dromara.xiaomai.domain.vo.XmModuleResourceVo;
import org.dromara.xiaomai.service.impl.XmModuleBoundaryServiceImpl;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 小麦模块边界服务测试。
 *
 * @author Codex
 */
@Tag("dev")
@Tag("local")
public class XmModuleBoundaryServiceImplTest {

    private final XmModuleBoundaryServiceImpl service = new XmModuleBoundaryServiceImpl();

    @Test
    void shouldFreezeRuoyiBoundaryAndFastapiGuardrail() {
        XmModuleBoundaryVo boundary = service.queryBoundary();

        assertEquals("ruoyi-xiaomai", boundary.getArtifactId());
        assertEquals("org.dromara.xiaomai", boundary.getBasePackage());
        assertTrue(boundary.getCoreAuthUnchanged());
        assertFalse(boundary.getParallelRbacAllowed());
        assertTrue(boundary.getAdminOnly());
        assertFalse(boundary.getProductDomainEnabled());
        assertTrue(boundary.getFastapiContract().contains("FastAPI 只消费 RuoYi 权限结果"));
        assertTrue(boundary.getExtensionDirectories().contains("org.dromara.xiaomai.controller.admin"));
    }

    @Test
    void shouldExposeEpic10PermissionPrefixes() {
        Set<String> prefixes = service.queryResourceList(new XmModuleResourceBo()).stream()
            .map(XmModuleResourceVo::getPermissionPrefix)
            .collect(Collectors.toSet());

        assertTrue(prefixes.contains(XmPermissionConstants.VIDEO_TASK_PREFIX));
        assertTrue(prefixes.contains(XmPermissionConstants.CLASSROOM_SESSION_PREFIX));
        assertTrue(prefixes.contains(XmPermissionConstants.LEARNING_RECORD_PREFIX));
        assertTrue(prefixes.contains(XmPermissionConstants.LEARNING_FAVORITE_PREFIX));
        assertTrue(prefixes.contains(XmPermissionConstants.COMPANION_TURN_PREFIX));
        assertTrue(prefixes.contains(XmPermissionConstants.EVIDENCE_CHAT_PREFIX));
        assertTrue(prefixes.contains(XmPermissionConstants.LEARNING_COACH_PREFIX));
        assertTrue(prefixes.contains(XmPermissionConstants.AUDIT_PREFIX));
    }

    @Test
    void shouldSupportFilteringAndPseudoPaging() {
        XmModuleResourceBo bo = new XmModuleResourceBo();
        bo.setImplementationMode("HANDWRITTEN_QUERY");

        TableDataInfo<XmModuleResourceVo> page = service.queryResourcePage(bo, new PageQuery(2, 1));

        assertEquals(2, page.getRows().size());
        assertTrue(page.getTotal() >= 5);
        assertTrue(page.getRows().stream().allMatch(item -> "HANDWRITTEN_QUERY".equals(item.getImplementationMode())));
    }
}
