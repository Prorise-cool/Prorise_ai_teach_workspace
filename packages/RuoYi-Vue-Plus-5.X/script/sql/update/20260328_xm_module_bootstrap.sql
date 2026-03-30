-- Story 10.2: RuoYi 小麦业务模块 bootstrap
-- 约束：
-- 1. 小麦业务通过新增模块、业务表、菜单和权限扩展进入 RuoYi。
-- 2. 不改动 RuoYi 核心认证、Sa-Token 或 RBAC 主干。
-- 3. FastAPI 只消费 RuoYi 权限结果，不复制权限真值或角色关系。
-- 4. 当前阶段只承接长期数据、后台查询、导出与审计扩展。

DELETE FROM sys_role_menu
WHERE menu_id IN (21000, 21001, 21002, 21003);

DELETE FROM sys_menu
WHERE menu_id IN (21000, 21001, 21002, 21003);

INSERT INTO sys_menu VALUES
    ('21000', '小麦业务', '0', '8', 'xiaomai', '', '', '1', '0', 'M', '0', '0', '', 'education', 103, 1, sysdate(), 1, sysdate(), '小麦业务后台根菜单');
INSERT INTO sys_menu VALUES
    ('21001', '模块规划', '21000', '1', 'module', 'xiaomai/module/index', '', '1', '0', 'C', '0', '0', 'xiaomai:module:list', 'guide', 103, 1, sysdate(), 1, sysdate(), '小麦模块边界与规划菜单');
INSERT INTO sys_menu VALUES
    ('21002', '模块规划查询', '21001', '1', '#', '', '', '1', '0', 'F', '0', '0', 'xiaomai:module:query', '#', 103, 1, sysdate(), 1, sysdate(), '');
INSERT INTO sys_menu VALUES
    ('21003', '模块规划导出', '21001', '2', '#', '', '', '1', '0', 'F', '0', '0', 'xiaomai:module:export', '#', 103, 1, sysdate(), 1, sysdate(), '');

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21000 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21001 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21002 FROM sys_role WHERE role_key = 'superadmin';
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, 21003 FROM sys_role WHERE role_key = 'superadmin';
