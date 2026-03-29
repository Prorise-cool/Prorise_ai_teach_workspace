package org.dromara.xiaomai.audit.controller.admin;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.idev.excel.annotation.ExcelProperty;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.xiaomai.audit.domain.bo.AuditRecordBo;
import org.dromara.xiaomai.audit.domain.vo.AuditRecordVo;
import org.dromara.xiaomai.constant.XmPermissionConstants;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * 审计中心控制器与导出契约测试。
 *
 * @author Codex
 */
@Tag("local")
public class AuditCenterControllerTest {

    @Test
    void shouldFreezePermissionsAndExportLogSemantics() throws NoSuchMethodException {
        Method list = AuditCenterController.class.getMethod("list", AuditRecordBo.class, PageQuery.class);
        Method detail = AuditCenterController.class.getMethod("detail", String.class, String.class, String.class);
        Method export = AuditCenterController.class.getMethod(
            "export",
            AuditRecordBo.class,
            jakarta.servlet.http.HttpServletResponse.class
        );

        assertArrayEquals(new String[]{XmPermissionConstants.AUDIT_PREFIX + ":list"}, list.getAnnotation(SaCheckPermission.class).value());
        assertArrayEquals(new String[]{XmPermissionConstants.AUDIT_PREFIX + ":query"}, detail.getAnnotation(SaCheckPermission.class).value());
        assertArrayEquals(new String[]{XmPermissionConstants.AUDIT_PREFIX + ":export"}, export.getAnnotation(SaCheckPermission.class).value());
        assertArrayEquals(new String[]{"/list"}, list.getAnnotation(GetMapping.class).value());
        assertArrayEquals(new String[]{"/detail"}, detail.getAnnotation(GetMapping.class).value());
        assertArrayEquals(new String[]{"/export"}, export.getAnnotation(PostMapping.class).value());
        Log log = export.getAnnotation(Log.class);
        assertNotNull(log);
        assertEquals("审计中心", log.title());
        assertEquals(BusinessType.EXPORT, log.businessType());
    }

    @Test
    void shouldExposeMinimalExportFields() throws NoSuchFieldException {
        assertExcelHeader("recordId", "记录ID");
        assertExcelHeader("userId", "用户ID");
        assertExcelHeader("resultType", "结果类型");
        assertExcelHeader("sourceTable", "来源宿主表");
        assertExcelHeader("sourceResultId", "来源主键");
        assertExcelHeader("status", "状态");
        assertExcelHeader("displayTitle", "标题");
        assertExcelHeader("summary", "摘要");
        assertExcelHeader("sourceTime", "发生时间");
        assertExcelHeader("favorite", "是否收藏");
        assertExcelHeader("deleted", "删除标记");
        assertExcelHeader("deletedTime", "删除时间");
    }

    private void assertExcelHeader(String fieldName, String expectedHeader) throws NoSuchFieldException {
        Field field = AuditRecordVo.class.getDeclaredField(fieldName);
        ExcelProperty excelProperty = field.getAnnotation(ExcelProperty.class);
        assertNotNull(excelProperty);
        assertEquals(expectedHeader, Arrays.stream(excelProperty.value()).findFirst().orElse(""));
    }
}
