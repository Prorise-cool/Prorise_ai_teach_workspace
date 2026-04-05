-- 菜单 SQL
insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040791930261995521, '营销落地页线索', '21000', '1', 'landingLead', 'xiaomai/landingLead/index', 1, 0, 'C', '0', '0', 'xiaomai:landingLead:list', '#', 103, 1, sysdate(), null, null, '营销落地页线索菜单');

-- 按钮 SQL
insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040791930261995522, '营销落地页线索查询', 2040791930261995521, '1',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:landingLead:query',        '#', 103, 1, sysdate(), null, null, '');

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040791930261995523, '营销落地页线索新增', 2040791930261995521, '2',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:landingLead:add',          '#', 103, 1, sysdate(), null, null, '');

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040791930261995524, '营销落地页线索修改', 2040791930261995521, '3',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:landingLead:edit',         '#', 103, 1, sysdate(), null, null, '');

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040791930261995525, '营销落地页线索删除', 2040791930261995521, '4',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:landingLead:remove',       '#', 103, 1, sysdate(), null, null, '');

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark)
values(2040791930261995526, '营销落地页线索导出', 2040791930261995521, '5',  '#', '', 1, 0, 'F', '0', '0', 'xiaomai:landingLead:export',       '#', 103, 1, sysdate(), null, null, '');
