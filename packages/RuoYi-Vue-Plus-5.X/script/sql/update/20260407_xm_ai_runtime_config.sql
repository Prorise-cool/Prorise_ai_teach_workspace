-- Epic 10 / Epic 4 AI 运行配置域
-- 用途：为 RuoYi 后台承接 LLM / TTS / Provider 运行配置提供多表基础结构
-- 说明：
-- 1. 本脚本只创建“配置域”表，不修改视频、课堂等业务事实表。
-- 2. 本配置域内部使用软关联，不建立物理外键，便于代码生成器和后续演进。
-- 3. 若数据库中已经存在早期试验表（如 xm_ai_provider_config），请先人工评估旧数据再迁移，不在本脚本自动删除。
-- 4. api_key / api_secret / access_token 等敏感字段后续在 Java 实体层需补 @EncryptField，并在列表 / 详情侧做脱敏。

SET NAMES utf8mb4;

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
