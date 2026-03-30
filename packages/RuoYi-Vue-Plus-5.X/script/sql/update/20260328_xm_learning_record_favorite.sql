-- Story 10.7: 学习记录、收藏与聚合查询承接
-- 约束：
-- 1. /learning、/history、/favorites 的长期数据语义统一由 RuoYi 承接。
-- 2. 收藏 / 取消收藏 / 删除历史必须写入长期业务表，不能只停留在前端本地状态。
-- 3. 聚合结果来源于长期宿主表，不依赖 Redis 运行态或 SSE 回放。

CREATE TABLE IF NOT EXISTS xm_learning_record (
    record_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '学习记录主键',
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    result_type VARCHAR(32) NOT NULL COMMENT '结果类型 checkpoint/quiz/wrongbook/recommendation/path',
    display_title VARCHAR(255) DEFAULT NULL COMMENT '聚合卡片标题',
    source_type VARCHAR(32) NOT NULL COMMENT '来源类型 video/classroom/companion/knowledge/learning/manual',
    source_table VARCHAR(64) NOT NULL DEFAULT 'xm_learning_record' COMMENT '来源宿主表',
    source_session_id VARCHAR(64) NOT NULL COMMENT '来源会话ID',
    source_task_id VARCHAR(64) DEFAULT NULL COMMENT '来源任务ID',
    source_result_id VARCHAR(64) DEFAULT NULL COMMENT '来源结果ID',
    source_time DATETIME DEFAULT NULL COMMENT '来源发生时间',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
    score INT DEFAULT NULL COMMENT '得分',
    analysis_summary VARCHAR(1000) DEFAULT NULL COMMENT '解析摘要',
    detail_ref VARCHAR(255) DEFAULT NULL COMMENT '打开详情定位',
    version_no INT DEFAULT NULL COMMENT '版本号',
    deleted_flag CHAR(1) NOT NULL DEFAULT '0' COMMENT '历史删除标记（0展示 1隐藏）',
    create_by BIGINT DEFAULT NULL COMMENT '创建者',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_by BIGINT DEFAULT NULL COMMENT '更新者',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (record_id),
    KEY idx_xm_learning_record_user_type (user_id, result_type),
    KEY idx_xm_learning_record_source_session (source_session_id),
    KEY idx_xm_learning_record_source_result (source_result_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Learning Coach 结果总表';

ALTER TABLE xm_learning_record
    MODIFY COLUMN record_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '学习记录主键',
    MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '用户ID';

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_learning_record'
          AND COLUMN_NAME = 'display_title'
    ),
    'SELECT 1',
    'ALTER TABLE xm_learning_record ADD COLUMN display_title VARCHAR(255) DEFAULT NULL COMMENT ''聚合卡片标题'' AFTER result_type'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_learning_record'
          AND COLUMN_NAME = 'source_table'
    ),
    'SELECT 1',
    'ALTER TABLE xm_learning_record ADD COLUMN source_table VARCHAR(64) NOT NULL DEFAULT ''xm_learning_record'' COMMENT ''来源宿主表'' AFTER source_type'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_learning_record'
          AND COLUMN_NAME = 'deleted_flag'
    ),
    'SELECT 1',
    'ALTER TABLE xm_learning_record ADD COLUMN deleted_flag CHAR(1) NOT NULL DEFAULT ''0'' COMMENT ''历史删除标记（0展示 1隐藏）'' AFTER version_no'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE xm_learning_record
SET source_table = 'xm_learning_record',
    source_result_id = COALESCE(source_result_id, CAST(record_id AS CHAR)),
    display_title = COALESCE(
        display_title,
        CASE result_type
            WHEN 'checkpoint' THEN '学习起点 / checkpoint'
            WHEN 'quiz' THEN '测验结果'
            WHEN 'wrongbook' THEN '错题本'
            WHEN 'recommendation' THEN '知识推荐'
            WHEN 'path' THEN '学习路径'
            ELSE CONCAT('学习记录 / ', result_type)
        END
    )
WHERE source_table = 'xm_learning_record';
UPDATE xm_learning_record
SET source_table = 'xm_learning_record',
    source_result_id = COALESCE(source_result_id, CAST(record_id AS CHAR)),
    display_title = COALESCE(
        display_title,
        CASE result_type
            WHEN 'checkpoint' THEN '学习起点 / checkpoint'
            WHEN 'quiz' THEN '测验结果'
            WHEN 'wrongbook' THEN '错题本'
            WHEN 'recommendation' THEN '知识推荐'
            WHEN 'path' THEN '学习路径'
            ELSE CONCAT('学习记录 / ', result_type)
        END
    )
WHERE source_table IS NULL
   OR source_table = '';

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_learning_record'
          AND INDEX_NAME = 'uk_xm_learning_record_user_source'
    ),
    'SELECT 1',
    'ALTER TABLE xm_learning_record ADD UNIQUE KEY uk_xm_learning_record_user_source (user_id, source_table, source_result_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_learning_record'
          AND INDEX_NAME = 'idx_xm_learning_record_deleted_time'
    ),
    'SELECT 1',
    'ALTER TABLE xm_learning_record ADD KEY idx_xm_learning_record_deleted_time (deleted_flag, source_time)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS xm_learning_favorite (
    favorite_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '收藏主键',
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    result_type VARCHAR(32) NOT NULL COMMENT '结果类型',
    source_table VARCHAR(64) NOT NULL COMMENT '来源宿主表',
    source_result_id VARCHAR(64) NOT NULL COMMENT '来源主键',
    source_session_id VARCHAR(64) DEFAULT NULL COMMENT '来源会话ID',
    detail_ref VARCHAR(255) DEFAULT NULL COMMENT '打开详情定位',
    active_flag CHAR(1) NOT NULL DEFAULT '1' COMMENT '收藏状态（1收藏 0取消）',
    favorite_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    cancel_time DATETIME DEFAULT NULL COMMENT '取消收藏时间',
    create_by BIGINT DEFAULT NULL COMMENT '创建者',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by BIGINT DEFAULT NULL COMMENT '更新者',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (favorite_id),
    UNIQUE KEY uk_xm_learning_favorite_user_source (user_id, source_table, source_result_id),
    KEY idx_xm_learning_favorite_active_time (active_flag, favorite_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习中心收藏表';
