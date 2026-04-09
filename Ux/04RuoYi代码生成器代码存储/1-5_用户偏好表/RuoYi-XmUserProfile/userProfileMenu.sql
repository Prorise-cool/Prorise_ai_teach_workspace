-- 菜单 SQL
insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040388251168116737, '用户配置', '2040330270141440001', '1', 'userProfile', 'xiaomai/userProfile/index', 1, 0, 'C', '0', '0', 'xiaomai:userProfile:list', '#', 103, 1, sysdate(), null, null, '用户配置菜单');

-- 按钮 SQL
insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040388251168116738, '用户配置查询', 2040388251168116737, '1',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:userProfile:query',        '#', 103, 1, sysdate(), null, null, '');

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040388251168116739, '用户配置新增', 2040388251168116737, '2',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:userProfile:add',          '#', 103, 1, sysdate(), null, null, '');

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040388251168116740, '用户配置修改', 2040388251168116737, '3',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:userProfile:edit',         '#', 103, 1, sysdate(), null, null, '');

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040388251168116741, '用户配置删除', 2040388251168116737, '4',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:userProfile:remove',       '#', 103, 1, sysdate(), null, null, '');

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040388251168116742, '用户配置导出', 2040388251168116737, '5',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:userProfile:export',       '#', 103, 1, sysdate(), null, null, '');
