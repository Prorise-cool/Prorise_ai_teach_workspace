-- =============================================================================
-- Plan D: 视频管道质量对齐 — 新增阶段资源 & 绑定
-- 基于 DeepSeek 模型编排，对齐参考项目 manim-to-video-claw 的质量策略
-- 说明：
-- 1. 迁移脚本按 module_code / provider_code / resource_code 动态解析主键，
--    不再依赖仓库快照中的固定 ID。
-- 2. Provider 的真实鉴权信息不在迁移中覆盖；若新插入记录仅写占位值，
--    请在管理后台补充真实凭据。
-- =============================================================================

SET NAMES utf8mb4;
SET collation_connection = 'utf8mb4_general_ci';
START TRANSACTION;

SET @tenant_id := '000000';
SET @dept_id := 103;
SET @admin_user_id := 1;
SET @now_time := SYSDATE();

-- ---------------------------------------------------------------------------
-- 0. 确保 video 模块存在
-- ---------------------------------------------------------------------------
SET @module_id := (
    SELECT id
    FROM xm_ai_module
    WHERE tenant_id = @tenant_id
      AND module_code = 'video'
      AND del_flag = '0'
    LIMIT 1
);
SET @module_id := IFNULL(@module_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_module));

INSERT INTO xm_ai_module (
    id, tenant_id, module_code, module_name, status, sort_order, remark,
    create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @module_id, @tenant_id, 'video', '视频生成', '0', 10, 'Plan D 视频生成模块运行配置',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_module
    WHERE tenant_id = @tenant_id
      AND module_code = 'video'
      AND del_flag = '0'
);

UPDATE xm_ai_module
SET
    module_name = '视频生成',
    status = '0',
    sort_order = 10,
    remark = 'Plan D 视频生成模块运行配置',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND module_code = 'video';

-- ---------------------------------------------------------------------------
-- 1. 确保 DeepSeek provider / V3 / R1 资源存在
-- ---------------------------------------------------------------------------
SET @provider_id := (
    SELECT id
    FROM xm_ai_provider
    WHERE tenant_id = @tenant_id
      AND provider_code = 'deepseek-prod'
      AND del_flag = '0'
    LIMIT 1
);
SET @provider_id := IFNULL(@provider_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_provider));

INSERT INTO xm_ai_provider (
    id, tenant_id, provider_code, provider_name, vendor_code, auth_type, endpoint_url,
    app_id, api_key, api_secret, access_token, extra_auth_json, status, sort_order, remark,
    create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @provider_id, @tenant_id, 'deepseek-prod', 'DeepSeek API', 'deepseek', 'api_key',
    'https://api.deepseek.com/',
    NULL,
    '-- 请在管理后台填入真实 API Key --',
    NULL,
    NULL,
    NULL,
    '0', 20, 'Plan D: DeepSeek 推理+生成 provider',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_provider
    WHERE tenant_id = @tenant_id
      AND provider_code = 'deepseek-prod'
      AND del_flag = '0'
);

UPDATE xm_ai_provider
SET
    provider_name = 'DeepSeek API',
    vendor_code = 'deepseek',
    auth_type = 'api_key',
    endpoint_url = 'https://api.deepseek.com/',
    status = '0',
    sort_order = 20,
    remark = 'Plan D: DeepSeek 推理+生成 provider',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND provider_code = 'deepseek-prod';

SET @v3_resource_id := (
    SELECT id
    FROM xm_ai_resource
    WHERE tenant_id = @tenant_id
      AND resource_code = 'deepseek-v3-chat'
      AND del_flag = '0'
    LIMIT 1
);
SET @v3_resource_id := IFNULL(@v3_resource_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_resource));

INSERT INTO xm_ai_resource (
    id, tenant_id, provider_id, capability, resource_code, resource_name, resource_type,
    runtime_provider_id, model_name, voice_code, language_code, resource_settings_json,
    status, sort_order, remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @v3_resource_id, @tenant_id, @provider_id, 'llm', 'deepseek-v3-chat', 'DeepSeek V3 生成模型', 'chat',
    'deepseek-chat', 'deepseek-chat', NULL, 'zh-CN',
    '{"temperature": 0.2, "providerType": "openai-compatible"}',
    '0', 10, 'Plan D: 代码生成/修复/分镜的主力 V3 模型',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_resource
    WHERE tenant_id = @tenant_id
      AND resource_code = 'deepseek-v3-chat'
      AND del_flag = '0'
);

UPDATE xm_ai_resource
SET
    provider_id = @provider_id,
    capability = 'llm',
    resource_name = 'DeepSeek V3 生成模型',
    resource_type = 'chat',
    runtime_provider_id = 'deepseek-chat',
    model_name = 'deepseek-chat',
    voice_code = NULL,
    language_code = 'zh-CN',
    resource_settings_json = '{"temperature": 0.2, "providerType": "openai-compatible"}',
    status = '0',
    sort_order = 10,
    remark = 'Plan D: 代码生成/修复/分镜的主力 V3 模型',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND resource_code = 'deepseek-v3-chat';

SET @r1_resource_id := (
    SELECT id
    FROM xm_ai_resource
    WHERE tenant_id = @tenant_id
      AND resource_code = 'deepseek-r1-reasoning'
      AND del_flag = '0'
    LIMIT 1
);
SET @r1_resource_id := IFNULL(@r1_resource_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_resource));

INSERT INTO xm_ai_resource (
    id, tenant_id, provider_id, capability, resource_code, resource_name, resource_type,
    runtime_provider_id, model_name, voice_code, language_code, resource_settings_json,
    status, sort_order, remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @r1_resource_id, @tenant_id, @provider_id, 'llm', 'deepseek-r1-reasoning', 'DeepSeek R1 推理模型', 'reasoning',
    'deepseek-reasoner', 'deepseek-reasoner', NULL, 'zh-CN',
    '{"temperature": 0.0, "providerType": "openai-compatible"}',
    '0', 10, 'Plan D: 用于独立解题(solve)和渲染验证分析(render_verify)的推理模型',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_resource
    WHERE tenant_id = @tenant_id
      AND resource_code = 'deepseek-r1-reasoning'
      AND del_flag = '0'
);

UPDATE xm_ai_resource
SET
    provider_id = @provider_id,
    capability = 'llm',
    resource_name = 'DeepSeek R1 推理模型',
    resource_type = 'reasoning',
    runtime_provider_id = 'deepseek-reasoner',
    model_name = 'deepseek-reasoner',
    voice_code = NULL,
    language_code = 'zh-CN',
    resource_settings_json = '{"temperature": 0.0, "providerType": "openai-compatible"}',
    status = '0',
    sort_order = 10,
    remark = 'Plan D: 用于独立解题(solve)和渲染验证分析(render_verify)的推理模型',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND resource_code = 'deepseek-r1-reasoning';

-- ---------------------------------------------------------------------------
-- 2. 新增 Plan D 阶段绑定
-- ---------------------------------------------------------------------------
SET @solve_r1_binding_id := (
    SELECT id
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'solve'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 1
      AND del_flag = '0'
    LIMIT 1
);
SET @solve_r1_binding_id := IFNULL(@solve_r1_binding_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_module_binding));

INSERT INTO xm_ai_module_binding (
    id, tenant_id, module_id, stage_code, capability, role_code, resource_id, priority,
    timeout_seconds, retry_attempts, health_source, runtime_settings_json, status, is_default,
    remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @solve_r1_binding_id, @tenant_id, @module_id, 'solve', 'llm', '', @r1_resource_id, 1,
    180, 1, 'ruoyi:video:solve', '{"temperature": 0.0}', '0', 'N',
    'Plan D: 独立解题，R1 推理（主力）',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'solve'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 1
      AND del_flag = '0'
);

UPDATE xm_ai_module_binding
SET
    resource_id = @r1_resource_id,
    timeout_seconds = 180,
    retry_attempts = 1,
    health_source = 'ruoyi:video:solve',
    runtime_settings_json = '{"temperature": 0.0}',
    status = '0',
    is_default = 'N',
    remark = 'Plan D: 独立解题，R1 推理（主力）',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND module_id = @module_id
  AND stage_code = 'solve'
  AND capability = 'llm'
  AND role_code = ''
  AND priority = 1;

SET @solve_v3_binding_id := (
    SELECT id
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'solve'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 10
      AND del_flag = '0'
    LIMIT 1
);
SET @solve_v3_binding_id := IFNULL(@solve_v3_binding_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_module_binding));

INSERT INTO xm_ai_module_binding (
    id, tenant_id, module_id, stage_code, capability, role_code, resource_id, priority,
    timeout_seconds, retry_attempts, health_source, runtime_settings_json, status, is_default,
    remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @solve_v3_binding_id, @tenant_id, @module_id, 'solve', 'llm', '', @v3_resource_id, 10,
    120, 1, 'ruoyi:video:solve', '{"temperature": 0.2}', '0', 'N',
    'Plan D: 独立解题，V3 兜底',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'solve'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 10
      AND del_flag = '0'
);

UPDATE xm_ai_module_binding
SET
    resource_id = @v3_resource_id,
    timeout_seconds = 120,
    retry_attempts = 1,
    health_source = 'ruoyi:video:solve',
    runtime_settings_json = '{"temperature": 0.2}',
    status = '0',
    is_default = 'N',
    remark = 'Plan D: 独立解题，V3 兜底',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND module_id = @module_id
  AND stage_code = 'solve'
  AND capability = 'llm'
  AND role_code = ''
  AND priority = 10;

SET @render_verify_binding_id := (
    SELECT id
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'render_verify'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 1
      AND del_flag = '0'
    LIMIT 1
);
SET @render_verify_binding_id := IFNULL(@render_verify_binding_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_module_binding));

INSERT INTO xm_ai_module_binding (
    id, tenant_id, module_id, stage_code, capability, role_code, resource_id, priority,
    timeout_seconds, retry_attempts, health_source, runtime_settings_json, status, is_default,
    remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @render_verify_binding_id, @tenant_id, @module_id, 'render_verify', 'llm', '', @r1_resource_id, 1,
    120, 1, 'ruoyi:video:render_verify', '{"temperature": 0.0}', '0', 'N',
    'Plan D: 渲染验证分析，R1 推理分析错误',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'render_verify'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 1
      AND del_flag = '0'
);

UPDATE xm_ai_module_binding
SET
    resource_id = @r1_resource_id,
    timeout_seconds = 120,
    retry_attempts = 1,
    health_source = 'ruoyi:video:render_verify',
    runtime_settings_json = '{"temperature": 0.0}',
    status = '0',
    is_default = 'N',
    remark = 'Plan D: 渲染验证分析，R1 推理分析错误',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND module_id = @module_id
  AND stage_code = 'render_verify'
  AND capability = 'llm'
  AND role_code = ''
  AND priority = 1;

SET @render_fix_binding_id := (
    SELECT id
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'render_fix'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 1
      AND del_flag = '0'
    LIMIT 1
);
SET @render_fix_binding_id := IFNULL(@render_fix_binding_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_module_binding));

INSERT INTO xm_ai_module_binding (
    id, tenant_id, module_id, stage_code, capability, role_code, resource_id, priority,
    timeout_seconds, retry_attempts, health_source, runtime_settings_json, status, is_default,
    remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @render_fix_binding_id, @tenant_id, @module_id, 'render_fix', 'llm', '', @v3_resource_id, 1,
    120, 1, 'ruoyi:video:render_fix', '{"temperature": 0.2}', '0', 'N',
    'Plan D: 渲染修复应用，V3 快速修代码',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'render_fix'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 1
      AND del_flag = '0'
);

UPDATE xm_ai_module_binding
SET
    resource_id = @v3_resource_id,
    timeout_seconds = 120,
    retry_attempts = 1,
    health_source = 'ruoyi:video:render_fix',
    runtime_settings_json = '{"temperature": 0.2}',
    status = '0',
    is_default = 'N',
    remark = 'Plan D: 渲染修复应用，V3 快速修代码',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND module_id = @module_id
  AND stage_code = 'render_fix'
  AND capability = 'llm'
  AND role_code = ''
  AND priority = 1;

-- ---------------------------------------------------------------------------
-- 3. 更新现有 LLM 绑定：从仓库默认 LLM 切换到 DeepSeek V3
-- ---------------------------------------------------------------------------
UPDATE xm_ai_module_binding
SET
    resource_id = @v3_resource_id,
    remark = CASE
        WHEN COALESCE(remark, '') LIKE '%[Plan D: 切换到 DeepSeek V3]%' THEN remark
        WHEN COALESCE(remark, '') = '' THEN '[Plan D: 切换到 DeepSeek V3]'
        ELSE CONCAT(remark, ' [Plan D: 切换到 DeepSeek V3]')
    END,
    update_by = @admin_user_id,
    update_time = @now_time
WHERE tenant_id = @tenant_id
  AND module_id = @module_id
  AND capability = 'llm'
  AND stage_code IN ('understanding', 'storyboard', 'manim_gen', 'manim_fix')
  AND del_flag = '0';

COMMIT;
