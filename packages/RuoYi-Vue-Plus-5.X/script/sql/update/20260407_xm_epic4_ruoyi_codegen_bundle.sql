-- 文件：packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260407_xm_epic4_ruoyi_codegen_bundle.sql
-- 用途：给当前 worktree 一次性导入 Epic 4 / Epic 10 代码生成器相关 SQL
-- 适用范围：
-- 0. 热修复既有 xm_user_work 索引，使其满足 RuoYi-Plus 多租户约束
-- 1. 新增 AI 运行配置域 4 张业务表
-- 2. 新增 / 更新小麦业务下的 AI 配置域与用户作品后台菜单、按钮、字典
-- 注意：
-- 1. `xm_video_task`、`xm_classroom_session`、`xm_user_work` 等长期事实表仍以既有基线 SQL / xm_dev.sql 为准，本 bundle 不重复建表。
-- 2. `xm_user_work` 虽不重建表，但会把旧唯一索引修正为 `tenant_id + work_type + task_ref_id`。
-- 3. 本文件可直接导入数据库执行，不依赖 `source` 客户端命令。

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------
-- Part 0. xm_user_work 多租户索引热修复
-- ----------------------------------------------------------------------

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_user_work'
    ),
    'ALTER TABLE xm_user_work
        DROP INDEX uk_xm_user_work_task_ref,
        ADD UNIQUE KEY uk_xm_user_work_task_ref (tenant_id, work_type, task_ref_id),
        DROP INDEX idx_xm_user_work_user_public_time,
        ADD KEY idx_xm_user_work_user_public_time (tenant_id, user_id, is_public, create_time),
        DROP INDEX idx_xm_user_work_community_feed,
        ADD KEY idx_xm_user_work_community_feed (tenant_id, is_public, status, create_time)',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------
-- Part 1. AI 运行配置域业务表
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS xm_ai_module (
    id bigint NOT NULL COMMENT '主键',
    tenant_id varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
    module_code varchar(64) NOT NULL COMMENT '模块编码，如 video/classroom/companion/knowledge/learning',
    module_name varchar(100) NOT NULL COMMENT '模块名称',
    status char(1) NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
    sort_order int NOT NULL DEFAULT 0 COMMENT '排序号',
    remark varchar(500) DEFAULT NULL COMMENT '备注',
    create_dept bigint DEFAULT NULL COMMENT '创建部门',
    create_by bigint DEFAULT NULL COMMENT '创建者',
    create_time datetime DEFAULT NULL COMMENT '创建时间',
    update_by bigint DEFAULT NULL COMMENT '更新者',
    update_time datetime DEFAULT NULL COMMENT '更新时间',
    del_flag char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_xm_ai_module_code (tenant_id, module_code),
    KEY idx_xm_ai_module_status (tenant_id, status, sort_order)
) ENGINE=InnoDB COMMENT='AI 配置模块主数据';

CREATE TABLE IF NOT EXISTS xm_ai_provider (
    id bigint NOT NULL COMMENT '主键',
    tenant_id varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
    provider_code varchar(64) NOT NULL COMMENT 'Provider 实例编码，如 volcengine-prod',
    provider_name varchar(100) NOT NULL COMMENT 'Provider 实例名称',
    vendor_code varchar(32) NOT NULL COMMENT '供应商编码，如 volcengine/deepseek/openai',
    auth_type varchar(32) NOT NULL DEFAULT 'api_key' COMMENT '鉴权类型，如 api_key/app_key_secret/access_token/custom',
    endpoint_url varchar(500) DEFAULT NULL COMMENT '基础请求地址',
    app_id varchar(255) DEFAULT NULL COMMENT '应用 ID',
    api_key varchar(1000) DEFAULT NULL COMMENT 'API Key（敏感）',
    api_secret varchar(1000) DEFAULT NULL COMMENT 'API Secret（敏感）',
    access_token varchar(2000) DEFAULT NULL COMMENT 'Access Token（敏感）',
    extra_auth_json text DEFAULT NULL COMMENT '扩展鉴权配置 JSON 字符串',
    status char(1) NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
    sort_order int NOT NULL DEFAULT 0 COMMENT '排序号',
    remark varchar(500) DEFAULT NULL COMMENT '备注',
    create_dept bigint DEFAULT NULL COMMENT '创建部门',
    create_by bigint DEFAULT NULL COMMENT '创建者',
    create_time datetime DEFAULT NULL COMMENT '创建时间',
    update_by bigint DEFAULT NULL COMMENT '更新者',
    update_time datetime DEFAULT NULL COMMENT '更新时间',
    del_flag char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_xm_ai_provider_code (tenant_id, provider_code),
    KEY idx_xm_ai_provider_vendor (tenant_id, vendor_code, status, sort_order)
) ENGINE=InnoDB COMMENT='AI Provider 实例配置';

CREATE TABLE IF NOT EXISTS xm_ai_resource (
    id bigint NOT NULL COMMENT '主键',
    tenant_id varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
    provider_id bigint NOT NULL COMMENT '关联 Provider 主键',
    capability varchar(16) NOT NULL COMMENT '能力类型，llm/tts',
    resource_code varchar(64) NOT NULL COMMENT '资源编码',
    resource_name varchar(100) NOT NULL COMMENT '资源名称',
    resource_type varchar(32) DEFAULT NULL COMMENT '资源类型，如 chat/reasoning/vision/voice',
    runtime_provider_id varchar(64) NOT NULL COMMENT 'FastAPI 运行时 Provider ID，需符合 vendor-model_or_voice 规范',
    model_name varchar(255) DEFAULT NULL COMMENT '上游模型名称',
    voice_code varchar(128) DEFAULT NULL COMMENT '音色编码，TTS 使用',
    language_code varchar(32) DEFAULT NULL COMMENT '语言编码',
    resource_settings_json text DEFAULT NULL COMMENT '资源级扩展配置 JSON 字符串',
    status char(1) NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
    sort_order int NOT NULL DEFAULT 0 COMMENT '排序号',
    remark varchar(500) DEFAULT NULL COMMENT '备注',
    create_dept bigint DEFAULT NULL COMMENT '创建部门',
    create_by bigint DEFAULT NULL COMMENT '创建者',
    create_time datetime DEFAULT NULL COMMENT '创建时间',
    update_by bigint DEFAULT NULL COMMENT '更新者',
    update_time datetime DEFAULT NULL COMMENT '更新时间',
    del_flag char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_xm_ai_resource_code (tenant_id, resource_code),
    KEY idx_xm_ai_resource_provider (tenant_id, provider_id, capability, status, sort_order),
    KEY idx_xm_ai_resource_runtime_provider (tenant_id, runtime_provider_id)
) ENGINE=InnoDB COMMENT='AI 模型 / 音色等可调度资源';

CREATE TABLE IF NOT EXISTS xm_ai_module_binding (
    id bigint NOT NULL COMMENT '主键',
    tenant_id varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
    module_id bigint NOT NULL COMMENT '关联模块主键',
    stage_code varchar(64) NOT NULL COMMENT '阶段编码，如 storyboard/script/narration/companion/search',
    capability varchar(16) NOT NULL COMMENT '能力类型，llm/tts',
    role_code varchar(64) NOT NULL DEFAULT '' COMMENT '角色编码，为空表示阶段默认链路',
    resource_id bigint NOT NULL COMMENT '关联资源主键',
    priority int NOT NULL DEFAULT 100 COMMENT '优先级，越小越优先',
    timeout_seconds int NOT NULL DEFAULT 30 COMMENT '超时时间，单位秒',
    retry_attempts int NOT NULL DEFAULT 0 COMMENT '重试次数',
    health_source varchar(64) NOT NULL DEFAULT 'ruoyi' COMMENT '健康状态来源',
    runtime_settings_json text DEFAULT NULL COMMENT '运行时附加配置 JSON 字符串',
    status char(1) NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
    is_default char(1) NOT NULL DEFAULT 'N' COMMENT '是否默认链路（Y/N）',
    remark varchar(500) DEFAULT NULL COMMENT '备注',
    create_dept bigint DEFAULT NULL COMMENT '创建部门',
    create_by bigint DEFAULT NULL COMMENT '创建者',
    create_time datetime DEFAULT NULL COMMENT '创建时间',
    update_by bigint DEFAULT NULL COMMENT '更新者',
    update_time datetime DEFAULT NULL COMMENT '更新时间',
    del_flag char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_xm_ai_module_binding_unique (
        tenant_id,
        module_id,
        stage_code,
        capability,
        role_code,
        priority
    ),
    KEY idx_xm_ai_module_binding_query (
        tenant_id,
        module_id,
        stage_code,
        capability,
        status,
        priority
    ),
    KEY idx_xm_ai_module_binding_resource (tenant_id, resource_id)
) ENGINE=InnoDB COMMENT='模块阶段到运行资源的绑定关系';

-- ----------------------------------------------------------------------
-- Part 2. 小麦业务菜单、按钮权限、字典
-- ----------------------------------------------------------------------

DROP TEMPORARY TABLE IF EXISTS tmp_xm_epic4_menu_seed;
CREATE TEMPORARY TABLE tmp_xm_epic4_menu_seed (
    menu_id bigint PRIMARY KEY,
    menu_name varchar(100) NOT NULL,
    parent_id bigint NOT NULL,
    order_num int NOT NULL,
    path varchar(200) NOT NULL,
    component varchar(255) NOT NULL,
    query_param varchar(255) NOT NULL,
    is_frame tinyint NOT NULL,
    is_cache tinyint NOT NULL,
    menu_type char(1) NOT NULL,
    visible char(1) NOT NULL,
    status char(1) NOT NULL,
    perms varchar(100) NOT NULL,
    icon varchar(100) NOT NULL,
    remark varchar(500) NOT NULL
);

INSERT INTO tmp_xm_epic4_menu_seed (
    menu_id, menu_name, parent_id, order_num, path, component, query_param, is_frame, is_cache,
    menu_type, visible, status, perms, icon, remark
) VALUES
    (21000, '小麦业务', 0, 8, 'xiaomai', '', '', 1, 0, 'M', '0', '0', '', 'education', '小麦业务后台根菜单'),
    (21090, '数据管理', 21000, 90, 'data', '', '', 1, 0, 'M', '0', '0', '', 'database', '小麦业务数据管理目录'),
    (21190, 'AI 运行配置', 21090, 91, 'ai-config', '', '', 1, 0, 'M', '0', '0', '', 'cpu', 'AI Provider / Resource / Binding 配置目录'),

    (21210, 'AI 配置模块', 21190, 10, 'ai-module', 'xiaomai/ai-module/index', '', 1, 0, 'C', '0', '0', 'xiaomai:aiModule:list', 'stack', 'AI 配置模块菜单'),
    (21211, 'AI 配置模块查询', 21210, 1, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModule:query', '#', ''),
    (21212, 'AI 配置模块新增', 21210, 2, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModule:add', '#', ''),
    (21213, 'AI 配置模块修改', 21210, 3, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModule:edit', '#', ''),
    (21214, 'AI 配置模块删除', 21210, 4, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModule:remove', '#', ''),
    (21215, 'AI 配置模块导出', 21210, 5, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModule:export', '#', ''),

    (21220, 'AI Provider 实例', 21190, 20, 'ai-provider', 'xiaomai/ai-provider/index', '', 1, 0, 'C', '0', '0', 'xiaomai:aiProvider:list', 'cloud', 'AI Provider 实例菜单'),
    (21221, 'AI Provider 查询', 21220, 1, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiProvider:query', '#', ''),
    (21222, 'AI Provider 新增', 21220, 2, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiProvider:add', '#', ''),
    (21223, 'AI Provider 修改', 21220, 3, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiProvider:edit', '#', ''),
    (21224, 'AI Provider 删除', 21220, 4, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiProvider:remove', '#', ''),
    (21225, 'AI Provider 导出', 21220, 5, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiProvider:export', '#', ''),

    (21230, 'AI 资源配置', 21190, 30, 'ai-resource', 'xiaomai/ai-resource/index', '', 1, 0, 'C', '0', '0', 'xiaomai:aiResource:list', 'coin', 'AI 资源配置菜单'),
    (21231, 'AI 资源查询', 21230, 1, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiResource:query', '#', ''),
    (21232, 'AI 资源新增', 21230, 2, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiResource:add', '#', ''),
    (21233, 'AI 资源修改', 21230, 3, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiResource:edit', '#', ''),
    (21234, 'AI 资源删除', 21230, 4, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiResource:remove', '#', ''),
    (21235, 'AI 资源导出', 21230, 5, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiResource:export', '#', ''),

    (21240, '模块资源绑定', 21190, 40, 'ai-module-binding', 'xiaomai/ai-module-binding/index', '', 1, 0, 'C', '0', '0', 'xiaomai:aiModuleBinding:list', 'connection', 'AI 模块资源绑定菜单'),
    (21241, '模块资源绑定查询', 21240, 1, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModuleBinding:query', '#', ''),
    (21242, '模块资源绑定新增', 21240, 2, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModuleBinding:add', '#', ''),
    (21243, '模块资源绑定修改', 21240, 3, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModuleBinding:edit', '#', ''),
    (21244, '模块资源绑定删除', 21240, 4, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModuleBinding:remove', '#', ''),
    (21245, '模块资源绑定导出', 21240, 5, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:aiModuleBinding:export', '#', ''),

    (21250, '用户作品管理', 21090, 50, 'user-work', 'xiaomai/user-work/index', '', 1, 0, 'C', '0', '0', 'xiaomai:userWork:list', 'picture', '用户作品后台管理菜单'),
    (21251, '用户作品查询', 21250, 1, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:userWork:query', '#', ''),
    (21252, '用户作品新增', 21250, 2, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:userWork:add', '#', ''),
    (21253, '用户作品修改', 21250, 3, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:userWork:edit', '#', ''),
    (21254, '用户作品删除', 21250, 4, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:userWork:remove', '#', ''),
    (21255, '用户作品导出', 21250, 5, '#', '', '', 1, 0, 'F', '0', '0', 'xiaomai:userWork:export', '#', '');

INSERT INTO sys_menu (
    menu_id, menu_name, parent_id, order_num, path, component, query_param, is_frame, is_cache,
    menu_type, visible, status, perms, icon, create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT
    menu_id, menu_name, parent_id, order_num, path, component, query_param, is_frame, is_cache,
    menu_type, visible, status, perms, icon, 103, 1, SYSDATE(), 1, SYSDATE(), remark
FROM tmp_xm_epic4_menu_seed
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
SELECT r.role_id, s.menu_id
FROM sys_role r
JOIN tmp_xm_epic4_menu_seed s
WHERE r.role_key = 'superadmin';

DROP TEMPORARY TABLE IF EXISTS tmp_xm_epic4_dict_type_seed;
CREATE TEMPORARY TABLE tmp_xm_epic4_dict_type_seed (
    seq int PRIMARY KEY,
    dict_name varchar(64) NOT NULL,
    dict_type varchar(64) NOT NULL,
    remark varchar(255) NOT NULL
);

INSERT INTO tmp_xm_epic4_dict_type_seed (seq, dict_name, dict_type, remark) VALUES
    (1, 'AI 供应商编码', 'xm_ai_vendor_code', 'AI Provider 供应商编码'),
    (2, 'AI 鉴权类型', 'xm_ai_auth_type', 'AI Provider 鉴权类型'),
    (3, 'AI 能力类型', 'xm_ai_capability', 'AI 资源能力类型'),
    (4, 'AI 资源类型', 'xm_ai_resource_type', 'AI 资源类型'),
    (5, 'AI 健康来源', 'xm_ai_health_source', 'AI 绑定健康状态来源'),
    (6, '用户作品类型', 'xm_user_work_type', '用户作品类型'),
    (7, '用户作品状态', 'xm_user_work_status', '用户作品后台管理状态');

UPDATE sys_dict_type t
JOIN tmp_xm_epic4_dict_type_seed s ON s.dict_type = t.dict_type
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
FROM tmp_xm_epic4_dict_type_seed s
WHERE NOT EXISTS (
    SELECT 1
    FROM sys_dict_type t
    WHERE t.dict_type = s.dict_type
);

DELETE FROM sys_dict_data
WHERE dict_type IN (
    SELECT dict_type
    FROM tmp_xm_epic4_dict_type_seed
);

DROP TEMPORARY TABLE IF EXISTS tmp_xm_epic4_dict_data_seed;
CREATE TEMPORARY TABLE tmp_xm_epic4_dict_data_seed (
    seq int PRIMARY KEY,
    dict_type varchar(64) NOT NULL,
    dict_sort int NOT NULL,
    dict_label varchar(64) NOT NULL,
    dict_value varchar(64) NOT NULL,
    css_class varchar(64) NOT NULL,
    list_class varchar(64) NOT NULL,
    is_default char(1) NOT NULL,
    remark varchar(255) NOT NULL
);

INSERT INTO tmp_xm_epic4_dict_data_seed (
    seq, dict_type, dict_sort, dict_label, dict_value, css_class, list_class, is_default, remark
) VALUES
    (1, 'xm_ai_vendor_code', 1, '火山引擎', 'volcengine', '', 'primary', 'N', '火山引擎'),
    (2, 'xm_ai_vendor_code', 2, 'DeepSeek', 'deepseek', '', 'success', 'N', 'DeepSeek'),
    (3, 'xm_ai_vendor_code', 3, 'OpenAI', 'openai', '', 'info', 'N', 'OpenAI'),
    (4, 'xm_ai_vendor_code', 4, 'Anthropic', 'anthropic', '', 'warning', 'N', 'Anthropic'),
    (5, 'xm_ai_vendor_code', 5, 'Google', 'google', '', 'default', 'N', 'Google'),
    (6, 'xm_ai_vendor_code', 6, '阿里云百炼', 'alibaba', '', 'success', 'N', '阿里云百炼'),
    (7, 'xm_ai_vendor_code', 7, '硅基流动', 'siliconflow', '', 'primary', 'N', '硅基流动'),
    (8, 'xm_ai_vendor_code', 8, '自定义', 'custom', '', 'default', 'N', '自定义'),

    (11, 'xm_ai_auth_type', 1, 'API Key', 'api_key', '', 'primary', 'Y', 'API Key'),
    (12, 'xm_ai_auth_type', 2, 'App Key + Secret', 'app_key_secret', '', 'warning', 'N', 'App Key + Secret'),
    (13, 'xm_ai_auth_type', 3, 'Access Token', 'access_token', '', 'success', 'N', 'Access Token'),
    (14, 'xm_ai_auth_type', 4, '自定义', 'custom', '', 'default', 'N', '自定义'),

    (21, 'xm_ai_capability', 1, 'LLM', 'llm', '', 'primary', 'Y', '大模型能力'),
    (22, 'xm_ai_capability', 2, 'TTS', 'tts', '', 'warning', 'N', '语音合成能力'),

    (31, 'xm_ai_resource_type', 1, '对话模型', 'chat', '', 'primary', 'N', '对话模型'),
    (32, 'xm_ai_resource_type', 2, '推理模型', 'reasoning', '', 'warning', 'N', '推理模型'),
    (33, 'xm_ai_resource_type', 3, '视觉模型', 'vision', '', 'success', 'N', '视觉模型'),
    (34, 'xm_ai_resource_type', 4, '音色资源', 'voice', '', 'info', 'N', '音色资源'),

    (41, 'xm_ai_health_source', 1, 'RuoYi 配置', 'ruoyi', '', 'primary', 'Y', 'RuoYi 配置'),
    (42, 'xm_ai_health_source', 2, 'Redis 缓存', 'cache', '', 'warning', 'N', 'Redis 缓存'),
    (43, 'xm_ai_health_source', 3, '主动探测', 'probe', '', 'success', 'N', '主动探测'),
    (44, 'xm_ai_health_source', 4, '静态值', 'static', '', 'default', 'N', '静态值'),

    (51, 'xm_user_work_type', 1, '视频', 'video', '', 'primary', 'Y', '视频作品'),
    (52, 'xm_user_work_type', 2, '课堂', 'classroom', '', 'success', 'N', '课堂作品'),

    (61, 'xm_user_work_status', 1, '正常', 'normal', '', 'primary', 'Y', '正常可见'),
    (62, 'xm_user_work_status', 2, '隐藏', 'hidden', '', 'warning', 'N', '后台隐藏'),
    (63, 'xm_user_work_status', 3, '封禁', 'blocked', '', 'danger', 'N', '后台封禁');

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
FROM tmp_xm_epic4_dict_data_seed s
ORDER BY s.seq;

DROP TEMPORARY TABLE IF EXISTS tmp_xm_epic4_dict_data_seed;
DROP TEMPORARY TABLE IF EXISTS tmp_xm_epic4_dict_type_seed;
DROP TEMPORARY TABLE IF EXISTS tmp_xm_epic4_menu_seed;
