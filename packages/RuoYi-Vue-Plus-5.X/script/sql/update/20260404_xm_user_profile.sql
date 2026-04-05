-- 文件: packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260404_xm_user_profile.sql
-- Story 1.5: 用户配置系统（个人简介与学习偏好）
-- 用途: 创建用户配置表，并补充个人性格类型与 AI 导师偏好字典

SET @dict_type_base := IFNULL((SELECT MAX(dict_id) FROM sys_dict_type), 0);
SET @dict_data_base := IFNULL((SELECT MAX(dict_code) FROM sys_dict_data), 0);

-- ----------------------------
-- 用户配置表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `xm_user_profile` (
    `id`               bigint(20)      NOT NULL AUTO_INCREMENT COMMENT '主键',
    `tenant_id`        varchar(20)     NOT NULL DEFAULT '000000' COMMENT '租户编号',
    `user_id`          bigint(20)      NOT NULL COMMENT '用户ID（关联sys_user.user_id）',
    `avatar_url`       varchar(500)    DEFAULT NULL COMMENT '头像URL',
    `bio`              varchar(500)    DEFAULT NULL COMMENT '个人简介（200字限制）',
    `personality_type` varchar(50)     DEFAULT NULL COMMENT '性格类型(action_oriented/explorer/methodological/social/creative)',
    `teacher_tags`     varchar(500)    DEFAULT NULL COMMENT 'AI导师偏好（JSON数组字符串，如["humorous","logical"]）',
    `language`         varchar(10)     DEFAULT 'zh-CN' COMMENT '语言偏好',
    `is_completed`     tinyint(1)      DEFAULT 0 COMMENT '是否完成配置（0-否 1-是）',
    `create_dept`      bigint(20)      DEFAULT NULL COMMENT '创建部门',
    `create_by`        bigint(20)      DEFAULT NULL COMMENT '创建者',
    `create_time`      datetime        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_by`        bigint(20)      DEFAULT NULL COMMENT '更新者',
    `update_time`      datetime        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_xm_user_profile_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户配置表';

-- ----------------------------
-- 数据字典：用户性格类型
-- ----------------------------
INSERT INTO sys_dict_type (
    dict_id, tenant_id, dict_name, dict_type, create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_type_base + 1, '000000', '用户性格类型', 'user_personality_type', 103, 1, SYSDATE(), NULL, NULL, '用户配置中的性格类型选项'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_type WHERE dict_type = 'user_personality_type'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 1, '000000', 1, '目标明确，专注结果的行动派', 'action_oriented', 'user_personality_type', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '行动派'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_personality_type' AND dict_value = 'action_oriented'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 2, '000000', 2, '对世界充满好奇的探索者', 'explorer', 'user_personality_type', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '探索者'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_personality_type' AND dict_value = 'explorer'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 3, '000000', 3, '踏实严谨，喜欢按部就班', 'methodological', 'user_personality_type', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '严谨派'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_personality_type' AND dict_value = 'methodological'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 4, '000000', 4, '乐于交流，思维发散的社交派', 'social', 'user_personality_type', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '社交派'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_personality_type' AND dict_value = 'social'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 5, '000000', 5, '天马行空，不拘一格的创意家', 'creative', 'user_personality_type', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '创意家'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_personality_type' AND dict_value = 'creative'
);

-- ----------------------------
-- 数据字典：AI导师偏好标签
-- ----------------------------
INSERT INTO sys_dict_type (
    dict_id, tenant_id, dict_name, dict_type, create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_type_base + 2, '000000', 'AI导师偏好标签', 'user_teacher_tag', 103, 1, SYSDATE(), NULL, NULL, '用户配置中的AI导师风格偏好'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_type WHERE dict_type = 'user_teacher_tag'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 6, '000000', 1, '幽默风趣', 'humorous', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '幽默风趣风格'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'humorous'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 7, '000000', 2, '严密逻辑', 'logical', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '逻辑严密风格'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'logical'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 8, '000000', 3, '脑洞大开', 'imaginative', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '想象力丰富'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'imaginative'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 9, '000000', 4, '严格督学', 'strict', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '严格督导'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'strict'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 10, '000000', 5, '循循善诱', 'patient', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '耐心引导'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'patient'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 11, '000000', 6, '朋友般陪伴', 'friendly', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '友好陪伴'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'friendly'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 12, '000000', 7, '直击核心', 'direct', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '直击要点'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'direct'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 13, '000000', 8, '旁征博引', 'knowledgeable', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '知识渊博'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'knowledgeable'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 14, '000000', 9, '温和鼓励', 'encouraging', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '鼓励式教学'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'encouraging'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 15, '000000', 10, '互动狂魔', 'interactive', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '高频互动'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'interactive'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 16, '000000', 11, '冷静客观', 'calm', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '客观理性'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'calm'
);

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 17, '000000', 12, '充满激情', 'passionate', 'user_teacher_tag', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '激情澎湃'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'user_teacher_tag' AND dict_value = 'passionate'
);

-- ----------------------------
-- 执行说明
-- ----------------------------
-- 1. 执行此 SQL 文件创建表和数据字典
-- 2. 登录 RuoYi 后台管理系统
-- 3. 进入"系统工具" -> "代码生成"
-- 4. 点击"导入"，选择 xm_user_profile 表
-- 5. 点击"编辑"，按照 Story 1.5 文档中的配置指南填写字段属性
-- 6. 点击"生成代码"，下载并集成生成的代码
