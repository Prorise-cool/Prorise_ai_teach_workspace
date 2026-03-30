-- Story 10.2: 小麦菜单与按钮权限冻结
-- 说明：
-- 1. 权限标识统一遵循 模块:资源:操作。
-- 2. 标准单表 CRUD 优先走 Generator，聚合查询和审计导出由手写查询承接。
-- 3. 学习记录、收藏、问答日志和审计中心默认不开放后台新增或编辑。

DELETE FROM sys_role_menu
WHERE menu_id IN (
    21010, 21011, 21012, 21013, 21014, 21015, 21016,
    21020, 21021, 21022, 21023, 21024, 21025, 21026,
    21030, 21031, 21032, 21033, 21034,
    21040, 21041, 21042, 21043, 21044,
    21050, 21051, 21052, 21053,
    21060, 21061, 21062, 21063,
    21070, 21071, 21072, 21073,
    21080, 21081, 21082, 21083
);

DELETE FROM sys_menu
WHERE menu_id IN (
    21010, 21011, 21012, 21013, 21014, 21015, 21016,
    21020, 21021, 21022, 21023, 21024, 21025, 21026,
    21030, 21031, 21032, 21033, 21034,
    21040, 21041, 21042, 21043, 21044,
    21050, 21051, 21052, 21053,
    21060, 21061, 21062, 21063,
    21070, 21071, 21072, 21073,
    21080, 21081, 21082, 21083
);

INSERT INTO sys_menu VALUES
    ('21010', '视频任务', '21000', '10', 'videoTask', 'xiaomai/video-task/index', '', '1', '0', 'C', '0', '0', 'video:task:list', 'video-play', 103, 1, sysdate(), 1, sysdate(), '视频任务菜单');
INSERT INTO sys_menu VALUES
    ('21011', '视频任务查询', '21010', '1', '#', '', '', '1', '0', 'F', '0', '0', 'video:task:query', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21012', '视频任务新增', '21010', '2', '#', '', '', '1', '0', 'F', '0', '0', 'video:task:add', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21013', '视频任务修改', '21010', '3', '#', '', '', '1', '0', 'F', '0', '0', 'video:task:edit', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21014', '视频任务删除', '21010', '4', '#', '', '', '1', '0', 'F', '0', '0', 'video:task:remove', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21015', '视频任务导出', '21010', '5', '#', '', '', '1', '0', 'F', '0', '0', 'video:task:export', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21016', '视频任务列表', '21010', '6', '#', '', '', '1', '0', 'F', '0', '0', 'video:task:list', '#', 103, 1, sysdate(), 1, sysdate(), '');

INSERT INTO sys_menu VALUES
    ('21020', '课堂会话', '21000', '20', 'classroomSession', 'xiaomai/classroom-session/index', '', '1', '0', 'C', '0', '0', 'classroom:session:list', 'reading', 103, 1, sysdate(), 1, sysdate(), '课堂会话菜单');
INSERT INTO sys_menu VALUES
    ('21021', '课堂会话查询', '21020', '1', '#', '', '', '1', '0', 'F', '0', '0', 'classroom:session:query', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21022', '课堂会话新增', '21020', '2', '#', '', '', '1', '0', 'F', '0', '0', 'classroom:session:add', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21023', '课堂会话修改', '21020', '3', '#', '', '', '1', '0', 'F', '0', '0', 'classroom:session:edit', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21024', '课堂会话删除', '21020', '4', '#', '', '', '1', '0', 'F', '0', '0', 'classroom:session:remove', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21025', '课堂会话导出', '21020', '5', '#', '', '', '1', '0', 'F', '0', '0', 'classroom:session:export', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21026', '课堂会话列表', '21020', '6', '#', '', '', '1', '0', 'F', '0', '0', 'classroom:session:list', '#', 103, 1, sysdate(), 1, sysdate(), '');

INSERT INTO sys_menu VALUES
    ('21030', '学习记录', '21000', '30', 'learningRecord', 'xiaomai/learning-record/index', '', '1', '0', 'C', '0', '0', 'learning:record:list', 'clock', 103, 1, sysdate(), 1, sysdate(), '学习记录菜单');
INSERT INTO sys_menu VALUES
    ('21031', '学习记录查询', '21030', '1', '#', '', '', '1', '0', 'F', '0', '0', 'learning:record:query', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21032', '学习记录导出', '21030', '2', '#', '', '', '1', '0', 'F', '0', '0', 'learning:record:export', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21033', '学习记录列表', '21030', '3', '#', '', '', '1', '0', 'F', '0', '0', 'learning:record:list', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21034', '学习记录移除', '21030', '4', '#', '', '', '1', '0', 'F', '0', '0', 'learning:record:remove', '#', 103, 1, sysdate(), 1, sysdate(), '');

INSERT INTO sys_menu VALUES
    ('21040', '学习收藏', '21000', '40', 'learningFavorite', 'xiaomai/learning-favorite/index', '', '1', '0', 'C', '0', '0', 'learning:favorite:list', 'star', 103, 1, sysdate(), 1, sysdate(), '学习收藏菜单');
INSERT INTO sys_menu VALUES
    ('21041', '学习收藏查询', '21040', '1', '#', '', '', '1', '0', 'F', '0', '0', 'learning:favorite:query', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21042', '学习收藏新增', '21040', '2', '#', '', '', '1', '0', 'F', '0', '0', 'learning:favorite:add', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21043', '学习收藏移除', '21040', '3', '#', '', '', '1', '0', 'F', '0', '0', 'learning:favorite:remove', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21044', '学习收藏导出', '21040', '4', '#', '', '', '1', '0', 'F', '0', '0', 'learning:favorite:export', '#', 103, 1, sysdate(), 1, sysdate(), '');

INSERT INTO sys_menu VALUES
    ('21050', 'Companion 问答', '21000', '50', 'companionTurn', 'xiaomai/companion-turn/index', '', '1', '0', 'C', '0', '0', 'companion:turn:list', 'chat-line-round', 103, 1, sysdate(), 1, sysdate(), 'Companion 问答菜单');
INSERT INTO sys_menu VALUES
    ('21051', 'Companion 问答查询', '21050', '1', '#', '', '', '1', '0', 'F', '0', '0', 'companion:turn:query', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21052', 'Companion 问答导出', '21050', '2', '#', '', '', '1', '0', 'F', '0', '0', 'companion:turn:export', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21053', 'Companion 问答列表', '21050', '3', '#', '', '', '1', '0', 'F', '0', '0', 'companion:turn:list', '#', 103, 1, sysdate(), 1, sysdate(), '');

INSERT INTO sys_menu VALUES
    ('21060', 'Evidence 问答', '21000', '60', 'evidenceChat', 'xiaomai/evidence-chat/index', '', '1', '0', 'C', '0', '0', 'evidence:chat:list', 'tickets', 103, 1, sysdate(), 1, sysdate(), 'Evidence 问答菜单');
INSERT INTO sys_menu VALUES
    ('21061', 'Evidence 问答查询', '21060', '1', '#', '', '', '1', '0', 'F', '0', '0', 'evidence:chat:query', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21062', 'Evidence 问答导出', '21060', '2', '#', '', '', '1', '0', 'F', '0', '0', 'evidence:chat:export', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21063', 'Evidence 问答列表', '21060', '3', '#', '', '', '1', '0', 'F', '0', '0', 'evidence:chat:list', '#', 103, 1, sysdate(), 1, sysdate(), '');

INSERT INTO sys_menu VALUES
    ('21070', 'Learning Coach 结果', '21000', '70', 'learningCoach', 'xiaomai/learning-coach/index', '', '1', '0', 'C', '0', '0', 'learning:coach:list', 'document', 103, 1, sysdate(), 1, sysdate(), 'Learning Coach 结果菜单');
INSERT INTO sys_menu VALUES
    ('21071', 'Learning Coach 查询', '21070', '1', '#', '', '', '1', '0', 'F', '0', '0', 'learning:coach:query', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21072', 'Learning Coach 导出', '21070', '2', '#', '', '', '1', '0', 'F', '0', '0', 'learning:coach:export', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21073', 'Learning Coach 列表', '21070', '3', '#', '', '', '1', '0', 'F', '0', '0', 'learning:coach:list', '#', 103, 1, sysdate(), 1, sysdate(), '');

INSERT INTO sys_menu VALUES
    ('21080', '审计中心', '21000', '80', 'auditCenter', 'xiaomai/audit-center/index', '', '1', '0', 'C', '0', '0', 'xiaomai:audit:list', 'histogram', 103, 1, sysdate(), 1, sysdate(), '小麦审计中心菜单');
INSERT INTO sys_menu VALUES
    ('21081', '审计中心查询', '21080', '1', '#', '', '', '1', '0', 'F', '0', '0', 'xiaomai:audit:query', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21082', '审计中心导出', '21080', '2', '#', '', '', '1', '0', 'F', '0', '0', 'xiaomai:audit:export', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21083', '审计中心列表', '21080', '3', '#', '', '', '1', '0', 'F', '0', '0', 'xiaomai:audit:list', '#', 103, 1, sysdate(), 1, sysdate(), '');

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21010 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21011 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21012 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21013 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21014 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21015 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21016 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21020 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21021 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21022 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21023 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21024 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21025 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21026 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21030 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21031 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21032 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21033 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21034 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21040 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21041 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21042 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21043 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21044 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21050 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21051 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21052 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21053 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21060 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21061 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21062 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21063 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21070 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21071 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21072 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21073 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21080 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21081 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21082 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21083 FROM sys_role WHERE role_key = 'superadmin';
