-- 文件: packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260405_xm_landing_lead.sql
-- Story 1.7: 营销落地页线索表与状态字典基线
-- 用途: 创建 / 修正 xm_landing_lead，并补齐处理状态字典

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `xm_landing_lead` (
    `id` bigint(20) NOT NULL COMMENT '主键（Snowflake）',
    `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
    `contact_name` varchar(100) NOT NULL COMMENT '联系人姓名',
    `organization_name` varchar(200) DEFAULT NULL COMMENT '机构 / 称呼',
    `contact_email` varchar(255) NOT NULL COMMENT '联系邮箱',
    `subject` varchar(100) NOT NULL COMMENT '咨询主题',
    `message` varchar(2000) NOT NULL COMMENT '留言内容',
    `source_page` varchar(100) NOT NULL DEFAULT '/landing' COMMENT '来源页面',
    `source_locale` varchar(10) DEFAULT 'zh-CN' COMMENT '提交语言',
    `processing_status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '处理状态（pending/contacted/closed）',
    `remark` varchar(500) DEFAULT NULL COMMENT '后台备注',
    `create_dept` bigint(20) DEFAULT NULL COMMENT '创建部门',
    `create_by` bigint(20) DEFAULT NULL COMMENT '创建者',
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_by` bigint(20) DEFAULT NULL COMMENT '更新者',
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0-存在 2-删除）',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营销落地页线索表';

ALTER TABLE `xm_landing_lead`
    MODIFY COLUMN `id` bigint(20) NOT NULL COMMENT '主键（Snowflake）',
    MODIFY COLUMN `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
    MODIFY COLUMN `contact_name` varchar(100) NOT NULL COMMENT '联系人姓名',
    MODIFY COLUMN `organization_name` varchar(200) DEFAULT NULL COMMENT '机构 / 称呼',
    MODIFY COLUMN `contact_email` varchar(255) NOT NULL COMMENT '联系邮箱',
    MODIFY COLUMN `subject` varchar(100) NOT NULL COMMENT '咨询主题',
    MODIFY COLUMN `message` varchar(2000) NOT NULL COMMENT '留言内容',
    MODIFY COLUMN `source_page` varchar(100) NOT NULL DEFAULT '/landing' COMMENT '来源页面',
    MODIFY COLUMN `source_locale` varchar(10) DEFAULT 'zh-CN' COMMENT '提交语言',
    MODIFY COLUMN `processing_status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '处理状态（pending/contacted/closed）',
    MODIFY COLUMN `remark` varchar(500) DEFAULT NULL COMMENT '后台备注',
    MODIFY COLUMN `create_dept` bigint(20) DEFAULT NULL COMMENT '创建部门',
    MODIFY COLUMN `create_by` bigint(20) DEFAULT NULL COMMENT '创建者',
    MODIFY COLUMN `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    MODIFY COLUMN `update_by` bigint(20) DEFAULT NULL COMMENT '更新者',
    MODIFY COLUMN `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    MODIFY COLUMN `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0-存在 2-删除）';

SET @schema_name := DATABASE();

SET @idx_email_exists := (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'xm_landing_lead'
      AND INDEX_NAME = 'idx_xm_landing_lead_email'
);
SET @sql := IF(
    @idx_email_exists = 0,
    'ALTER TABLE `xm_landing_lead` ADD INDEX `idx_xm_landing_lead_email` (`contact_email`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_status_time_exists := (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'xm_landing_lead'
      AND INDEX_NAME = 'idx_xm_landing_lead_status_time'
);
SET @sql := IF(
    @idx_status_time_exists = 0,
    'ALTER TABLE `xm_landing_lead` ADD INDEX `idx_xm_landing_lead_status_time` (`processing_status`, `create_time`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_tenant_exists := (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'xm_landing_lead'
      AND INDEX_NAME = 'idx_xm_landing_lead_tenant'
);
SET @sql := IF(
    @idx_tenant_exists = 0,
    'ALTER TABLE `xm_landing_lead` ADD INDEX `idx_xm_landing_lead_tenant` (`tenant_id`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @dict_type_id := IFNULL(
    (SELECT dict_id FROM sys_dict_type WHERE dict_type = 'xm_landing_lead_status' LIMIT 1),
    IFNULL((SELECT MAX(dict_id) FROM sys_dict_type), 0) + 1
);
SET @dict_data_base := IFNULL((SELECT MAX(dict_code) FROM sys_dict_data), 0);

DELETE FROM `sys_dict_data` WHERE `dict_type` = 'xm_landing_lead_status';
DELETE FROM `sys_dict_type` WHERE `dict_type` = 'xm_landing_lead_status';

INSERT INTO `sys_dict_type` (
    `dict_id`, `tenant_id`, `dict_name`, `dict_type`, `create_dept`, `create_by`, `create_time`, `update_by`, `update_time`, `remark`
) VALUES (
    @dict_type_id, '000000', '落地页线索处理状态', 'xm_landing_lead_status', 103, 1, SYSDATE(), NULL, NULL, '营销落地页线索状态'
);

INSERT INTO `sys_dict_data` (
    `dict_code`, `tenant_id`, `dict_sort`, `dict_label`, `dict_value`, `dict_type`, `css_class`, `list_class`, `is_default`,
    `create_dept`, `create_by`, `create_time`, `update_by`, `update_time`, `remark`
) VALUES
    (@dict_data_base + 1, '000000', 1, '待处理', 'pending', 'xm_landing_lead_status', '', 'warning', 'Y', 103, 1, SYSDATE(), NULL, NULL, '默认状态'),
    (@dict_data_base + 2, '000000', 2, '已联系', 'contacted', 'xm_landing_lead_status', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '已跟进'),
    (@dict_data_base + 3, '000000', 3, '已关闭', 'closed', 'xm_landing_lead_status', '', 'success', 'N', 103, 1, SYSDATE(), NULL, NULL, '已关闭');
