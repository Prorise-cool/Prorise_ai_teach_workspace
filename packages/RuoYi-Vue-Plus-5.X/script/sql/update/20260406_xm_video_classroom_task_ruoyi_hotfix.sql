-- 文件：packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260406_xm_video_classroom_task_ruoyi_hotfix.sql
-- 用途：热修复 Story 10.4 早期落表脚本与 RuoYi-Plus 基线不一致的问题
-- 说明：
-- 1. 保留现有业务字段 task_id / task_state / result_ref 等，避免一次性打断 FastAPI 与前端现有联调。
-- 2. 仅补齐当前最关键的 RuoYi-Plus 约束：tenant_id、del_flag、user_id bigint、租户感知索引。
-- 3. 执行本脚本后，建议重新执行 20260404_xm_epic10_codegen_seed.sql，刷新代码生成器字段元数据。

SET NAMES utf8mb4;

-- ----------------------------
-- xm_video_task
-- ----------------------------

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_video_task'
          AND COLUMN_NAME = 'tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE xm_video_task ADD COLUMN tenant_id VARCHAR(20) NOT NULL DEFAULT ''000000'' COMMENT ''租户编号'' AFTER id'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_video_task'
          AND COLUMN_NAME = 'del_flag'
    ),
    'SELECT 1',
    'ALTER TABLE xm_video_task ADD COLUMN del_flag CHAR(1) NOT NULL DEFAULT ''0'' COMMENT ''删除标志（0代表存在 1代表删除）'' AFTER update_time'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE xm_video_task
    MODIFY COLUMN user_id BIGINT NOT NULL COMMENT '用户ID（关联 sys_user.user_id）';

ALTER TABLE xm_video_task
    DROP INDEX uk_xm_video_task_task_id,
    ADD UNIQUE KEY uk_xm_video_task_task_id (tenant_id, task_id),
    DROP INDEX idx_xm_video_task_user_state_time,
    ADD KEY idx_xm_video_task_user_state_time (tenant_id, user_id, task_state, update_time),
    DROP INDEX idx_xm_video_task_session,
    ADD KEY idx_xm_video_task_session (tenant_id, source_session_id);

-- ----------------------------
-- xm_classroom_session
-- ----------------------------

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_classroom_session'
          AND COLUMN_NAME = 'tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE xm_classroom_session ADD COLUMN tenant_id VARCHAR(20) NOT NULL DEFAULT ''000000'' COMMENT ''租户编号'' AFTER id'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_classroom_session'
          AND COLUMN_NAME = 'del_flag'
    ),
    'SELECT 1',
    'ALTER TABLE xm_classroom_session ADD COLUMN del_flag CHAR(1) NOT NULL DEFAULT ''0'' COMMENT ''删除标志（0代表存在 1代表删除）'' AFTER update_time'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE xm_classroom_session
    MODIFY COLUMN user_id BIGINT NOT NULL COMMENT '用户ID（关联 sys_user.user_id）';

ALTER TABLE xm_classroom_session
    DROP INDEX uk_xm_classroom_session_task_id,
    ADD UNIQUE KEY uk_xm_classroom_session_task_id (tenant_id, task_id),
    DROP INDEX idx_xm_classroom_session_user_state_time,
    ADD KEY idx_xm_classroom_session_user_state_time (tenant_id, user_id, task_state, update_time),
    DROP INDEX idx_xm_classroom_session_session,
    ADD KEY idx_xm_classroom_session_session (tenant_id, source_session_id);
