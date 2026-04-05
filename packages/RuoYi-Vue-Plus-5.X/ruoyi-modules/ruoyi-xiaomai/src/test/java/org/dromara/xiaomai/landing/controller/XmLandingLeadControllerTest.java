package org.dromara.xiaomai.landing.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.idev.excel.annotation.ExcelProperty;
import jakarta.servlet.http.HttpServletResponse;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.xiaomai.landing.domain.bo.XmLandingLeadBo;
import org.dromara.xiaomai.landing.domain.vo.XmLandingLeadVo;
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
 * 营销落地页线索后台控制器契约测试。
 *
 * @author Codex
 */
@Tag("dev")
@Tag("local")
public class XmLandingLeadControllerTest {

    @Test
    void shouldFreezeAdminPermissionsAndRoutes() throws NoSuchMethodException {
        Method list = XmLandingLeadController.class.getMethod("list", XmLandingLeadBo.class, PageQuery.class);
        Method getInfo = XmLandingLeadController.class.getMethod("getInfo", Long.class);
        Method export = XmLandingLeadController.class.getMethod("export", XmLandingLeadBo.class, HttpServletResponse.class);

        assertArrayEquals(new String[]{"xiaomai:landingLead:list"}, list.getAnnotation(SaCheckPermission.class).value());
        assertArrayEquals(new String[]{"xiaomai:landingLead:query"}, getInfo.getAnnotation(SaCheckPermission.class).value());
        assertArrayEquals(new String[]{"xiaomai:landingLead:export"}, export.getAnnotation(SaCheckPermission.class).value());
        assertArrayEquals(new String[]{"/list"}, list.getAnnotation(GetMapping.class).value());
        assertArrayEquals(new String[]{"/{id}"}, getInfo.getAnnotation(GetMapping.class).value());
        assertArrayEquals(new String[]{"/export"}, export.getAnnotation(PostMapping.class).value());

        Log log = export.getAnnotation(Log.class);
        assertNotNull(log);
        assertEquals("营销落地页线索", log.title());
        assertEquals(BusinessType.EXPORT, log.businessType());
    }

    @Test
    void shouldExposeMinimalExportFields() throws NoSuchFieldException {
        assertExcelHeader("contactName", "联系人姓名");
        assertExcelHeader("organizationName", "机构 / 称呼");
        assertExcelHeader("contactEmail", "联系邮箱");
        assertExcelHeader("subject", "咨询主题");
        assertExcelHeader("message", "留言内容");
        assertExcelHeader("sourcePage", "来源页面");
        assertExcelHeader("processingStatus", "处理状态");
        assertExcelHeader("remark", "后台备注");
        assertExcelHeader("createTime", "创建时间");
    }

    private void assertExcelHeader(String fieldName, String expectedHeader) throws NoSuchFieldException {
        Field field = XmLandingLeadVo.class.getDeclaredField(fieldName);
        ExcelProperty excelProperty = field.getAnnotation(ExcelProperty.class);
        assertNotNull(excelProperty);
        assertEquals(expectedHeader, Arrays.stream(excelProperty.value()).findFirst().orElse(""));
    }
}
