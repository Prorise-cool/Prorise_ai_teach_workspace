-- Learning Coach 长期结果表
CREATE TABLE IF NOT EXISTS xm_learning_record (
    record_id BIGINT NOT NULL COMMENT '结果主键',
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    result_type VARCHAR(32) NOT NULL COMMENT '结果类型 checkpoint/quiz/wrongbook/recommendation/path',
    source_type VARCHAR(32) NOT NULL COMMENT '来源类型 video/classroom/companion/knowledge/learning/manual',
    source_session_id VARCHAR(64) NOT NULL COMMENT '来源会话ID',
    source_task_id VARCHAR(64) DEFAULT NULL COMMENT '来源任务ID',
    source_result_id VARCHAR(64) DEFAULT NULL COMMENT '来源结果ID',
    source_time DATETIME DEFAULT NULL COMMENT '来源发生时间',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
    score INT DEFAULT NULL COMMENT '得分',
    analysis_summary VARCHAR(1000) DEFAULT NULL COMMENT '解析摘要',
    detail_ref VARCHAR(255) DEFAULT NULL COMMENT '打开详情定位',
    version_no INT DEFAULT NULL COMMENT '版本号',
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

CREATE TABLE IF NOT EXISTS xm_quiz_result (
    quiz_result_id BIGINT NOT NULL COMMENT '测验结果主键',
    record_id BIGINT NOT NULL COMMENT '关联结果主键',
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    source_type VARCHAR(32) NOT NULL COMMENT '来源类型',
    source_session_id VARCHAR(64) NOT NULL COMMENT '来源会话ID',
    source_task_id VARCHAR(64) DEFAULT NULL COMMENT '来源任务ID',
    source_result_id VARCHAR(64) DEFAULT NULL COMMENT '来源结果ID',
    question_total INT DEFAULT NULL COMMENT '题目总数',
    correct_total INT DEFAULT NULL COMMENT '正确题数',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
    score INT DEFAULT NULL COMMENT '得分',
    analysis_summary VARCHAR(1000) DEFAULT NULL COMMENT '解析摘要',
    detail_ref VARCHAR(255) DEFAULT NULL COMMENT '打开详情定位',
    source_time DATETIME DEFAULT NULL COMMENT '来源发生时间',
    version_no INT DEFAULT NULL COMMENT '版本号',
    create_by BIGINT DEFAULT NULL COMMENT '创建者',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_by BIGINT DEFAULT NULL COMMENT '更新者',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (quiz_result_id),
    KEY idx_xm_quiz_result_record (record_id),
    KEY idx_xm_quiz_result_user_source (user_id, source_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Learning Coach quiz 结果';

CREATE TABLE IF NOT EXISTS xm_learning_wrongbook (
    wrongbook_id BIGINT NOT NULL COMMENT '错题本主键',
    record_id BIGINT NOT NULL COMMENT '关联结果主键',
    quiz_result_id BIGINT DEFAULT NULL COMMENT '关联测验结果主键',
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    result_type VARCHAR(32) NOT NULL DEFAULT 'wrongbook' COMMENT '结果类型',
    source_type VARCHAR(32) NOT NULL COMMENT '来源类型',
    source_session_id VARCHAR(64) NOT NULL COMMENT '来源会话ID',
    source_task_id VARCHAR(64) DEFAULT NULL COMMENT '来源任务ID',
    source_result_id VARCHAR(64) DEFAULT NULL COMMENT '来源结果ID',
    question_text VARCHAR(2000) DEFAULT NULL COMMENT '题目文本',
    wrong_answer_text VARCHAR(1000) DEFAULT NULL COMMENT '用户错误答案',
    reference_answer_text VARCHAR(1000) DEFAULT NULL COMMENT '参考答案',
    analysis_summary VARCHAR(1000) DEFAULT NULL COMMENT '解析摘要',
    detail_ref VARCHAR(255) DEFAULT NULL COMMENT '打开详情定位',
    source_time DATETIME DEFAULT NULL COMMENT '来源发生时间',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
    create_by BIGINT DEFAULT NULL COMMENT '创建者',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_by BIGINT DEFAULT NULL COMMENT '更新者',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (wrongbook_id),
    KEY idx_xm_learning_wrongbook_record (record_id),
    KEY idx_xm_learning_wrongbook_quiz (quiz_result_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Learning Coach 错题本';

CREATE TABLE IF NOT EXISTS xm_learning_recommendation (
    recommendation_id BIGINT NOT NULL COMMENT '推荐主键',
    record_id BIGINT NOT NULL COMMENT '关联结果主键',
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    result_type VARCHAR(32) NOT NULL DEFAULT 'recommendation' COMMENT '结果类型',
    source_type VARCHAR(32) NOT NULL COMMENT '来源类型',
    source_session_id VARCHAR(64) NOT NULL COMMENT '来源会话ID',
    source_task_id VARCHAR(64) DEFAULT NULL COMMENT '来源任务ID',
    source_result_id VARCHAR(64) DEFAULT NULL COMMENT '来源结果ID',
    recommendation_reason VARCHAR(2000) DEFAULT NULL COMMENT '推荐原因',
    target_type VARCHAR(32) DEFAULT NULL COMMENT '推荐目标类型',
    target_ref_id VARCHAR(64) DEFAULT NULL COMMENT '推荐目标引用ID',
    detail_ref VARCHAR(255) DEFAULT NULL COMMENT '打开详情定位',
    source_time DATETIME DEFAULT NULL COMMENT '来源发生时间',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
    version_no INT DEFAULT NULL COMMENT '版本号',
    create_by BIGINT DEFAULT NULL COMMENT '创建者',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_by BIGINT DEFAULT NULL COMMENT '更新者',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (recommendation_id),
    KEY idx_xm_learning_recommendation_record (record_id),
    KEY idx_xm_learning_recommendation_source (source_result_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Learning Coach 知识推荐';

CREATE TABLE IF NOT EXISTS xm_learning_path (
    path_id BIGINT NOT NULL COMMENT '路径主键',
    record_id BIGINT NOT NULL COMMENT '关联结果主键',
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    result_type VARCHAR(32) NOT NULL DEFAULT 'path' COMMENT '结果类型',
    source_type VARCHAR(32) NOT NULL COMMENT '来源类型',
    source_session_id VARCHAR(64) NOT NULL COMMENT '来源会话ID',
    source_task_id VARCHAR(64) DEFAULT NULL COMMENT '来源任务ID',
    source_result_id VARCHAR(64) DEFAULT NULL COMMENT '来源结果ID',
    path_title VARCHAR(255) DEFAULT NULL COMMENT '路径标题',
    path_summary VARCHAR(2000) DEFAULT NULL COMMENT '路径摘要',
    step_count INT DEFAULT NULL COMMENT '步骤数',
    detail_ref VARCHAR(255) DEFAULT NULL COMMENT '打开详情定位',
    source_time DATETIME DEFAULT NULL COMMENT '来源发生时间',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
    version_no INT DEFAULT NULL COMMENT '版本号',
    create_by BIGINT DEFAULT NULL COMMENT '创建者',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_by BIGINT DEFAULT NULL COMMENT '更新者',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (path_id),
    KEY idx_xm_learning_path_record (record_id),
    KEY idx_xm_learning_path_source (source_result_id),
    KEY idx_xm_learning_path_user_version (user_id, version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Learning Coach 学习路径';

ALTER TABLE xm_learning_record
    MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '用户ID';

SET @ddl := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'xm_quiz_result'
          AND COLUMN_NAME = 'status'
    ),
    'SELECT 1',
    'ALTER TABLE xm_quiz_result ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''completed'' COMMENT ''结果状态'' AFTER correct_total'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE xm_quiz_result
    MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '用户ID';

ALTER TABLE xm_learning_wrongbook
    MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '用户ID';

ALTER TABLE xm_learning_recommendation
    MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '用户ID';

ALTER TABLE xm_learning_path
    MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '用户ID';
