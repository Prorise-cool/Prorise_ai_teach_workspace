-- 文件: packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260404_xm_user_profile.sql
-- Story 1.5: 用户配置系统（个人简介与学习偏好）
-- 用途: 创建用户配置表，用于存储个人简介、性格类型和AI导师偏好

USE `ry_vue`;

-- ----------------------------
-- 用户配置表
-- ----------------------------
DROP TABLE IF EXISTS `xm_user_profile`;
CREATE TABLE `xm_user_profile` (
    `id`               bigint(20)      NOT NULL AUTO_INCREMENT COMMENT '主键',
    `user_id`          bigint(20)      NOT NULL                   COMMENT '用户ID（关联sys_user.user_id）',
    `avatar_url`       varchar(500)     DEFAULT NULL               COMMENT '头像URL',
    `bio`              varchar(500)     DEFAULT NULL               COMMENT '个人简介（200字限制）',
    `personality_type` varchar(50)     DEFAULT NULL               COMMENT '性格类型(action_oriented/explorer/methodological/social/creative)',
    `teacher_tags`     varchar(500)     DEFAULT NULL               COMMENT 'AI导师偏好（JSON数组字符串，如["humorous","logical"]）',
    `language`         varchar(10)     DEFAULT 'zh-CN'            COMMENT '语言偏好',
    `is_completed`     tinyint(1)      DEFAULT 0                  COMMENT '是否完成配置（0-否 1-是）',
    -- RuoYi BaseEntity 审计字段
    `create_dept`      bigint(20)      DEFAULT NULL               COMMENT '创建部门',
    `create_by`        bigint(20)      DEFAULT NULL               COMMENT '创建者',
    `create_time`      datetime        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_by`        bigint(20)      DEFAULT NULL               COMMENT '更新者',
    `update_time`      datetime        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_xm_user_profile_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户配置表';

-- ----------------------------
-- 数据字典：用户性格类型
-- ----------------------------
-- 字典类型: user_personality_type
-- 在"系统管理 -> 字典管理"中手动添加以下字典项：
INSERT INTO `sys_dict_type` (`dict_name`, `dict_type`, `status`, `create_by`, `create_time`, `remark`)
VALUES ('用户性格类型', 'user_personality_type', '0', 1, NOW(), '用户配置中的性格类型选项');

-- 获取刚插入的dict_id，然后插入字典数据
SET @personality_dict_id = LAST_INSERT_ID();

INSERT INTO `sys_dict_data` (`dict_sort`, `dict_label`, `dict_value`, `dict_type`, `css_class`, `list_class`, `is_default`, `status`, `create_by`, `create_time`, `remark`)
VALUES
(1, '目标明确，专注结果的行动派', 'action_oriented', 'user_personality_type', NULL, 'default', 'N', '0', 1, NOW(), '行动派'),
(2, '对世界充满好奇的探索者', 'explorer', 'user_personality_type', NULL, 'default', 'N', '0', 1, NOW(), '探索者'),
(3, '踏实严谨，喜欢按部就班', 'methodological', 'user_personality_type', NULL, 'default', 'N', '0', 1, NOW(), '严谨派'),
(4, '乐于交流，思维发散的社交派', 'social', 'user_personality_type', NULL, 'default', 'N', '0', 1, NOW(), '社交派'),
(5, '天马行空，不拘一格的创意家', 'creative', 'user_personality_type', NULL, 'default', 'N', '0', 1, NOW(), '创意家');

-- ----------------------------
-- 数据字典：AI导师偏好标签
-- ----------------------------
-- 字典类型: user_teacher_tag
INSERT INTO `sys_dict_type` (`dict_name`, `dict_type`, `status`, `create_by`, `create_time`, `remark`)
VALUES ('AI导师偏好标签', 'user_teacher_tag', '0', 1, NOW(), '用户配置中的AI导师风格偏好');

SET @teacher_tag_dict_id = LAST_INSERT_ID();

INSERT INTO `sys_dict_data` (`dict_sort`, `dict_label`, `dict_value`, `dict_type`, `css_class`, `list_class`, `is_default`, `status`, `create_by`, `create_time`, `remark`)
VALUES
(1, '幽默风趣', 'humorous', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '幽默风趣风格'),
(2, '严密逻辑', 'logical', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '逻辑严密风格'),
(3, '脑洞大开', 'imaginative', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '想象力丰富'),
(4, '严格督学', 'strict', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '严格督导'),
(5, '循循善诱', 'patient', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '耐心引导'),
(6, '朋友般陪伴', 'friendly', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '友好陪伴'),
(7, '直击核心', 'direct', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '直击要点'),
(8, '旁征博引', 'knowledgeable', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '知识渊博'),
(9, '温和鼓励', 'encouraging', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '鼓励式教学'),
(10, '互动狂魔', 'interactive', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '高频互动'),
(11, '冷静客观', 'calm', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '客观理性'),
(12, '充满激情', 'passionate', 'user_teacher_tag', NULL, 'default', 'N', '0', 1, NOW(), '激情澎湃');

-- ----------------------------
-- 执行说明
-- ----------------------------
-- 1. 执行此 SQL 文件创建表和数据字典
-- 2. 登录 RuoYi 后台管理系统
-- 3. 进入"系统工具" -> "代码生成"
-- 4. 点击"导入"，选择 xm_user_profile 表
-- 5. 点击"编辑"，按照 Story 1.5 文档中的配置指南填写字段属性
-- 6. 点击"生成代码"，下载并集成生成的代码
-- 7. 手动添加 getCurrent() 和 isCompleted() 方法
