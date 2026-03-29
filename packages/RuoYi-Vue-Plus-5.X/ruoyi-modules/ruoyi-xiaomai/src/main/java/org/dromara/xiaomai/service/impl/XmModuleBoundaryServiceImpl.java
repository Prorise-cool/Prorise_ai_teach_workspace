package org.dromara.xiaomai.service.impl;

import lombok.RequiredArgsConstructor;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.constant.XmPermissionConstants;
import org.dromara.xiaomai.domain.bo.XmModuleResourceBo;
import org.dromara.xiaomai.domain.vo.XmModuleBoundaryVo;
import org.dromara.xiaomai.domain.vo.XmModuleResourceVo;
import org.dromara.xiaomai.service.IXmModuleBoundaryService;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 小麦模块边界服务实现。
 *
 * @author Codex
 */
@Service
@RequiredArgsConstructor
public class XmModuleBoundaryServiceImpl implements IXmModuleBoundaryService {

    private static final String FASTAPI_CONTRACT = "FastAPI 只消费 RuoYi 权限结果，通过防腐层交互，不复制 RBAC 真值。";

    private static final List<String> EXTENSION_DIRECTORIES = List.of(
        "org.dromara.xiaomai.controller.admin",
        "org.dromara.xiaomai.service",
        "org.dromara.xiaomai.domain.bo",
        "org.dromara.xiaomai.domain.vo",
        "org.dromara.xiaomai.mapper",
        "src/main/resources/mapper/xiaomai"
    );

    private static final List<XmModuleResourceVo> RESOURCE_CATALOG = List.of(
        buildResource(
            "video-task",
            "视频任务",
            "xm_video_task",
            XmPermissionConstants.VIDEO_TASK_PREFIX,
            "videoTask",
            "xiaomai/video-task/index",
            "CRUD_READY",
            "GENERATOR_CRUD",
            "list,query,add,edit,remove,export",
            Boolean.TRUE,
            Boolean.TRUE,
            "标准单表 CRUD，由 RuoYi Generator 生成后继续在 Story 10.4 补字段与回写。"
        ),
        buildResource(
            "classroom-session",
            "课堂会话",
            "xm_classroom_session",
            XmPermissionConstants.CLASSROOM_SESSION_PREFIX,
            "classroomSession",
            "xiaomai/classroom-session/index",
            "CRUD_READY",
            "GENERATOR_CRUD",
            "list,query,add,edit,remove,export",
            Boolean.TRUE,
            Boolean.TRUE,
            "课堂长期摘要先冻结菜单与权限，后续 Story 10.4 承接聚合字段。"
        ),
        buildResource(
            "learning-record",
            "学习记录",
            "xm_learning_record",
            XmPermissionConstants.LEARNING_RECORD_PREFIX,
            "learningRecord",
            "xiaomai/learning-record/index",
            "QUERY_ONLY",
            "HANDWRITTEN_QUERY",
            "list,query,export",
            Boolean.TRUE,
            Boolean.TRUE,
            "后台提供查询和导出，不开放人工新增或编辑。"
        ),
        buildResource(
            "learning-favorite",
            "学习收藏",
            "xm_learning_favorite",
            XmPermissionConstants.LEARNING_FAVORITE_PREFIX,
            "learningFavorite",
            "xiaomai/learning-favorite/index",
            "QUERY_WITH_REMOVE",
            "HANDWRITTEN_QUERY",
            "list,query,remove,export",
            Boolean.TRUE,
            Boolean.TRUE,
            "收藏由学生侧沉淀，后台仅允许查询、清理和导出。"
        ),
        buildResource(
            "companion-turn",
            "Companion 问答",
            "xm_companion_turn",
            XmPermissionConstants.COMPANION_TURN_PREFIX,
            "companionTurn",
            "xiaomai/companion-turn/index",
            "QUERY_ONLY",
            "HANDWRITTEN_QUERY",
            "list,query,export",
            Boolean.TRUE,
            Boolean.TRUE,
            "会话问答属于长期历史，只提供查询、审计和导出。"
        ),
        buildResource(
            "evidence-chat",
            "Evidence 问答日志",
            "xm_knowledge_chat_log",
            XmPermissionConstants.EVIDENCE_CHAT_PREFIX,
            "evidenceChat",
            "xiaomai/evidence-chat/index",
            "QUERY_ONLY",
            "HANDWRITTEN_QUERY",
            "list,query,export",
            Boolean.TRUE,
            Boolean.TRUE,
            "资料问答以手写聚合查询承接，不在 FastAPI 自建后台 CRUD。"
        ),
        buildResource(
            "coach-result",
            "Learning Coach 结果",
            "xm_quiz_result,xm_learning_path",
            XmPermissionConstants.LEARNING_COACH_PREFIX,
            "learningCoach",
            "xiaomai/learning-coach/index",
            "QUERY_ONLY",
            "HANDWRITTEN_QUERY",
            "list,query,export",
            Boolean.TRUE,
            Boolean.TRUE,
            "错题、推荐和路径结果统一挂在 quiz/path 宿主，不新增平行 wrongbook 表。"
        ),
        buildResource(
            "audit-center",
            "审计中心",
            "sys_oper_log,xm_*",
            XmPermissionConstants.AUDIT_PREFIX,
            "auditCenter",
            "xiaomai/audit-center/index",
            "AUDIT_ONLY",
            "HANDWRITTEN_QUERY",
            "list,query,export",
            Boolean.TRUE,
            Boolean.TRUE,
            "供 Story 10.8 承接查询、导出和操作日志关联。"
        )
    );

    @Override
    public XmModuleBoundaryVo queryBoundary() {
        XmModuleBoundaryVo boundary = new XmModuleBoundaryVo();
        boundary.setArtifactId("ruoyi-xiaomai");
        boundary.setBasePackage("org.dromara.xiaomai");
        boundary.setRootMenuName("小麦业务");
        boundary.setSpringDocGroup("6.小麦模块");
        boundary.setCoreAuthUnchanged(Boolean.TRUE);
        boundary.setParallelRbacAllowed(Boolean.FALSE);
        boundary.setAdminOnly(Boolean.TRUE);
        boundary.setProductDomainEnabled(Boolean.FALSE);
        boundary.setFastapiContract(FASTAPI_CONTRACT);
        boundary.setExtensionDirectories(EXTENSION_DIRECTORIES);
        boundary.setResources(queryResourceList(new XmModuleResourceBo()));
        return boundary;
    }

    @Override
    public List<XmModuleResourceVo> queryResourceList(XmModuleResourceBo bo) {
        XmModuleResourceBo query = bo == null ? new XmModuleResourceBo() : bo;
        return RESOURCE_CATALOG.stream()
            .filter(item -> match(item.getResourceKey(), query.getResourceKey()))
            .filter(item -> match(item.getPermissionPrefix(), query.getPermissionPrefix()))
            .filter(item -> match(item.getAccessMode(), query.getAccessMode()))
            .filter(item -> match(item.getImplementationMode(), query.getImplementationMode()))
            .map(this::copyResource)
            .toList();
    }

    @Override
    public TableDataInfo<XmModuleResourceVo> queryResourcePage(XmModuleResourceBo bo, PageQuery pageQuery) {
        PageQuery query = pageQuery == null ? new PageQuery(PageQuery.DEFAULT_PAGE_SIZE, PageQuery.DEFAULT_PAGE_NUM) : pageQuery;
        return TableDataInfo.build(queryResourceList(bo), query.build());
    }

    private boolean match(String source, String keyword) {
        return StringUtils.isBlank(keyword) || StringUtils.containsIgnoreCase(source, keyword);
    }

    private XmModuleResourceVo copyResource(XmModuleResourceVo source) {
        XmModuleResourceVo target = new XmModuleResourceVo();
        target.setResourceKey(source.getResourceKey());
        target.setDisplayName(source.getDisplayName());
        target.setTableNames(source.getTableNames());
        target.setPermissionPrefix(source.getPermissionPrefix());
        target.setAdminPath(source.getAdminPath());
        target.setAdminComponent(source.getAdminComponent());
        target.setAccessMode(source.getAccessMode());
        target.setImplementationMode(source.getImplementationMode());
        target.setSupportedActions(source.getSupportedActions());
        target.setExportEnabled(source.getExportEnabled());
        target.setAuditLogged(source.getAuditLogged());
        target.setNote(source.getNote());
        return target;
    }

    private static XmModuleResourceVo buildResource(
        String resourceKey,
        String displayName,
        String tableNames,
        String permissionPrefix,
        String adminPath,
        String adminComponent,
        String accessMode,
        String implementationMode,
        String supportedActions,
        Boolean exportEnabled,
        Boolean auditLogged,
        String note
    ) {
        XmModuleResourceVo resource = new XmModuleResourceVo();
        resource.setResourceKey(resourceKey);
        resource.setDisplayName(displayName);
        resource.setTableNames(tableNames);
        resource.setPermissionPrefix(permissionPrefix);
        resource.setAdminPath(adminPath);
        resource.setAdminComponent(adminComponent);
        resource.setAccessMode(accessMode);
        resource.setImplementationMode(implementationMode);
        resource.setSupportedActions(supportedActions);
        resource.setExportEnabled(exportEnabled);
        resource.setAuditLogged(auditLogged);
        resource.setNote(note);
        return resource;
    }
}
