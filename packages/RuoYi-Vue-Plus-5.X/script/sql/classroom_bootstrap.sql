-- Classroom module + provider bindings seed (Wave 1 重构)
-- 替代原 openmaic_bootstrap.sql：module_code 从 'openmaic' 改名为 'classroom'，
-- 删除 quiz_grade stage（迁移到 learning_coach），新增 tts stage 供
-- SpeechAction 预合成查询 TTS provider chain。
--
-- Resource ID 参考：
--   - LLM gemini-3-flash : 2043680434583482370 (primary)
--   - LLM deepseek-v3    : 2042428438614241283 (fallback)
--   - TTS Edge OpenAI 兼容: 请按部署环境填入实际的 TTS resource_id
--
-- 使用方式：在原 openmaic_bootstrap.sql 已执行的环境中，本脚本可幂等覆盖
-- module / 各 stage binding，并清理已不再使用的 quiz_grade 行（最末尾 DELETE）。

-- 1. Register classroom module（如已存在 openmaic 行则更新 module_code）
INSERT INTO xm_ai_module (id, tenant_id, module_code, module_name, status, sort_order, remark, create_by, create_time, del_flag)
VALUES (202604230001, '000000', 'classroom', 'Classroom 多智能体课堂', '0', 30, 'Wave 1 合并 openmaic → classroom 后的统一课堂模块', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE module_code='classroom', module_name=VALUES(module_name), update_time=NOW();

-- 2. LLM stage bindings（5 个 stage，每个 1-2 provider）
-- Stages: outline, scene_content, scene_actions, agent_profiles, director

-- outline (Stage 1)
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230101, '000000', 202604230001, 'outline', 'llm', 2043680434583482370, 1, 60, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0'),
  (202604230102, '000000', 202604230001, 'outline', 'llm', 2042428438614241283, 10, 90, 1, 'ruoyi', '0', 'N', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE priority=VALUES(priority), timeout_seconds=VALUES(timeout_seconds), update_time=NOW();

-- scene_content (Stage 2)
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230103, '000000', 202604230001, 'scene_content', 'llm', 2043680434583482370, 1, 120, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0'),
  (202604230104, '000000', 202604230001, 'scene_content', 'llm', 2042428438614241283, 10, 120, 1, 'ruoyi', '0', 'N', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE priority=VALUES(priority), timeout_seconds=VALUES(timeout_seconds), update_time=NOW();

-- scene_actions
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230105, '000000', 202604230001, 'scene_actions', 'llm', 2043680434583482370, 1, 90, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0'),
  (202604230106, '000000', 202604230001, 'scene_actions', 'llm', 2042428438614241283, 10, 90, 1, 'ruoyi', '0', 'N', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE priority=VALUES(priority), timeout_seconds=VALUES(timeout_seconds), update_time=NOW();

-- agent_profiles
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230107, '000000', 202604230001, 'agent_profiles', 'llm', 2043680434583482370, 1, 45, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE priority=VALUES(priority), timeout_seconds=VALUES(timeout_seconds), update_time=NOW();

-- director (multi-agent chat)
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230108, '000000', 202604230001, 'director', 'llm', 2043680434583482370, 1, 60, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0'),
  (202604230109, '000000', 202604230001, 'director', 'llm', 2042428438614241283, 10, 60, 1, 'ruoyi', '0', 'N', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE priority=VALUES(priority), timeout_seconds=VALUES(timeout_seconds), update_time=NOW();

-- 3. TTS stage binding (Wave 1 新增) ──────────────────────────────────────
-- ⚠️ 当前 ProviderRuntimeResolver.resolve_by_module_code() 仅装配 LLM
-- capability，TTS 链路尚未接入；本绑定为 Wave 1.5 resolver 升级后启用做准备。
-- 当前 SpeechAction 预合成走 ProviderFactory.assemble_from_settings() 默认 TTS 链。
--
-- TODO(Wave 1.5)：在 resolve_by_module_code() 中开放 ProviderCapability.TTS，
-- 然后将 resource_id 改成实际部署的 Edge TTS / OpenAI 兼容 TTS provider id。
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230120, '000000', 202604230001, 'tts', 'tts', 0, 1, 30, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE stage_code='tts', capability='tts', update_time=NOW();

-- 4. 清理 Wave 1 移除的 quiz_grade stage（迁移到 learning_coach 后不再使用）
DELETE FROM xm_ai_module_binding
WHERE module_id = 202604230001 AND stage_code = 'quiz_grade';

-- Verify
SELECT b.id, b.stage_code, b.capability, b.priority, r.resource_code
FROM xm_ai_module_binding b
LEFT JOIN xm_ai_resource r ON r.id = b.resource_id
WHERE b.module_id = 202604230001 AND b.del_flag = '0'
ORDER BY b.capability, b.stage_code, b.priority;
