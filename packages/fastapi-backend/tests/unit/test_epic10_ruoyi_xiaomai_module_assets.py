from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[4]
RUOYI_ROOT = REPO_ROOT / "packages/RuoYi-Vue-Plus-5.X"
MODULE_POM = RUOYI_ROOT / "ruoyi-modules/pom.xml"
ADMIN_POM = RUOYI_ROOT / "ruoyi-admin/pom.xml"
APPLICATION_YML = RUOYI_ROOT / "ruoyi-admin/src/main/resources/application.yml"
XIAOMAI_POM = RUOYI_ROOT / "ruoyi-modules/ruoyi-xiaomai/pom.xml"
BOUNDARY_CONTROLLER = RUOYI_ROOT / "ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/controller/admin/XmModuleBoundaryController.java"
BOUNDARY_SERVICE = RUOYI_ROOT / "ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/service/impl/XmModuleBoundaryServiceImpl.java"
BOOTSTRAP_SQL = RUOYI_ROOT / "script/sql/update/20260328_xm_module_bootstrap.sql"
PERMISSION_SQL = RUOYI_ROOT / "script/sql/update/20260328_xm_menu_permission.sql"
RULE_DOC = REPO_ROOT / "docs/01开发人员手册/004-开发规范/0102-RuoYi小麦模块与权限承接规则.md"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_ruoyi_xiaomai_module_is_registered_in_maven_and_docs() -> None:
    assert "<module>ruoyi-xiaomai</module>" in read_text(MODULE_POM)
    assert "<artifactId>ruoyi-xiaomai</artifactId>" in read_text(ADMIN_POM)
    assert "<artifactId>ruoyi-xiaomai</artifactId>" in read_text(XIAOMAI_POM)
    assert "packages-to-scan: org.dromara.xiaomai" in read_text(APPLICATION_YML)


def test_ruoyi_xiaomai_boundary_contract_freezes_guardrails() -> None:
    doc_content = read_text(RULE_DOC)
    service_content = read_text(BOUNDARY_SERVICE)

    assert "FastAPI 只消费 RuoYi 权限结果" in doc_content
    assert "setParallelRbacAllowed(Boolean.FALSE)" in service_content
    assert "setCoreAuthUnchanged(Boolean.TRUE)" in service_content
    assert "Generator" in doc_content
    assert "手写查询" in doc_content


def test_permission_sql_covers_epic10_resources() -> None:
    sql_content = read_text(BOOTSTRAP_SQL) + read_text(PERMISSION_SQL)
    required_permissions = [
        "xiaomai:module:list",
        "xiaomai:module:query",
        "xiaomai:module:export",
        "video:task:list",
        "classroom:session:list",
        "learning:record:export",
        "learning:favorite:remove",
        "companion:turn:query",
        "evidence:chat:export",
        "learning:coach:list",
        "xiaomai:audit:export",
    ]

    for permission in required_permissions:
        assert permission in sql_content

    assert "sys_role_menu" in sql_content
    assert "FastAPI 只消费 RuoYi 权限结果" in sql_content


def test_boundary_controller_guards_query_and_export_endpoints() -> None:
    controller_content = read_text(BOUNDARY_CONTROLLER)

    assert "@SaCheckPermission(XmPermissionConstants.MODULE_LIST)" in controller_content
    assert "@SaCheckPermission(XmPermissionConstants.MODULE_QUERY)" in controller_content
    assert "@SaCheckPermission(XmPermissionConstants.MODULE_EXPORT)" in controller_content
    assert "BusinessType.EXPORT" in controller_content
