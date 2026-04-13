-- =============================================================================
-- MLLM Feedback 绑定：启用视频渲染后视觉反馈循环（公式/布局自修）
-- 绑定 Gemini 视觉模型到 mllm_feedback 阶段，orchestrator 动态检测后开启反馈
-- 前置：xm_ai_resource 中需有 gemini-3.1-pro-high 资源（vision-capable）
-- =============================================================================

SET NAMES utf8mb4;
SET collation_connection = 'utf8mb4_general_ci';
START TRANSACTION;

SET @tenant_id := '000000';
SET @dept_id := 103;
SET @admin_user_id := 1;
SET @now_time := SYSDATE();

-- 解析 video 模块 ID
SET @module_id := (
    SELECT id
    FROM xm_ai_module
    WHERE tenant_id = @tenant_id
      AND module_code = 'video'
      AND del_flag = '0'
    LIMIT 1
);

-- 解析 Gemini 视觉资源 ID
SET @gemini_resource_id := (
    SELECT id
    FROM xm_ai_resource
    WHERE tenant_id = @tenant_id
      AND resource_code = 'gemini-3.1-pro-high'
      AND del_flag = '0'
    LIMIT 1
);

-- 仅当模块和资源都存在时才插入绑定
-- mllm_feedback 阶段使用 Gemini 视觉能力分析渲染视频中的布局/公式偏移
SET @binding_id := (
    SELECT id
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'mllm_feedback'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 1
      AND del_flag = '0'
    LIMIT 1
);
SET @binding_id := IFNULL(@binding_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_module_binding));

INSERT INTO xm_ai_module_binding (
    id, tenant_id, module_id, stage_code, capability, role_code, resource_id, priority,
    timeout_seconds, retry_attempts, health_source, runtime_settings_json, status, is_default,
    remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @binding_id, @tenant_id, @module_id, 'mllm_feedback', 'llm', '', @gemini_resource_id, 1,
    300, 1, 'ruoyi:video:mllm_feedback', '{"temperature": 0.3}', '0', 'N',
    'MLLM 视觉反馈：渲染后分析视频布局/公式偏移，自动修正定位代码',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE @module_id IS NOT NULL
  AND @gemini_resource_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'mllm_feedback'
      AND capability = 'llm'
      AND role_code = ''
      AND priority = 1
      AND del_flag = '0'
);

UPDATE xm_ai_module_binding
SET
    resource_id = @gemini_resource_id,
    timeout_seconds = 300,
    retry_attempts = 1,
    health_source = 'ruoyi:video:mllm_feedback',
    runtime_settings_json = '{"temperature": 0.3}',
    status = '0',
    is_default = 'N',
    remark = 'MLLM 视觉反馈：渲染后分析视频布局/公式偏移，自动修正定位代码',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE @module_id IS NOT NULL
  AND @gemini_resource_id IS NOT NULL
  AND tenant_id = @tenant_id
  AND module_id = @module_id
  AND stage_code = 'mllm_feedback'
  AND capability = 'llm'
  AND role_code = ''
  AND priority = 1;

COMMIT;
