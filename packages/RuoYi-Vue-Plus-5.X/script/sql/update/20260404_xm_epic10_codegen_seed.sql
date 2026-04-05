-- 文件：packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260404_xm_epic10_codegen_seed.sql
-- 用途：补齐 Epic 10 在 xm_dev 中的 RuoYi 代码生成器元数据、父级菜单与所需字典
-- 说明：
-- 1. 本脚本面向数据库 xm_dev 执行。
-- 2. 本脚本不创建业务表，只补菜单、字典、gen_table、gen_table_column。
-- 3. 本脚本会重置 Epic 10 生成器字段配置，便于后续直接在后台点击“生成代码”。

SET NAMES utf8mb4;

-- ----------------------------
-- 小麦生成器挂载菜单
-- ----------------------------
INSERT INTO sys_menu (
    menu_id, menu_name, parent_id, order_num, path, component, query_param, is_frame, is_cache,
    menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark
) VALUES
    (21000, '小麦业务', 0, 8, 'xiaomai', '', '', 1, 0, 'M', '0', '0', '', 'education', 103, 1, SYSDATE(), 1, SYSDATE(), '小麦业务后台根菜单'),
    (21090, '数据管理', 21000, 90, 'data', '', '', 1, 0, 'M', '0', '0', '', 'database', 103, 1, SYSDATE(), 1, SYSDATE(), 'Epic 10 代码生成器菜单挂载目录')
ON DUPLICATE KEY UPDATE
    menu_name = VALUES(menu_name),
    parent_id = VALUES(parent_id),
    order_num = VALUES(order_num),
    path = VALUES(path),
    component = VALUES(component),
    query_param = VALUES(query_param),
    is_frame = VALUES(is_frame),
    is_cache = VALUES(is_cache),
    menu_type = VALUES(menu_type),
    visible = VALUES(visible),
    status = VALUES(status),
    perms = VALUES(perms),
    icon = VALUES(icon),
    update_by = 1,
    update_time = SYSDATE(),
    remark = VALUES(remark);

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21000 FROM sys_role WHERE role_key = 'superadmin';

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21090 FROM sys_role WHERE role_key = 'superadmin';

-- ----------------------------
-- Epic 10 生成器所需字典
-- ----------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_xm_dict_type_seed;
CREATE TEMPORARY TABLE tmp_xm_dict_type_seed (
    seq INT PRIMARY KEY,
    dict_name VARCHAR(64) NOT NULL,
    dict_type VARCHAR(64) NOT NULL,
    remark VARCHAR(255) NOT NULL
);

INSERT INTO tmp_xm_dict_type_seed (seq, dict_name, dict_type, remark) VALUES
    (1, '小麦任务状态', 'xm_task_status', 'Epic 10 视频与课堂任务状态'),
    (2, '小麦问答持久化状态', 'xm_turn_status', 'Epic 10 Companion / Knowledge 持久化状态'),
    (3, '小麦学习结果类型', 'xm_learning_result_type', 'Epic 10 学习结果类型'),
    (4, '小麦学习来源类型', 'xm_learning_source_type', 'Epic 10 学习来源类型'),
    (5, '小麦学习结果状态', 'xm_learning_status', 'Epic 10 Quiz / Path / Wrongbook / Recommendation / Record 状态'),
    (6, '小麦上下文类型', 'xm_context_type', 'Epic 10 问答上下文类型'),
    (7, '小麦会话类型', 'xm_session_type', 'Epic 10 Session Artifact 会话类型'),
    (8, '小麦产物类型', 'xm_artifact_type', 'Epic 10 Session Artifact 类型'),
    (9, '小麦数字布尔', 'xm_yes_no_numeric', 'Epic 10 0/1 型布尔字段'),
    (10, '小麦收藏状态', 'xm_favorite_status', 'Epic 10 学习收藏状态'),
    (11, '小麦删除状态', 'xm_deleted_flag', 'Epic 10 0/1 删除状态');

UPDATE sys_dict_type t
JOIN tmp_xm_dict_type_seed s ON s.dict_type = t.dict_type
SET
    t.dict_name = s.dict_name,
    t.remark = s.remark,
    t.update_by = 1,
    t.update_time = SYSDATE();

SET @dict_type_base := IFNULL((SELECT MAX(dict_id) FROM sys_dict_type), 0);

INSERT INTO sys_dict_type (
    dict_id, tenant_id, dict_name, dict_type, create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT
    @dict_type_base + s.seq,
    '000000',
    s.dict_name,
    s.dict_type,
    103,
    1,
    SYSDATE(),
    NULL,
    NULL,
    s.remark
FROM tmp_xm_dict_type_seed s
WHERE NOT EXISTS (
    SELECT 1
    FROM sys_dict_type t
    WHERE t.dict_type = s.dict_type
);

DROP TEMPORARY TABLE IF EXISTS tmp_xm_dict_data_seed;
CREATE TEMPORARY TABLE tmp_xm_dict_data_seed (
    seq INT PRIMARY KEY,
    dict_type VARCHAR(64) NOT NULL,
    dict_sort INT NOT NULL,
    dict_label VARCHAR(64) NOT NULL,
    dict_value VARCHAR(64) NOT NULL,
    css_class VARCHAR(64) NOT NULL,
    list_class VARCHAR(64) NOT NULL,
    is_default CHAR(1) NOT NULL,
    remark VARCHAR(255) NOT NULL
);

INSERT INTO tmp_xm_dict_data_seed (
    seq, dict_type, dict_sort, dict_label, dict_value, css_class, list_class, is_default, remark
) VALUES
    (1, 'xm_task_status', 1, '待处理', 'pending', '', 'info', 'N', '任务待处理'),
    (2, 'xm_task_status', 2, '处理中', 'processing', '', 'warning', 'N', '任务处理中'),
    (3, 'xm_task_status', 3, '已完成', 'completed', '', 'primary', 'N', '任务已完成'),
    (4, 'xm_task_status', 4, '已失败', 'failed', '', 'danger', 'N', '任务已失败'),
    (5, 'xm_task_status', 5, '已取消', 'cancelled', '', 'default', 'N', '任务已取消'),

    (6, 'xm_turn_status', 1, '完整成功', 'complete_success', '', 'primary', 'N', '完整成功'),
    (7, 'xm_turn_status', 2, '白板降级', 'whiteboard_degraded', '', 'warning', 'N', '白板降级'),
    (8, 'xm_turn_status', 3, '引用缺失', 'reference_missing', '', 'danger', 'N', '引用缺失'),
    (9, 'xm_turn_status', 4, '部分失败', 'partial_failure', '', 'warning', 'N', '部分失败'),
    (10, 'xm_turn_status', 5, '整体失败', 'overall_failure', '', 'danger', 'N', '整体失败'),

    (11, 'xm_learning_result_type', 1, 'Checkpoint', 'checkpoint', '', 'primary', 'N', '学习结果 Checkpoint'),
    (12, 'xm_learning_result_type', 2, 'Quiz', 'quiz', '', 'primary', 'N', '学习结果 Quiz'),
    (13, 'xm_learning_result_type', 3, 'Wrongbook', 'wrongbook', '', 'danger', 'N', '学习结果错题本'),
    (14, 'xm_learning_result_type', 4, 'Recommendation', 'recommendation', '', 'success', 'N', '学习结果推荐'),
    (15, 'xm_learning_result_type', 5, 'Path', 'path', '', 'default', 'N', '学习结果路径'),

    (16, 'xm_learning_source_type', 1, '视频', 'video', '', 'primary', 'N', '来源视频'),
    (17, 'xm_learning_source_type', 2, '课堂', 'classroom', '', 'primary', 'N', '来源课堂'),
    (18, 'xm_learning_source_type', 3, 'Companion', 'companion', '', 'warning', 'N', '来源 Companion'),
    (19, 'xm_learning_source_type', 4, 'Knowledge', 'knowledge', '', 'warning', 'N', '来源 Knowledge'),
    (20, 'xm_learning_source_type', 5, 'Learning', 'learning', '', 'success', 'N', '来源 Learning'),
    (21, 'xm_learning_source_type', 6, 'Manual', 'manual', '', 'default', 'N', '来源人工录入'),

    (22, 'xm_learning_status', 1, '待处理', 'pending', '', 'info', 'N', '学习结果待处理'),
    (23, 'xm_learning_status', 2, '已完成', 'completed', '', 'primary', 'N', '学习结果已完成'),
    (24, 'xm_learning_status', 3, '已失败', 'failed', '', 'danger', 'N', '学习结果已失败'),

    (25, 'xm_context_type', 1, '视频', 'video', '', 'primary', 'N', '视频上下文'),
    (26, 'xm_context_type', 2, '课堂', 'classroom', '', 'primary', 'N', '课堂上下文'),
    (27, 'xm_context_type', 3, '学习', 'learning', '', 'success', 'N', '学习上下文'),
    (28, 'xm_context_type', 4, '文档', 'document', '', 'warning', 'N', '文档上下文'),
    (29, 'xm_context_type', 5, '混合', 'mixed', '', 'default', 'N', '混合上下文'),

    (30, 'xm_session_type', 1, '视频', 'video', '', 'primary', 'N', '视频会话'),
    (31, 'xm_session_type', 2, '课堂', 'classroom', '', 'success', 'N', '课堂会话'),

    (32, 'xm_artifact_type', 1, '时间线', 'timeline', '', 'primary', 'N', '视频 / 课堂时间线产物'),
    (33, 'xm_artifact_type', 2, '分镜', 'segment', '', 'primary', 'N', '分镜产物'),
    (34, 'xm_artifact_type', 3, '旁白', 'narration', '', 'warning', 'N', '旁白产物'),
    (35, 'xm_artifact_type', 4, '幻灯片', 'slide', '', 'success', 'N', '课堂幻灯片产物'),
    (36, 'xm_artifact_type', 5, '白板步骤', 'whiteboard_step', '', 'default', 'N', '白板步骤产物'),

    (37, 'xm_yes_no_numeric', 1, '是', '1', '', 'primary', 'N', '数值型是'),
    (38, 'xm_yes_no_numeric', 2, '否', '0', '', 'default', 'N', '数值型否'),

    (39, 'xm_favorite_status', 1, '已收藏', '1', '', 'warning', 'N', '收藏中'),
    (40, 'xm_favorite_status', 2, '已取消', '0', '', 'default', 'N', '已取消收藏'),

    (41, 'xm_deleted_flag', 1, '正常', '0', '', 'primary', 'N', '正常记录'),
    (42, 'xm_deleted_flag', 2, '已删除', '1', '', 'danger', 'N', '已删除记录');

DELETE FROM sys_dict_data
WHERE dict_type IN (
    SELECT dict_type
    FROM tmp_xm_dict_type_seed
);

SET @dict_data_base := IFNULL((SELECT MAX(dict_code) FROM sys_dict_data), 0);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT
    @dict_data_base + s.seq,
    '000000',
    s.dict_sort,
    s.dict_label,
    s.dict_value,
    s.dict_type,
    s.css_class,
    s.list_class,
    s.is_default,
    103,
    1,
    SYSDATE(),
    NULL,
    NULL,
    s.remark
FROM tmp_xm_dict_data_seed s
ORDER BY s.seq;

-- ----------------------------
-- Epic 10 代码生成器元数据
-- ----------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_xm_codegen_seed;
CREATE TEMPORARY TABLE tmp_xm_codegen_seed (
    seq INT PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    package_name VARCHAR(200) NOT NULL,
    business_name VARCHAR(64) NOT NULL,
    function_name VARCHAR(64) NOT NULL
);

INSERT INTO tmp_xm_codegen_seed (seq, table_name, class_name, package_name, business_name, function_name) VALUES
    (1, 'xm_video_task', 'VideoTask', 'org.dromara.xiaomai.video', 'videoTask', '视频任务'),
    (2, 'xm_classroom_session', 'ClassroomSession', 'org.dromara.xiaomai.classroom', 'classroomSession', '课堂会话'),
    (3, 'xm_session_artifact', 'XmSessionArtifact', 'org.dromara.xiaomai.artifact', 'sessionArtifact', '会话产物'),
    (4, 'xm_companion_turn', 'XmCompanionTurn', 'org.dromara.xiaomai.companion', 'companionTurn', 'Companion 问答'),
    (5, 'xm_whiteboard_action_log', 'XmWhiteboardActionLog', 'org.dromara.xiaomai.companion', 'whiteboardActionLog', '白板动作日志'),
    (6, 'xm_knowledge_chat_log', 'XmKnowledgeChatLog', 'org.dromara.xiaomai.knowledge', 'knowledgeChatLog', '知识问答日志'),
    (7, 'xm_quiz_result', 'XmQuizResult', 'org.dromara.xiaomai.learning', 'quizResult', 'Quiz 结果'),
    (8, 'xm_learning_path', 'XmLearningPath', 'org.dromara.xiaomai.learning', 'learningPath', '学习路径'),
    (9, 'xm_learning_record', 'XmLearningRecord', 'org.dromara.xiaomai.learningcenter', 'learningRecord', '学习记录'),
    (10, 'xm_learning_favorite', 'XmLearningFavorite', 'org.dromara.xiaomai.learningcenter', 'learningFavorite', '学习收藏'),
    (11, 'xm_learning_wrongbook', 'XmLearningWrongbook', 'org.dromara.xiaomai.learning', 'learningWrongbook', '错题本'),
    (12, 'xm_learning_recommendation', 'XmLearningRecommendation', 'org.dromara.xiaomai.learning', 'learningRecommendation', '学习推荐');

UPDATE gen_table gt
JOIN tmp_xm_codegen_seed s ON s.table_name = gt.table_name
SET
    gt.data_name = 'master',
    gt.table_comment = COALESCE((
        SELECT t.TABLE_COMMENT
        FROM information_schema.TABLES t
        WHERE t.TABLE_SCHEMA = 'xm_dev'
          AND t.TABLE_NAME = s.table_name
    ), gt.table_comment),
    gt.class_name = s.class_name,
    gt.tpl_category = 'crud',
    gt.package_name = s.package_name,
    gt.module_name = 'xiaomai',
    gt.business_name = s.business_name,
    gt.function_name = s.function_name,
    gt.function_author = 'Prorise',
    gt.gen_type = '0',
    gt.gen_path = '/',
    gt.options = '{"treeCode":null,"treeName":null,"treeParentCode":null,"parentMenuId":"21090","parentMenuName":"数据管理"}',
    gt.update_by = 1,
    gt.update_time = SYSDATE(),
    gt.remark = 'Epic 10 代码生成器补种';

SET @gen_table_base := IFNULL((SELECT MAX(table_id) FROM gen_table), 0);

INSERT INTO gen_table (
    table_id, data_name, table_name, table_comment, sub_table_name, sub_table_fk_name, class_name, tpl_category,
    package_name, module_name, business_name, function_name, function_author, gen_type, gen_path, options,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT
    @gen_table_base + s.seq,
    'master',
    s.table_name,
    t.TABLE_COMMENT,
    NULL,
    NULL,
    s.class_name,
    'crud',
    s.package_name,
    'xiaomai',
    s.business_name,
    s.function_name,
    'Prorise',
    '0',
    '/',
    '{"treeCode":null,"treeName":null,"treeParentCode":null,"parentMenuId":"21090","parentMenuName":"数据管理"}',
    103,
    1,
    SYSDATE(),
    NULL,
    NULL,
    'Epic 10 代码生成器补种'
FROM tmp_xm_codegen_seed s
JOIN information_schema.TABLES t
  ON t.TABLE_SCHEMA = 'xm_dev'
 AND t.TABLE_NAME = s.table_name
WHERE NOT EXISTS (
    SELECT 1
    FROM gen_table gt
    WHERE gt.table_name = s.table_name
);

DROP TEMPORARY TABLE IF EXISTS tmp_xm_codegen_rule;
CREATE TEMPORARY TABLE tmp_xm_codegen_rule (
    column_name VARCHAR(64) PRIMARY KEY,
    html_type VARCHAR(32) DEFAULT NULL,
    dict_type VARCHAR(64) DEFAULT NULL,
    query_type VARCHAR(16) DEFAULT NULL,
    query_flag CHAR(1) DEFAULT NULL,
    list_flag CHAR(1) DEFAULT NULL,
    insert_flag CHAR(1) DEFAULT NULL,
    edit_flag CHAR(1) DEFAULT NULL,
    required_flag CHAR(1) DEFAULT NULL
);

INSERT INTO tmp_xm_codegen_rule (
    column_name, html_type, dict_type, query_type, query_flag, list_flag, insert_flag, edit_flag, required_flag
) VALUES
    ('tenant_id', 'input', NULL, 'EQ', '0', '0', '0', '0', '0'),
    ('create_dept', 'input', NULL, 'EQ', '0', '0', '0', '0', '0'),
    ('create_by', 'input', NULL, 'EQ', '0', '0', '0', '0', '0'),
    ('update_by', 'input', NULL, 'EQ', '0', '0', '0', '0', '0'),
    ('del_flag', 'input', NULL, 'EQ', '0', '0', '0', '0', '0'),

    ('create_time', 'datetime', NULL, 'BETWEEN', '1', '1', '0', '0', '0'),
    ('update_time', 'datetime', NULL, 'BETWEEN', '1', '1', '0', '0', '0'),
    ('start_time', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', NULL),
    ('complete_time', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', NULL),
    ('fail_time', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', NULL),
    ('turn_time', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', '1'),
    ('action_time', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', '1'),
    ('chat_time', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', '1'),
    ('favorite_time', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', '1'),
    ('cancel_time', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', NULL),
    ('source_time', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', NULL),
    ('occurred_at', 'datetime', NULL, 'BETWEEN', '1', '1', '1', '1', NULL),

    ('task_state', 'select', 'xm_task_status', 'EQ', '1', '1', '1', '1', '1'),
    ('persistence_status', 'select', 'xm_turn_status', 'EQ', '1', '1', '1', '1', '1'),
    ('result_type', 'select', 'xm_learning_result_type', 'EQ', '1', '1', '1', '1', '1'),
    ('source_type', 'select', 'xm_learning_source_type', 'EQ', '1', '1', '1', '1', '1'),
    ('status', 'select', 'xm_learning_status', 'EQ', '1', '1', '1', '1', '1'),
    ('context_type', 'select', 'xm_context_type', 'EQ', '1', '1', '1', '1', '1'),
    ('session_type', 'select', 'xm_session_type', 'EQ', '1', '1', '1', '1', '1'),
    ('artifact_type', 'select', 'xm_artifact_type', 'EQ', '1', '1', '1', '1', '1'),
    ('whiteboard_degraded', 'radio', 'xm_yes_no_numeric', 'EQ', '1', '1', '1', '1', '1'),
    ('reference_missing', 'radio', 'xm_yes_no_numeric', 'EQ', '1', '1', '1', '1', '1'),
    ('overall_failed', 'radio', 'xm_yes_no_numeric', 'EQ', '1', '1', '1', '1', '1'),
    ('active_flag', 'radio', 'xm_favorite_status', 'EQ', '1', '1', '1', '1', '1'),
    ('deleted_flag', 'radio', 'xm_deleted_flag', 'EQ', '1', '1', '1', '1', '1'),

    ('summary', 'input', NULL, 'LIKE', '1', '1', '1', '1', '1'),
    ('error_summary', 'textarea', NULL, 'LIKE', '1', '1', '1', '1', NULL),
    ('scope_summary', 'textarea', NULL, 'LIKE', '1', '1', '1', '1', NULL),
    ('scope_window', 'textarea', NULL, 'EQ', '0', '0', '1', '1', NULL),
    ('question_text', 'textarea', NULL, 'LIKE', '1', '0', '1', '1', '1'),
    ('answer_summary', 'textarea', NULL, 'LIKE', '1', '0', '1', '1', '1'),
    ('source_summary', 'textarea', NULL, 'LIKE', '1', '1', '1', '1', NULL),
    ('path_title', 'input', NULL, 'LIKE', '1', '1', '1', '1', NULL),
    ('path_summary', 'textarea', NULL, 'LIKE', '1', '1', '1', '1', NULL),
    ('display_title', 'input', NULL, 'LIKE', '1', '1', '1', '1', NULL),
    ('analysis_summary', 'textarea', NULL, 'LIKE', '1', '1', '1', '1', NULL),
    ('recommendation_reason', 'textarea', NULL, 'LIKE', '1', '1', '1', '1', NULL),
    ('wrong_answer_text', 'textarea', NULL, 'LIKE', '1', '0', '1', '1', NULL),
    ('reference_answer_text', 'textarea', NULL, 'LIKE', '1', '0', '1', '1', NULL),
    ('title', 'input', NULL, 'LIKE', '1', '1', '1', '1', NULL),
    ('remark', 'textarea', NULL, 'LIKE', '0', '0', '1', '1', '0'),

    ('source_ids_json', 'textarea', NULL, 'EQ', '0', '0', '1', '1', '0'),
    ('source_refs_json', 'textarea', NULL, 'EQ', '0', '0', '1', '1', '0'),
    ('action_payload_json', 'textarea', NULL, 'EQ', '0', '0', '1', '1', '0'),
    ('metadata_json', 'textarea', NULL, 'EQ', '0', '0', '1', '1', '0');

DELETE gtc
FROM gen_table_column gtc
JOIN gen_table gt ON gt.table_id = gtc.table_id
JOIN tmp_xm_codegen_seed s ON s.table_name = gt.table_name;

SET @gen_column_base := IFNULL((SELECT MAX(column_id) FROM gen_table_column), 0);
SET @gen_column_id := @gen_column_base;

INSERT INTO gen_table_column (
    column_id, table_id, column_name, column_comment, column_type, java_type, java_field, is_pk, is_increment,
    is_required, is_insert, is_edit, is_list, is_query, query_type, html_type, dict_type, sort,
    create_dept, create_by, create_time, update_by, update_time
)
SELECT
    (@gen_column_id := @gen_column_id + 1) AS column_id,
    gt.table_id,
    c.COLUMN_NAME,
    c.COLUMN_COMMENT,
    c.COLUMN_TYPE,
    CASE
        WHEN c.DATA_TYPE = 'bigint' THEN 'Long'
        WHEN c.DATA_TYPE IN ('int', 'integer', 'smallint', 'mediumint', 'tinyint') THEN 'Integer'
        WHEN c.DATA_TYPE IN ('decimal', 'numeric') THEN 'BigDecimal'
        WHEN c.DATA_TYPE IN ('datetime', 'timestamp', 'date') THEN 'Date'
        ELSE 'String'
    END AS java_type,
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        LOWER(c.COLUMN_NAME),
        '_a', 'A'),
        '_b', 'B'),
        '_c', 'C'),
        '_d', 'D'),
        '_e', 'E'),
        '_f', 'F'),
        '_g', 'G'),
        '_h', 'H'),
        '_i', 'I'),
        '_j', 'J'),
        '_k', 'K'),
        '_l', 'L'),
        '_m', 'M'),
        '_n', 'N'),
        '_o', 'O'),
        '_p', 'P'),
        '_q', 'Q'),
        '_r', 'R'),
        '_s', 'S'),
        '_t', 'T'),
        '_u', 'U'),
        '_v', 'V'),
        '_w', 'W'),
        '_x', 'X'),
        '_y', 'Y'),
        '_z', 'Z') AS java_field,
    CASE WHEN c.COLUMN_KEY = 'PRI' THEN '1' ELSE '0' END AS is_pk,
    CASE WHEN c.EXTRA LIKE '%auto_increment%' THEN '1' ELSE '0' END AS is_increment,
    CASE
        WHEN r.required_flag IS NOT NULL THEN r.required_flag
        WHEN c.IS_NULLABLE = 'NO'
             AND c.COLUMN_NAME NOT IN ('tenant_id', 'create_dept', 'create_by', 'update_by', 'del_flag', 'remark', 'create_time', 'update_time')
        THEN '1'
        ELSE '0'
    END AS is_required,
    CASE
        WHEN r.insert_flag IS NOT NULL THEN NULLIF(r.insert_flag, '0')
        WHEN c.EXTRA LIKE '%auto_increment%' THEN NULL
        WHEN c.COLUMN_NAME IN ('tenant_id', 'create_dept', 'create_by', 'update_by', 'del_flag', 'create_time', 'update_time') THEN NULL
        ELSE '1'
    END AS is_insert,
    CASE
        WHEN r.edit_flag IS NOT NULL THEN NULLIF(r.edit_flag, '0')
        WHEN c.COLUMN_NAME IN ('tenant_id', 'create_dept', 'create_by', 'update_by', 'del_flag', 'create_time', 'update_time') THEN NULL
        ELSE '1'
    END AS is_edit,
    CASE
        WHEN r.list_flag IS NOT NULL THEN NULLIF(r.list_flag, '0')
        WHEN c.COLUMN_NAME IN ('tenant_id', 'create_dept', 'create_by', 'update_by', 'del_flag') THEN NULL
        WHEN c.DATA_TYPE IN ('json', 'longtext', 'text') THEN NULL
        ELSE '1'
    END AS is_list,
    CASE
        WHEN r.query_flag IS NOT NULL THEN NULLIF(r.query_flag, '0')
        WHEN c.COLUMN_NAME IN ('tenant_id', 'create_dept', 'create_by', 'update_by', 'del_flag', 'remark') THEN NULL
        WHEN c.DATA_TYPE IN ('json', 'longtext', 'text') THEN NULL
        WHEN c.COLUMN_NAME IN (
            'create_time', 'update_time', 'start_time', 'complete_time', 'fail_time', 'turn_time',
            'action_time', 'chat_time', 'favorite_time', 'cancel_time', 'source_time', 'occurred_at'
        ) THEN '1'
        WHEN c.COLUMN_NAME LIKE '%_id'
          OR c.COLUMN_NAME IN (
              'task_type', 'task_state', 'persistence_status', 'result_type', 'source_type', 'status',
              'context_type', 'session_type', 'artifact_type', 'active_flag', 'deleted_flag', 'source_table', 'render_state'
          ) THEN '1'
        WHEN c.COLUMN_NAME IN (
            'summary', 'path_title', 'display_title', 'path_summary', 'recommendation_reason',
            'analysis_summary', 'error_summary', 'question_text', 'title', 'source_summary', 'scope_summary'
        ) THEN '1'
        ELSE NULL
    END AS is_query,
    CASE
        WHEN r.query_type IS NOT NULL THEN r.query_type
        WHEN c.COLUMN_NAME IN (
            'create_time', 'update_time', 'start_time', 'complete_time', 'fail_time', 'turn_time',
            'action_time', 'chat_time', 'favorite_time', 'cancel_time', 'source_time', 'occurred_at'
        ) THEN 'BETWEEN'
        WHEN c.COLUMN_NAME IN (
            'summary', 'path_title', 'display_title', 'path_summary', 'recommendation_reason',
            'analysis_summary', 'error_summary', 'question_text', 'title', 'source_summary', 'scope_summary'
        ) THEN 'LIKE'
        ELSE 'EQ'
    END AS query_type,
    COALESCE(
        r.html_type,
        CASE
            WHEN c.DATA_TYPE IN ('datetime', 'timestamp', 'date') THEN 'datetime'
            WHEN c.DATA_TYPE IN ('json', 'longtext', 'text') THEN 'textarea'
            ELSE 'input'
        END
    ) AS html_type,
    COALESCE(r.dict_type, '') AS dict_type,
    c.ORDINAL_POSITION AS sort,
    103,
    1,
    SYSDATE(),
    NULL,
    NULL
FROM tmp_xm_codegen_seed s
JOIN gen_table gt
  ON gt.table_name = s.table_name
JOIN information_schema.COLUMNS c
  ON c.TABLE_SCHEMA = 'xm_dev'
 AND c.TABLE_NAME = s.table_name
LEFT JOIN tmp_xm_codegen_rule r
  ON r.column_name = c.COLUMN_NAME
ORDER BY s.seq, c.ORDINAL_POSITION;

DROP TEMPORARY TABLE IF EXISTS tmp_xm_codegen_rule;
DROP TEMPORARY TABLE IF EXISTS tmp_xm_codegen_seed;
DROP TEMPORARY TABLE IF EXISTS tmp_xm_dict_data_seed;
DROP TEMPORARY TABLE IF EXISTS tmp_xm_dict_type_seed;
