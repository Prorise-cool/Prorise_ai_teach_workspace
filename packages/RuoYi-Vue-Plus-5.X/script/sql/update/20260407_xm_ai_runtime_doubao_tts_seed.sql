-- Epic 4 视频 TTS 运行配置种子
-- 说明：
-- 1. 本脚本只补视频模块的 Doubao 标准 TTS Provider 与音色资源。
-- 2. 音色资源采用软关联，不建立物理外键，便于后续通过 RuoYi 后台继续扩展更多音色。
-- 3. 当前先种 2 条音色：tina 老师 2.0（默认）+ BV001（备用/演示）。

SET NAMES utf8mb4;
SET collation_connection = 'utf8mb4_general_ci';
START TRANSACTION;

SET @tenant_id := '000000';
SET @dept_id := 103;
SET @admin_user_id := 1;
SET @now_time := SYSDATE();

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
    @module_id, @tenant_id, 'video', '视频生成', '0', 10, 'Epic 4 视频生成模块运行配置',
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
    remark = 'Epic 4 视频生成模块运行配置',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND module_code = 'video';

SET @provider_id := (
    SELECT id
    FROM xm_ai_provider
    WHERE tenant_id = @tenant_id
      AND provider_code = 'doubao-tts-prod'
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
    @provider_id, @tenant_id, 'doubao-tts-prod', '豆包标准语音播报', 'volcengine', 'api_key',
    'https://openspeech.bytedance.com/api/v1/tts',
    NULL,
    '0dcd6c64-7f35-45d7-b776-52929622d549',
    NULL,
    NULL,
    NULL,
    '0', 10, 'Epic 4 视频 TTS 标准 Provider，先用于真实联调',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_provider
    WHERE tenant_id = @tenant_id
      AND provider_code = 'doubao-tts-prod'
      AND del_flag = '0'
);

UPDATE xm_ai_provider
SET
    provider_name = '豆包标准语音播报',
    vendor_code = 'volcengine',
    auth_type = 'api_key',
    endpoint_url = 'https://openspeech.bytedance.com/api/v1/tts',
    api_key = '0dcd6c64-7f35-45d7-b776-52929622d549',
    api_secret = NULL,
    access_token = NULL,
    extra_auth_json = NULL,
    status = '0',
    sort_order = 10,
    remark = 'Epic 4 视频 TTS 标准 Provider，先用于真实联调',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND provider_code = 'doubao-tts-prod';

SET @tina_resource_id := (
    SELECT id
    FROM xm_ai_resource
    WHERE tenant_id = @tenant_id
      AND resource_code = 'doubao-voice-tina-2-0'
      AND del_flag = '0'
    LIMIT 1
);
SET @tina_resource_id := IFNULL(@tina_resource_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_resource));

INSERT INTO xm_ai_resource (
    id, tenant_id, provider_id, capability, resource_code, resource_name, resource_type,
    runtime_provider_id, model_name, voice_code, language_code, resource_settings_json,
    status, sort_order, remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @tina_resource_id, @tenant_id, @provider_id, 'tts', 'doubao-voice-tina-2-0', 'tina老师 2.0', 'voice',
    'volcengine-zh_female_yingyujiaoxue_uranus_bigtts',
    NULL,
    'zh_female_yingyujiaoxue_uranus_bigtts',
    'zh-CN',
    '{"providerType":"doubao-tts","cluster":"volcano_tts","encoding":"mp3","speed_ratio":1.0,"volume_ratio":1.0,"pitch_ratio":1.0}',
    '0', 1, '默认视频讲解音色，适合教学播报',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_resource
    WHERE tenant_id = @tenant_id
      AND resource_code = 'doubao-voice-tina-2-0'
      AND del_flag = '0'
);

UPDATE xm_ai_resource
SET
    provider_id = @provider_id,
    capability = 'tts',
    resource_name = 'tina老师 2.0',
    resource_type = 'voice',
    runtime_provider_id = 'volcengine-zh_female_yingyujiaoxue_uranus_bigtts',
    model_name = NULL,
    voice_code = 'zh_female_yingyujiaoxue_uranus_bigtts',
    language_code = 'zh-CN',
    resource_settings_json = '{"providerType":"doubao-tts","cluster":"volcano_tts","encoding":"mp3","speed_ratio":1.0,"volume_ratio":1.0,"pitch_ratio":1.0}',
    status = '0',
    sort_order = 1,
    remark = '默认视频讲解音色，适合教学播报',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND resource_code = 'doubao-voice-tina-2-0';

SET @bv001_resource_id := (
    SELECT id
    FROM xm_ai_resource
    WHERE tenant_id = @tenant_id
      AND resource_code = 'doubao-voice-bv001'
      AND del_flag = '0'
    LIMIT 1
);
SET @bv001_resource_id := IFNULL(@bv001_resource_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_resource));

INSERT INTO xm_ai_resource (
    id, tenant_id, provider_id, capability, resource_code, resource_name, resource_type,
    runtime_provider_id, model_name, voice_code, language_code, resource_settings_json,
    status, sort_order, remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @bv001_resource_id, @tenant_id, @provider_id, 'tts', 'doubao-voice-bv001', '豆包标准女声 BV001', 'voice',
    'volcengine-bv001',
    NULL,
    'BV001',
    'zh-CN',
    '{"providerType":"doubao-tts","cluster":"volcano_tts","encoding":"mp3","speed_ratio":1.0,"volume_ratio":1.0,"pitch_ratio":1.0}',
    '0', 20, '标准女声音色，便于联调和备用验证',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_resource
    WHERE tenant_id = @tenant_id
      AND resource_code = 'doubao-voice-bv001'
      AND del_flag = '0'
);

UPDATE xm_ai_resource
SET
    provider_id = @provider_id,
    capability = 'tts',
    resource_name = '豆包标准女声 BV001',
    resource_type = 'voice',
    runtime_provider_id = 'volcengine-bv001',
    model_name = NULL,
    voice_code = 'BV001',
    language_code = 'zh-CN',
    resource_settings_json = '{"providerType":"doubao-tts","cluster":"volcano_tts","encoding":"mp3","speed_ratio":1.0,"volume_ratio":1.0,"pitch_ratio":1.0}',
    status = '0',
    sort_order = 20,
    remark = '标准女声音色，便于联调和备用验证',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND resource_code = 'doubao-voice-bv001';

SET @tina_binding_id := (
    SELECT id
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'tts'
      AND capability = 'tts'
      AND resource_id = @tina_resource_id
      AND del_flag = '0'
    LIMIT 1
);
SET @tina_binding_id := IFNULL(@tina_binding_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_module_binding));

INSERT INTO xm_ai_module_binding (
    id, tenant_id, module_id, stage_code, capability, role_code, resource_id, priority,
    timeout_seconds, retry_attempts, health_source, runtime_settings_json, status, is_default,
    remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @tina_binding_id, @tenant_id, @module_id, 'tts', 'tts', '', @tina_resource_id, 1,
    60, 1, 'ruoyi', NULL, '0', 'Y',
    '默认视频旁白音色，后续前端可通过下拉切换其他已绑定音色',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'tts'
      AND capability = 'tts'
      AND resource_id = @tina_resource_id
      AND del_flag = '0'
);

UPDATE xm_ai_module_binding
SET
    priority = 1,
    timeout_seconds = 60,
    retry_attempts = 1,
    health_source = 'ruoyi',
    runtime_settings_json = NULL,
    status = '0',
    is_default = 'Y',
    remark = '默认视频旁白音色，后续前端可通过下拉切换其他已绑定音色',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND module_id = @module_id
  AND stage_code = 'tts'
  AND capability = 'tts'
  AND resource_id = @tina_resource_id;

SET @bv001_binding_id := (
    SELECT id
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'tts'
      AND capability = 'tts'
      AND resource_id = @bv001_resource_id
      AND del_flag = '0'
    LIMIT 1
);
SET @bv001_binding_id := IFNULL(@bv001_binding_id, (SELECT IFNULL(MAX(id), 0) + 1 FROM xm_ai_module_binding));

INSERT INTO xm_ai_module_binding (
    id, tenant_id, module_id, stage_code, capability, role_code, resource_id, priority,
    timeout_seconds, retry_attempts, health_source, runtime_settings_json, status, is_default,
    remark, create_dept, create_by, create_time, update_by, update_time, del_flag
)
SELECT
    @bv001_binding_id, @tenant_id, @module_id, 'tts', 'tts', '', @bv001_resource_id, 20,
    60, 1, 'ruoyi', NULL, '0', 'N',
    '备用 / 演示音色，可用于后续前端下拉切换验证',
    @dept_id, @admin_user_id, @now_time, @admin_user_id, @now_time, '0'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM xm_ai_module_binding
    WHERE tenant_id = @tenant_id
      AND module_id = @module_id
      AND stage_code = 'tts'
      AND capability = 'tts'
      AND resource_id = @bv001_resource_id
      AND del_flag = '0'
);

UPDATE xm_ai_module_binding
SET
    priority = 20,
    timeout_seconds = 60,
    retry_attempts = 1,
    health_source = 'ruoyi',
    runtime_settings_json = NULL,
    status = '0',
    is_default = 'N',
    remark = '备用 / 演示音色，可用于后续前端下拉切换验证',
    update_by = @admin_user_id,
    update_time = @now_time,
    del_flag = '0'
WHERE tenant_id = @tenant_id
  AND module_id = @module_id
  AND stage_code = 'tts'
  AND capability = 'tts'
  AND resource_id = @bv001_resource_id;

COMMIT;
