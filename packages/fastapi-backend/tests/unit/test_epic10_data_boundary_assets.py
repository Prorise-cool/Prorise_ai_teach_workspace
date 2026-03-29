from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[4]
DOC_BASELINE = REPO_ROOT / "docs/01开发人员手册/004-开发规范/0101-长期业务数据边界与表清单基线.md"
DOC_REVIEW = REPO_ROOT / "docs/01开发人员手册/009-里程碑与进度/0101-长期数据边界评审记录.md"
SQL_BASELINE = REPO_ROOT / "packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_data_boundary_baseline.sql"
SQL_DICT = REPO_ROOT / "packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_data_dictionary.sql"

REQUIRED_TABLES = [
    "xm_video_task",
    "xm_classroom_session",
    "xm_session_artifact",
    "xm_companion_turn",
    "xm_whiteboard_action_log",
    "xm_knowledge_chat_log",
    "xm_quiz_result",
    "xm_learning_path",
    "xm_learning_record",
    "xm_learning_favorite",
]

REQUIRED_DICT_TYPES = [
    "xm_task_status",
    "xm_turn_status",
    "xm_learning_result_type",
    "xm_learning_record_type",
    "xm_artifact_type",
]

COMMON_COLUMNS = [
    "tenant_id",
    "create_dept",
    "create_by",
    "create_time",
    "update_by",
    "update_time",
    "del_flag",
]


def test_story_10_1_assets_exist() -> None:
    assert DOC_BASELINE.exists()
    assert DOC_REVIEW.exists()
    assert SQL_BASELINE.exists()
    assert SQL_DICT.exists()


def test_story_10_1_sql_baseline_covers_required_tables_and_common_columns() -> None:
    sql_text = SQL_BASELINE.read_text(encoding="utf-8").lower()

    for table_name in REQUIRED_TABLES:
        assert f"table if not exists {table_name}" in sql_text

    for column_name in COMMON_COLUMNS:
        assert column_name in sql_text


def test_story_10_1_dictionary_sql_covers_core_dict_types() -> None:
    sql_text = SQL_DICT.read_text(encoding="utf-8").lower()

    for dict_type in REQUIRED_DICT_TYPES:
        assert dict_type in sql_text


def test_story_10_1_docs_cover_storage_boundary_and_review_scope() -> None:
    baseline_text = DOC_BASELINE.read_text(encoding="utf-8")
    review_text = DOC_REVIEW.read_text(encoding="utf-8")

    assert "redis" in baseline_text.lower()
    assert "ruoyi / mysql" in baseline_text.lower()
    assert "cos" in baseline_text.lower()
    assert "/learning" in baseline_text
    assert "/history" in baseline_text
    assert "/favorites" in baseline_text
    assert "Epic 4" in review_text
    assert "Epic 5" in review_text
    assert "Epic 6" in review_text
    assert "Epic 7" in review_text
    assert "Epic 8" in review_text
    assert "Epic 9" in review_text
