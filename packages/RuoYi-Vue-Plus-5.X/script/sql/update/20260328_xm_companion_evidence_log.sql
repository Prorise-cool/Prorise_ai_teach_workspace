-- Story 10.5: Companion 与 Evidence 问答长期承接
-- 约束：
-- 1. Companion 问答主记录进入 xm_companion_turn。
-- 2. 白板动作结构化落入 xm_whiteboard_action_log，复杂渲染结果只保存对象引用或元数据。
-- 3. Evidence / Retrieval 问答沿用历史表名 xm_knowledge_chat_log，不随 Story 10.5 改名。
-- 4. 部分失败、白板降级、引用缺失必须作为长期状态显式保存。

CREATE TABLE IF NOT EXISTS `xm_companion_turn`
(
    `turn_id`              varchar(64)  NOT NULL COMMENT 'Companion turn 主键',
    `tenant_id`            varchar(20)  DEFAULT '000000' COMMENT '租户编号',
    `user_id`              bigint       NOT NULL COMMENT '用户ID',
    `session_id`           varchar(64)  NOT NULL COMMENT '会话ID',
    `context_type`         varchar(32)  NOT NULL COMMENT '上下文类型(video/classroom/learning/document/mixed)',
    `anchor_kind`          varchar(64)  NOT NULL COMMENT '锚点类型',
    `anchor_ref`           varchar(255) NOT NULL COMMENT '锚点引用',
    `scope_summary`        varchar(500) DEFAULT NULL COMMENT '范围摘要',
    `scope_window`         varchar(500) DEFAULT NULL COMMENT '范围窗口描述',
    `source_ids_json`      longtext     DEFAULT NULL COMMENT '来源ID列表(JSON)',
    `question_text`        longtext     NOT NULL COMMENT '问题文本',
    `answer_summary`       longtext     NOT NULL COMMENT '回答摘要',
    `source_summary`       varchar(500) DEFAULT NULL COMMENT '来源摘要',
    `source_refs_json`     longtext     DEFAULT NULL COMMENT '来源引用(JSON)',
    `whiteboard_degraded`  tinyint(1)   NOT NULL DEFAULT 0 COMMENT '白板是否降级',
    `reference_missing`    tinyint(1)   NOT NULL DEFAULT 0 COMMENT '是否缺少引用来源',
    `overall_failed`       tinyint(1)   NOT NULL DEFAULT 0 COMMENT '整轮问答是否失败',
    `persistence_status`   varchar(32)  NOT NULL COMMENT 'complete_success/whiteboard_degraded/reference_missing/partial_failure/overall_failure',
    `turn_time`            datetime     NOT NULL COMMENT '问答时间',
    `create_dept`          bigint       DEFAULT NULL COMMENT '创建部门',
    `create_by`            bigint       DEFAULT NULL COMMENT '创建者',
    `create_time`          datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_by`            bigint       DEFAULT NULL COMMENT '更新者',
    `update_time`          datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `del_flag`             char(1)      DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
    `remark`               varchar(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (`turn_id`),
    KEY `idx_xm_companion_turn_user_session` (`user_id`, `session_id`),
    KEY `idx_xm_companion_turn_status_time` (`persistence_status`, `turn_time`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT ='Companion 会话时刻问答长期记录';

CREATE TABLE IF NOT EXISTS `xm_whiteboard_action_log`
(
    `action_id`            varchar(64)  NOT NULL COMMENT '白板动作主键',
    `tenant_id`            varchar(20)  DEFAULT '000000' COMMENT '租户编号',
    `turn_id`              varchar(64)  NOT NULL COMMENT '所属 turn ID',
    `user_id`              bigint       NOT NULL COMMENT '用户ID',
    `session_id`           varchar(64)  NOT NULL COMMENT '会话ID',
    `action_type`          varchar(64)  NOT NULL COMMENT '动作类型',
    `action_payload_json`  longtext     DEFAULT NULL COMMENT '动作载荷(JSON)',
    `object_ref`           varchar(255) DEFAULT NULL COMMENT '白板对象引用',
    `render_uri`           varchar(500) DEFAULT NULL COMMENT '渲染产物引用(COS/URL)',
    `render_state`         varchar(32)  DEFAULT NULL COMMENT 'rendered/degraded 等状态',
    `action_time`          datetime     NOT NULL COMMENT '动作时间',
    `create_dept`          bigint       DEFAULT NULL COMMENT '创建部门',
    `create_by`            bigint       DEFAULT NULL COMMENT '创建者',
    `create_time`          datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_by`            bigint       DEFAULT NULL COMMENT '更新者',
    `update_time`          datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `del_flag`             char(1)      DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
    `remark`               varchar(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (`action_id`),
    KEY `idx_xm_whiteboard_action_turn` (`turn_id`, `action_time`),
    KEY `idx_xm_whiteboard_action_session` (`session_id`, `user_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT ='Companion 白板动作日志';

CREATE TABLE IF NOT EXISTS `xm_knowledge_chat_log`
(
    `chat_log_id`          varchar(64)  NOT NULL COMMENT 'Evidence 历史问答主键',
    `tenant_id`            varchar(20)  DEFAULT '000000' COMMENT '租户编号',
    `user_id`              bigint       NOT NULL COMMENT '用户ID',
    `session_id`           varchar(64)  NOT NULL COMMENT '会话ID',
    `context_type`         varchar(32)  NOT NULL COMMENT '上下文类型',
    `anchor_kind`          varchar(64)  NOT NULL COMMENT '范围锚点类型',
    `anchor_ref`           varchar(255) NOT NULL COMMENT '范围锚点引用',
    `scope_summary`        varchar(500) DEFAULT NULL COMMENT '范围摘要',
    `scope_window`         varchar(500) DEFAULT NULL COMMENT '范围窗口描述',
    `source_ids_json`      longtext     DEFAULT NULL COMMENT '来源ID列表(JSON)',
    `question_text`        longtext     NOT NULL COMMENT '问题文本',
    `answer_summary`       longtext     NOT NULL COMMENT '回答摘要',
    `source_summary`       varchar(500) DEFAULT NULL COMMENT '来源摘要',
    `source_refs_json`     longtext     DEFAULT NULL COMMENT '来源引用(JSON)',
    `reference_missing`    tinyint(1)   NOT NULL DEFAULT 0 COMMENT '是否缺少引用来源',
    `overall_failed`       tinyint(1)   NOT NULL DEFAULT 0 COMMENT '整轮问答是否失败',
    `persistence_status`   varchar(32)  NOT NULL COMMENT 'complete_success/reference_missing/overall_failure',
    `chat_time`            datetime     NOT NULL COMMENT '问答时间',
    `create_dept`          bigint       DEFAULT NULL COMMENT '创建部门',
    `create_by`            bigint       DEFAULT NULL COMMENT '创建者',
    `create_time`          datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_by`            bigint       DEFAULT NULL COMMENT '更新者',
    `update_time`          datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `del_flag`             char(1)      DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
    `remark`               varchar(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (`chat_log_id`),
    KEY `idx_xm_knowledge_chat_user_session` (`user_id`, `session_id`),
    KEY `idx_xm_knowledge_chat_status_time` (`persistence_status`, `chat_time`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT ='Evidence / Retrieval 历史问答记录（沿用历史表名 xm_knowledge_chat_log）';
