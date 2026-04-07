-- 文件：packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260407_xm_user_work_ruoyi_hotfix.sql
-- 用途：热修复 xm_user_work 在 RuoYi-Plus 多租户场景下的唯一索引与查询索引
-- 说明：
-- 1. 本脚本不改业务字段，只修正多租户与“视频 / 课堂共表”场景下的索引语义。
-- 2. `task_ref_id` 唯一性调整为 `tenant_id + work_type + task_ref_id`，避免跨租户或跨作品类型误冲突。
-- 3. 查询索引补齐 `tenant_id` 前缀，和 RuoYi-Plus 业务表基线保持一致。

SET NAMES utf8mb4;

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
