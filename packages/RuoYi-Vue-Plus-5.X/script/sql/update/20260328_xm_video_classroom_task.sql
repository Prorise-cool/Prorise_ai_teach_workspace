-- Story 10.4: 视频与课堂任务元数据长期承接
-- 约束：
-- 1. 长期业务元数据必须进入 RuoYi/MySQL，不得只停留在 Redis 运行态。
-- 2. 任务状态统一使用 pending / processing / completed / failed / cancelled。
-- 3. 大体积结果只保留 COS / 结果引用，不在主表中存放执行产物本体。
-- 4. 失败任务必须保留失败摘要与失败时间，便于后台与学习中心回看。

CREATE TABLE IF NOT EXISTS xm_video_task (
    id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
    task_id varchar(64) NOT NULL COMMENT '任务ID',
    user_id varchar(64) NOT NULL COMMENT '用户归属',
    task_type varchar(32) NOT NULL COMMENT '任务类型',
    task_state varchar(20) NOT NULL COMMENT '任务状态',
    summary varchar(512) NOT NULL COMMENT '任务摘要',
    result_ref varchar(512) DEFAULT NULL COMMENT '结果资源标识',
    detail_ref varchar(512) DEFAULT NULL COMMENT '结果详情标识',
    error_summary varchar(512) DEFAULT NULL COMMENT '失败摘要',
    source_session_id varchar(64) DEFAULT NULL COMMENT '来源会话ID',
    source_artifact_ref varchar(512) DEFAULT NULL COMMENT '来源产物引用',
    replay_hint varchar(512) DEFAULT NULL COMMENT '回看定位提示',
    start_time datetime DEFAULT NULL COMMENT '开始时间',
    complete_time datetime DEFAULT NULL COMMENT '完成时间',
    fail_time datetime DEFAULT NULL COMMENT '失败时间',
    create_dept bigint(20) DEFAULT NULL COMMENT '创建部门',
    create_by bigint(20) DEFAULT NULL COMMENT '创建者',
    create_time datetime DEFAULT NULL COMMENT '创建时间',
    update_by bigint(20) DEFAULT NULL COMMENT '更新者',
    update_time datetime DEFAULT NULL COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_xm_video_task_task_id (task_id),
    KEY idx_xm_video_task_user_state_time (user_id, task_state, update_time),
    KEY idx_xm_video_task_session (source_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='视频任务元数据长期表';

CREATE TABLE IF NOT EXISTS xm_classroom_session (
    id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
    task_id varchar(64) NOT NULL COMMENT '任务ID',
    user_id varchar(64) NOT NULL COMMENT '用户归属',
    task_type varchar(32) NOT NULL COMMENT '任务类型',
    task_state varchar(20) NOT NULL COMMENT '任务状态',
    summary varchar(512) NOT NULL COMMENT '任务摘要',
    result_ref varchar(512) DEFAULT NULL COMMENT '结果资源标识',
    detail_ref varchar(512) DEFAULT NULL COMMENT '结果详情标识',
    error_summary varchar(512) DEFAULT NULL COMMENT '失败摘要',
    source_session_id varchar(64) DEFAULT NULL COMMENT '来源会话ID',
    source_artifact_ref varchar(512) DEFAULT NULL COMMENT '来源产物引用',
    replay_hint varchar(512) DEFAULT NULL COMMENT '回看定位提示',
    start_time datetime DEFAULT NULL COMMENT '开始时间',
    complete_time datetime DEFAULT NULL COMMENT '完成时间',
    fail_time datetime DEFAULT NULL COMMENT '失败时间',
    create_dept bigint(20) DEFAULT NULL COMMENT '创建部门',
    create_by bigint(20) DEFAULT NULL COMMENT '创建者',
    create_time datetime DEFAULT NULL COMMENT '创建时间',
    update_by bigint(20) DEFAULT NULL COMMENT '更新者',
    update_time datetime DEFAULT NULL COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_xm_classroom_session_task_id (task_id),
    KEY idx_xm_classroom_session_user_state_time (user_id, task_state, update_time),
    KEY idx_xm_classroom_session_session (source_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课堂会话摘要长期表';
