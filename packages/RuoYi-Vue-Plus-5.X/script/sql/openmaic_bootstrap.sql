-- OpenMAIC module + provider bindings seed
-- Module registers under tenant 000000
-- Primary LLM: gemini-3-flash (2043680434583482370); fallback: deepseek-v3 (2042428438614241283)

-- 1. Register openmaic module (idempotent)
INSERT INTO xm_ai_module (id, tenant_id, module_code, module_name, status, sort_order, remark, create_by, create_time, del_flag)
VALUES (202604230001, '000000', 'openmaic', 'OpenMAIC 多智能体课堂', '0', 30, 'AI-driven interactive classroom (ported from OpenMAIC)', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE module_name=VALUES(module_name), update_time=NOW();

-- 2. Stage bindings (6 stages, 2 providers each — primary/fallback)
-- Use OR REPLACE semantics via INSERT ... ON DUPLICATE KEY UPDATE
-- Stages: outline, scene_content, scene_actions, agent_profiles, director, quiz_grade

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

-- scene_actions (agent actions per scene)
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230105, '000000', 202604230001, 'scene_actions', 'llm', 2043680434583482370, 1, 90, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0'),
  (202604230106, '000000', 202604230001, 'scene_actions', 'llm', 2042428438614241283, 10, 90, 1, 'ruoyi', '0', 'N', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE priority=VALUES(priority), timeout_seconds=VALUES(timeout_seconds), update_time=NOW();

-- agent_profiles (persona generation — lightweight, use fast model)
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230107, '000000', 202604230001, 'agent_profiles', 'llm', 2043680434583482370, 1, 45, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE priority=VALUES(priority), timeout_seconds=VALUES(timeout_seconds), update_time=NOW();

-- director (multi-agent chat orchestration — needs quick responses)
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230108, '000000', 202604230001, 'director', 'llm', 2043680434583482370, 1, 60, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0'),
  (202604230109, '000000', 202604230001, 'director', 'llm', 2042428438614241283, 10, 60, 1, 'ruoyi', '0', 'N', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE priority=VALUES(priority), timeout_seconds=VALUES(timeout_seconds), update_time=NOW();

-- quiz_grade (structured output — can use reasoning model for harder cases)
INSERT INTO xm_ai_module_binding (id, tenant_id, module_id, stage_code, capability, resource_id, priority, timeout_seconds, retry_attempts, health_source, status, is_default, create_by, create_time, del_flag)
VALUES
  (202604230110, '000000', 202604230001, 'quiz_grade', 'llm', 2043680434583482370, 1, 30, 1, 'ruoyi', '0', 'Y', 1, NOW(), '0'),
  (202604230111, '000000', 202604230001, 'quiz_grade', 'llm', 2042428438614241283, 10, 30, 1, 'ruoyi', '0', 'N', 1, NOW(), '0')
ON DUPLICATE KEY UPDATE priority=VALUES(priority), timeout_seconds=VALUES(timeout_seconds), update_time=NOW();

-- Verify
SELECT b.id, b.stage_code, b.priority, r.resource_code, r.runtime_provider_id
FROM xm_ai_module_binding b
JOIN xm_ai_resource r ON r.id = b.resource_id
WHERE b.module_id = 202604230001 AND b.del_flag = '0'
ORDER BY b.stage_code, b.priority;
