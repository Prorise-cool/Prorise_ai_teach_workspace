/*
 Navicat Premium Dump SQL

 Source Server         : Mac-Mini-Docker-MySQL
 Source Server Type    : MySQL
 Source Server Version : 80045 (8.0.45)
 Source Host           : localhost:3306
 Source Schema         : xm_dev

 Target Server Type    : MySQL
 Target Server Version : 80045 (8.0.45)
 File Encoding         : 65001

 Date: 21/04/2026 00:16:04
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for xm_ai_module
-- ----------------------------
DROP TABLE IF EXISTS `xm_ai_module`;
CREATE TABLE `xm_ai_module` (
  `id` bigint NOT NULL COMMENT '主键',
  `tenant_id` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `module_code` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '模块编码，如 video/classroom/companion/knowledge/learning',
  `module_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '模块名称',
  `status` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序号',
  `remark` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '备注',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_xm_ai_module_code` (`tenant_id`,`module_code`),
  KEY `idx_xm_ai_module_status` (`tenant_id`,`status`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 配置模块主数据';

-- ----------------------------
-- Table structure for xm_ai_module_binding
-- ----------------------------
DROP TABLE IF EXISTS `xm_ai_module_binding`;
CREATE TABLE `xm_ai_module_binding` (
  `id` bigint NOT NULL COMMENT '主键',
  `tenant_id` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `module_id` bigint NOT NULL COMMENT '关联模块主键',
  `stage_code` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '阶段编码，如 storyboard/script/narration/companion/search',
  `capability` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT '能力类型，llm/tts',
  `role_code` varchar(64) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '角色编码，为空表示阶段默认链路',
  `resource_id` bigint NOT NULL COMMENT '关联资源主键',
  `priority` int NOT NULL DEFAULT '100' COMMENT '优先级，越小越优先',
  `timeout_seconds` int NOT NULL DEFAULT '30' COMMENT '超时时间，单位秒',
  `retry_attempts` int NOT NULL DEFAULT '0' COMMENT '重试次数',
  `health_source` varchar(64) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'ruoyi' COMMENT '健康状态来源',
  `runtime_settings_json` text COLLATE utf8mb4_general_ci COMMENT '运行时附加配置 JSON 字符串',
  `status` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `is_default` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'N' COMMENT '是否默认链路（Y/N）',
  `remark` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '备注',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_xm_ai_module_binding_unique` (`tenant_id`,`module_id`,`stage_code`,`capability`,`role_code`,`priority`),
  KEY `idx_xm_ai_module_binding_query` (`tenant_id`,`module_id`,`stage_code`,`capability`,`status`,`priority`),
  KEY `idx_xm_ai_module_binding_resource` (`tenant_id`,`resource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='模块阶段到运行资源的绑定关系';

-- ----------------------------
-- Table structure for xm_ai_provider
-- ----------------------------
DROP TABLE IF EXISTS `xm_ai_provider`;
CREATE TABLE `xm_ai_provider` (
  `id` bigint NOT NULL COMMENT '主键',
  `tenant_id` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `provider_code` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Provider 实例编码，如 volcengine-prod',
  `provider_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Provider 实例名称',
  `vendor_code` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '供应商编码，如 volcengine/deepseek/openai',
  `auth_type` varchar(32) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'api_key' COMMENT '鉴权类型，如 api_key/app_key_secret/access_token/custom',
  `endpoint_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '基础请求地址',
  `app_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '应用 ID',
  `api_key` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'API Key（敏感）',
  `api_secret` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'API Secret（敏感）',
  `access_token` varchar(2000) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Access Token（敏感）',
  `extra_auth_json` text COLLATE utf8mb4_general_ci COMMENT '扩展鉴权配置 JSON 字符串',
  `status` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序号',
  `remark` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '备注',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_xm_ai_provider_code` (`tenant_id`,`provider_code`),
  KEY `idx_xm_ai_provider_vendor` (`tenant_id`,`vendor_code`,`status`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI Provider 实例配置';

-- ----------------------------
-- Table structure for xm_ai_resource
-- ----------------------------
DROP TABLE IF EXISTS `xm_ai_resource`;
CREATE TABLE `xm_ai_resource` (
  `id` bigint NOT NULL COMMENT '主键',
  `tenant_id` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `provider_id` bigint NOT NULL COMMENT '关联 Provider 主键',
  `capability` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT '能力类型，llm/tts',
  `resource_code` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '资源编码',
  `resource_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '资源名称',
  `resource_type` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '资源类型，如 chat/reasoning/vision/voice',
  `runtime_provider_id` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'FastAPI 运行时 Provider ID，需符合 vendor-model_or_voice 规范',
  `model_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '上游模型名称',
  `voice_code` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '音色编码，TTS 使用',
  `language_code` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '语言编码',
  `resource_settings_json` text COLLATE utf8mb4_general_ci COMMENT '资源级扩展配置 JSON 字符串',
  `status` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序号',
  `remark` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '备注',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_xm_ai_resource_code` (`tenant_id`,`resource_code`),
  KEY `idx_xm_ai_resource_provider` (`tenant_id`,`provider_id`,`capability`,`status`,`sort_order`),
  KEY `idx_xm_ai_resource_runtime_provider` (`tenant_id`,`runtime_provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 模型 / 音色等可调度资源';

-- ----------------------------
-- Table structure for xm_classroom_session
-- ----------------------------
DROP TABLE IF EXISTS `xm_classroom_session`;
CREATE TABLE `xm_classroom_session` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `task_id` varchar(64) NOT NULL COMMENT '任务ID',
  `user_id` bigint NOT NULL COMMENT '用户ID（关联 sys_user.user_id）',
  `task_type` varchar(32) NOT NULL COMMENT '任务类型',
  `task_state` varchar(20) NOT NULL COMMENT '任务状态',
  `summary` varchar(512) NOT NULL COMMENT '任务摘要',
  `result_ref` varchar(512) DEFAULT NULL COMMENT '结果资源标识',
  `detail_ref` varchar(512) DEFAULT NULL COMMENT '结果详情标识',
  `error_summary` varchar(512) DEFAULT NULL COMMENT '失败摘要',
  `source_session_id` varchar(64) DEFAULT NULL COMMENT '来源会话ID',
  `source_artifact_ref` varchar(512) DEFAULT NULL COMMENT '来源产物引用',
  `replay_hint` varchar(512) DEFAULT NULL COMMENT '回看定位提示',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `complete_time` datetime DEFAULT NULL COMMENT '完成时间',
  `fail_time` datetime DEFAULT NULL COMMENT '失败时间',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_xm_classroom_session_task_id` (`tenant_id`,`task_id`),
  KEY `idx_xm_classroom_session_user_state_time` (`tenant_id`,`user_id`,`task_state`,`update_time`),
  KEY `idx_xm_classroom_session_session` (`tenant_id`,`source_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='课堂会话摘要长期表';

-- ----------------------------
-- Table structure for xm_companion_turn
-- ----------------------------
DROP TABLE IF EXISTS `xm_companion_turn`;
CREATE TABLE `xm_companion_turn` (
  `turn_id` varchar(64) NOT NULL COMMENT 'Companion turn 主键',
  `tenant_id` varchar(20) DEFAULT '000000' COMMENT '租户编号',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `session_id` varchar(64) NOT NULL COMMENT '会话ID',
  `context_type` varchar(32) NOT NULL COMMENT '上下文类型(video/classroom/learning/document/mixed)',
  `anchor_kind` varchar(64) NOT NULL COMMENT '锚点类型',
  `anchor_ref` varchar(255) NOT NULL COMMENT '锚点引用',
  `scope_summary` varchar(500) DEFAULT NULL COMMENT '范围摘要',
  `scope_window` varchar(500) DEFAULT NULL COMMENT '范围窗口描述',
  `source_ids_json` longtext COMMENT '来源ID列表(JSON)',
  `question_text` longtext NOT NULL COMMENT '问题文本',
  `answer_summary` longtext NOT NULL COMMENT '回答摘要',
  `source_summary` varchar(500) DEFAULT NULL COMMENT '来源摘要',
  `source_refs_json` longtext COMMENT '来源引用(JSON)',
  `whiteboard_degraded` tinyint(1) NOT NULL DEFAULT '0' COMMENT '白板是否降级',
  `reference_missing` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否缺少引用来源',
  `overall_failed` tinyint(1) NOT NULL DEFAULT '0' COMMENT '整轮问答是否失败',
  `persistence_status` varchar(32) NOT NULL COMMENT 'complete_success/whiteboard_degraded/reference_missing/partial_failure/overall_failure',
  `turn_time` datetime NOT NULL COMMENT '问答时间',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` char(1) DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`turn_id`),
  KEY `idx_xm_companion_turn_user_session` (`user_id`,`session_id`),
  KEY `idx_xm_companion_turn_status_time` (`persistence_status`,`turn_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Companion 会话时刻问答长期记录';

-- ----------------------------
-- Table structure for xm_knowledge_chat_log
-- ----------------------------
DROP TABLE IF EXISTS `xm_knowledge_chat_log`;
CREATE TABLE `xm_knowledge_chat_log` (
  `chat_log_id` varchar(64) NOT NULL COMMENT 'Evidence 历史问答主键',
  `tenant_id` varchar(20) DEFAULT '000000' COMMENT '租户编号',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `session_id` varchar(64) NOT NULL COMMENT '会话ID',
  `context_type` varchar(32) NOT NULL COMMENT '上下文类型',
  `anchor_kind` varchar(64) NOT NULL COMMENT '范围锚点类型',
  `anchor_ref` varchar(255) NOT NULL COMMENT '范围锚点引用',
  `scope_summary` varchar(500) DEFAULT NULL COMMENT '范围摘要',
  `scope_window` varchar(500) DEFAULT NULL COMMENT '范围窗口描述',
  `source_ids_json` longtext COMMENT '来源ID列表(JSON)',
  `question_text` longtext NOT NULL COMMENT '问题文本',
  `answer_summary` longtext NOT NULL COMMENT '回答摘要',
  `source_summary` varchar(500) DEFAULT NULL COMMENT '来源摘要',
  `source_refs_json` longtext COMMENT '来源引用(JSON)',
  `reference_missing` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否缺少引用来源',
  `overall_failed` tinyint(1) NOT NULL DEFAULT '0' COMMENT '整轮问答是否失败',
  `persistence_status` varchar(32) NOT NULL COMMENT 'complete_success/reference_missing/overall_failure',
  `chat_time` datetime NOT NULL COMMENT '问答时间',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` char(1) DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`chat_log_id`),
  KEY `idx_xm_knowledge_chat_user_session` (`user_id`,`session_id`),
  KEY `idx_xm_knowledge_chat_status_time` (`persistence_status`,`chat_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Evidence / Retrieval 历史问答记录（沿用历史表名 xm_knowledge_chat_log）';

-- ----------------------------
-- Table structure for xm_landing_lead
-- ----------------------------
DROP TABLE IF EXISTS `xm_landing_lead`;
CREATE TABLE `xm_landing_lead` (
  `id` bigint NOT NULL COMMENT '主键（Snowflake）',
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
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0-存在 2-删除）',
  PRIMARY KEY (`id`),
  KEY `idx_xm_landing_lead_email` (`contact_email`),
  KEY `idx_xm_landing_lead_status_time` (`processing_status`,`create_time`),
  KEY `idx_xm_landing_lead_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='营销落地页线索表';

-- ----------------------------
-- Table structure for xm_learning_favorite
-- ----------------------------
DROP TABLE IF EXISTS `xm_learning_favorite`;
CREATE TABLE `xm_learning_favorite` (
  `favorite_id` bigint NOT NULL AUTO_INCREMENT COMMENT '收藏主键',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `result_type` varchar(32) NOT NULL COMMENT '结果类型',
  `source_table` varchar(64) NOT NULL COMMENT '来源宿主表',
  `source_result_id` varchar(64) NOT NULL COMMENT '来源主键',
  `source_session_id` varchar(64) DEFAULT NULL COMMENT '来源会话ID',
  `detail_ref` varchar(255) DEFAULT NULL COMMENT '打开详情定位',
  `active_flag` char(1) NOT NULL DEFAULT '1' COMMENT '收藏状态（1收藏 0取消）',
  `favorite_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  `cancel_time` datetime DEFAULT NULL COMMENT '取消收藏时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`favorite_id`),
  UNIQUE KEY `uk_xm_learning_favorite_user_source` (`user_id`,`source_table`,`source_result_id`),
  KEY `idx_xm_learning_favorite_active_time` (`active_flag`,`favorite_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='学习中心收藏表';

-- ----------------------------
-- Table structure for xm_learning_favorite_folder
-- ----------------------------
DROP TABLE IF EXISTS `xm_learning_favorite_folder`;
CREATE TABLE `xm_learning_favorite_folder` (
  `folder_id` varchar(64) NOT NULL COMMENT '文件夹ID（如 fld_xxx）',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `folder_name` varchar(100) NOT NULL COMMENT '文件夹名称',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0-存在 1-删除）',
  PRIMARY KEY (`folder_id`),
  UNIQUE KEY `uk_xm_learning_favorite_folder_user_name` (`user_id`,`folder_name`),
  KEY `idx_xm_learning_favorite_folder_user` (`user_id`,`del_flag`,`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='收藏页文件夹';

-- ----------------------------
-- Table structure for xm_learning_favorite_folder_assignment
-- ----------------------------
DROP TABLE IF EXISTS `xm_learning_favorite_folder_assignment`;
CREATE TABLE `xm_learning_favorite_folder_assignment` (
  `assignment_id` bigint NOT NULL AUTO_INCREMENT COMMENT '归档映射主键',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `record_id` varchar(128) NOT NULL COMMENT '学习中心记录ID',
  `folder_id` varchar(64) NOT NULL COMMENT '文件夹ID',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `uk_xm_learning_favorite_folder_assignment_user_record` (`user_id`,`record_id`),
  KEY `idx_xm_learning_favorite_folder_assignment_user_folder` (`user_id`,`folder_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='收藏记录归档映射';

-- ----------------------------
-- Table structure for xm_learning_path
-- ----------------------------
DROP TABLE IF EXISTS `xm_learning_path`;
CREATE TABLE `xm_learning_path` (
  `path_id` bigint NOT NULL COMMENT '路径主键',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `record_id` bigint NOT NULL COMMENT '关联结果主键',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `result_type` varchar(32) NOT NULL DEFAULT 'path' COMMENT '结果类型',
  `source_type` varchar(32) NOT NULL COMMENT '来源类型',
  `source_session_id` varchar(64) NOT NULL COMMENT '来源会话ID',
  `source_task_id` varchar(64) DEFAULT NULL COMMENT '来源任务ID',
  `source_result_id` varchar(64) DEFAULT NULL COMMENT '来源结果ID',
  `path_title` varchar(255) DEFAULT NULL COMMENT '路径标题',
  `path_summary` varchar(2000) DEFAULT NULL COMMENT '路径摘要',
  `step_count` int DEFAULT NULL COMMENT '步骤数',
  `detail_ref` varchar(255) DEFAULT NULL COMMENT '打开详情定位',
  `source_time` datetime DEFAULT NULL COMMENT '来源发生时间',
  `status` varchar(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
  `version_no` int DEFAULT NULL COMMENT '版本号',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`path_id`),
  KEY `idx_xm_learning_path_record` (`record_id`),
  KEY `idx_xm_learning_path_source` (`source_result_id`),
  KEY `idx_xm_learning_path_user_version` (`user_id`,`version_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Learning Coach 学习路径';

-- ----------------------------
-- Table structure for xm_learning_recommendation
-- ----------------------------
DROP TABLE IF EXISTS `xm_learning_recommendation`;
CREATE TABLE `xm_learning_recommendation` (
  `recommendation_id` bigint NOT NULL COMMENT '推荐主键',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `record_id` bigint NOT NULL COMMENT '关联结果主键',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `result_type` varchar(32) NOT NULL DEFAULT 'recommendation' COMMENT '结果类型',
  `source_type` varchar(32) NOT NULL COMMENT '来源类型',
  `source_session_id` varchar(64) NOT NULL COMMENT '来源会话ID',
  `source_task_id` varchar(64) DEFAULT NULL COMMENT '来源任务ID',
  `source_result_id` varchar(64) DEFAULT NULL COMMENT '来源结果ID',
  `recommendation_reason` varchar(2000) DEFAULT NULL COMMENT '推荐原因',
  `target_type` varchar(32) DEFAULT NULL COMMENT '推荐目标类型',
  `target_ref_id` varchar(64) DEFAULT NULL COMMENT '推荐目标引用ID',
  `detail_ref` varchar(255) DEFAULT NULL COMMENT '打开详情定位',
  `source_time` datetime DEFAULT NULL COMMENT '来源发生时间',
  `status` varchar(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
  `version_no` int DEFAULT NULL COMMENT '版本号',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`recommendation_id`),
  KEY `idx_xm_learning_recommendation_record` (`record_id`),
  KEY `idx_xm_learning_recommendation_source` (`source_result_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Learning Coach 知识推荐';

-- ----------------------------
-- Table structure for xm_learning_record
-- ----------------------------
DROP TABLE IF EXISTS `xm_learning_record`;
CREATE TABLE `xm_learning_record` (
  `record_id` bigint NOT NULL AUTO_INCREMENT COMMENT '学习记录主键',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `result_type` varchar(32) NOT NULL COMMENT '结果类型 checkpoint/quiz/wrongbook/recommendation/path',
  `display_title` varchar(255) DEFAULT NULL COMMENT '聚合卡片标题',
  `source_type` varchar(32) NOT NULL COMMENT '来源类型 video/classroom/companion/knowledge/learning/manual',
  `source_table` varchar(64) NOT NULL DEFAULT 'xm_learning_record' COMMENT '来源宿主表',
  `source_session_id` varchar(64) NOT NULL COMMENT '来源会话ID',
  `source_task_id` varchar(64) DEFAULT NULL COMMENT '来源任务ID',
  `source_result_id` varchar(64) DEFAULT NULL COMMENT '来源结果ID',
  `source_time` datetime DEFAULT NULL COMMENT '来源发生时间',
  `status` varchar(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
  `score` int DEFAULT NULL COMMENT '得分',
  `analysis_summary` varchar(1000) DEFAULT NULL COMMENT '解析摘要',
  `detail_ref` varchar(255) DEFAULT NULL COMMENT '打开详情定位',
  `version_no` int DEFAULT NULL COMMENT '版本号',
  `deleted_flag` char(1) NOT NULL DEFAULT '0' COMMENT '历史删除标记（0展示 1隐藏）',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `uk_xm_learning_record_user_source` (`user_id`,`source_table`,`source_result_id`),
  KEY `idx_xm_learning_record_user_type` (`user_id`,`result_type`),
  KEY `idx_xm_learning_record_source_session` (`source_session_id`),
  KEY `idx_xm_learning_record_source_result` (`source_result_id`),
  KEY `idx_xm_learning_record_deleted_time` (`deleted_flag`,`source_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Learning Coach 结果总表';

-- ----------------------------
-- Table structure for xm_learning_wrongbook
-- ----------------------------
DROP TABLE IF EXISTS `xm_learning_wrongbook`;
CREATE TABLE `xm_learning_wrongbook` (
  `wrongbook_id` bigint NOT NULL COMMENT '错题本主键',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `record_id` bigint NOT NULL COMMENT '关联结果主键',
  `quiz_result_id` bigint DEFAULT NULL COMMENT '关联测验结果主键',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `result_type` varchar(32) NOT NULL DEFAULT 'wrongbook' COMMENT '结果类型',
  `source_type` varchar(32) NOT NULL COMMENT '来源类型',
  `source_session_id` varchar(64) NOT NULL COMMENT '来源会话ID',
  `source_task_id` varchar(64) DEFAULT NULL COMMENT '来源任务ID',
  `source_result_id` varchar(64) DEFAULT NULL COMMENT '来源结果ID',
  `question_text` varchar(2000) DEFAULT NULL COMMENT '题目文本',
  `wrong_answer_text` varchar(1000) DEFAULT NULL COMMENT '用户错误答案',
  `reference_answer_text` varchar(1000) DEFAULT NULL COMMENT '参考答案',
  `analysis_summary` varchar(1000) DEFAULT NULL COMMENT '解析摘要',
  `detail_ref` varchar(255) DEFAULT NULL COMMENT '打开详情定位',
  `source_time` datetime DEFAULT NULL COMMENT '来源发生时间',
  `status` varchar(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`wrongbook_id`),
  KEY `idx_xm_learning_wrongbook_record` (`record_id`),
  KEY `idx_xm_learning_wrongbook_quiz` (`quiz_result_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Learning Coach 错题本';

-- ----------------------------
-- Table structure for xm_quiz_result
-- ----------------------------
DROP TABLE IF EXISTS `xm_quiz_result`;
CREATE TABLE `xm_quiz_result` (
  `quiz_result_id` bigint NOT NULL COMMENT '测验结果主键',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `record_id` bigint NOT NULL COMMENT '关联结果主键',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `source_type` varchar(32) NOT NULL COMMENT '来源类型',
  `source_session_id` varchar(64) NOT NULL COMMENT '来源会话ID',
  `source_task_id` varchar(64) DEFAULT NULL COMMENT '来源任务ID',
  `source_result_id` varchar(64) DEFAULT NULL COMMENT '来源结果ID',
  `question_total` int DEFAULT NULL COMMENT '题目总数',
  `correct_total` int DEFAULT NULL COMMENT '正确题数',
  `status` varchar(20) NOT NULL DEFAULT 'completed' COMMENT '结果状态',
  `score` int DEFAULT NULL COMMENT '得分',
  `analysis_summary` varchar(1000) DEFAULT NULL COMMENT '解析摘要',
  `detail_ref` varchar(255) DEFAULT NULL COMMENT '打开详情定位',
  `source_time` datetime DEFAULT NULL COMMENT '来源发生时间',
  `version_no` int DEFAULT NULL COMMENT '版本号',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`quiz_result_id`),
  KEY `idx_xm_quiz_result_record` (`record_id`),
  KEY `idx_xm_quiz_result_user_source` (`user_id`,`source_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Learning Coach quiz 结果';

-- ----------------------------
-- Table structure for xm_session_artifact
-- ----------------------------
DROP TABLE IF EXISTS `xm_session_artifact`;
CREATE TABLE `xm_session_artifact` (
  `id` bigint NOT NULL COMMENT '主键',
  `tenant_id` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `session_type` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '会话类型',
  `session_ref_id` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '会话关联 ID',
  `artifact_type` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '产物类型',
  `anchor_type` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '锚点类型',
  `anchor_key` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '锚点标识',
  `sequence_no` int NOT NULL DEFAULT '0' COMMENT '顺序号',
  `title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '产物标题',
  `summary` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '产物摘要',
  `object_key` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '对象引用',
  `payload_ref` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '详情载荷引用',
  `metadata_json` json DEFAULT NULL COMMENT '结构化元数据',
  `occurred_at` datetime DEFAULT NULL COMMENT '产物时间',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` char(1) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
  PRIMARY KEY (`id`),
  KEY `idx_xm_session_artifact_session` (`tenant_id`,`session_type`,`session_ref_id`),
  KEY `idx_xm_session_artifact_anchor` (`tenant_id`,`anchor_type`,`anchor_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='SessionArtifactGraph 长期索引';

-- ----------------------------
-- Table structure for xm_user_profile
-- ----------------------------
DROP TABLE IF EXISTS `xm_user_profile`;
CREATE TABLE `xm_user_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `user_id` bigint NOT NULL COMMENT '用户ID（关联sys_user.user_id）',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `bio` varchar(500) DEFAULT NULL COMMENT '个人简介（200字限制）',
  `school_name` varchar(200) DEFAULT NULL COMMENT '学校',
  `major_name` varchar(200) DEFAULT NULL COMMENT '专业',
  `identity_label` varchar(100) DEFAULT NULL COMMENT '身份',
  `grade_label` varchar(100) DEFAULT NULL COMMENT '年级',
  `personality_type` varchar(50) DEFAULT NULL COMMENT '性格类型(action_oriented/explorer/methodological/social/creative)',
  `teacher_tags` varchar(500) DEFAULT NULL COMMENT 'AI导师偏好（JSON数组字符串，如["humorous","logical"]）',
  `language` varchar(10) DEFAULT 'zh-CN' COMMENT '语言偏好',
  `theme_mode` varchar(16) DEFAULT NULL COMMENT '主题模式 light/dark/system',
  `notification_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '站内通知偏好（1-开启 0-关闭）',
  `is_completed` tinyint(1) DEFAULT '0' COMMENT '是否完成配置（0-否 1-是）',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_xm_user_profile_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2040458161533485058 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户配置表';

-- ----------------------------
-- Table structure for xm_user_work
-- ----------------------------
DROP TABLE IF EXISTS `xm_user_work`;
CREATE TABLE `xm_user_work` (
  `id` bigint NOT NULL COMMENT '主键（Snowflake）',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `user_id` bigint NOT NULL COMMENT '作品所有者（关联 sys_user.user_id）',
  `work_type` varchar(20) NOT NULL COMMENT '作品类型（video / classroom）',
  `task_ref_id` varchar(64) NOT NULL COMMENT '来源任务ID（对应 xm_video_task.task_id 或 xm_classroom_session.task_id）',
  `title` varchar(200) NOT NULL DEFAULT '' COMMENT '作品标题',
  `description` varchar(500) DEFAULT NULL COMMENT '作品描述',
  `cover_oss_id` bigint DEFAULT NULL COMMENT '封面图 OSS ID（关联 sys_oss.oss_id）',
  `cover_url` varchar(500) DEFAULT NULL COMMENT '封面图直链（冗余缓存，避免高频 JOIN sys_oss）',
  `is_public` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否公开到社区（0-私有 1-公开）',
  `status` varchar(20) NOT NULL DEFAULT 'normal' COMMENT '管理状态（normal/hidden/blocked）—— 管理员在 RuoYi 后台可操作',
  `view_count` int NOT NULL DEFAULT '0' COMMENT '浏览量',
  `like_count` int NOT NULL DEFAULT '0' COMMENT '点赞量',
  `version` int NOT NULL DEFAULT '0' COMMENT '乐观锁版本',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者（sys_user.user_id）',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者（sys_user.user_id）',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` int NOT NULL DEFAULT '0' COMMENT '删除标志（0-存在 1-删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_xm_user_work_task_ref` (`tenant_id`,`work_type`,`task_ref_id`),
  KEY `idx_xm_user_work_tenant` (`tenant_id`),
  KEY `idx_xm_user_work_user_public_time` (`tenant_id`,`user_id`,`is_public`,`create_time`),
  KEY `idx_xm_user_work_community_feed` (`tenant_id`,`is_public`,`status`,`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户作品表（视频/课堂）—— 社区瀑布流与管理后台共用';

-- ----------------------------
-- Table structure for xm_video_task
-- ----------------------------
DROP TABLE IF EXISTS `xm_video_task`;
CREATE TABLE `xm_video_task` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
  `task_id` varchar(64) NOT NULL COMMENT '任务ID',
  `user_id` bigint NOT NULL COMMENT '用户ID（关联 sys_user.user_id）',
  `task_type` varchar(32) NOT NULL COMMENT '任务类型',
  `task_state` varchar(20) NOT NULL COMMENT '任务状态',
  `summary` varchar(512) NOT NULL COMMENT '任务摘要',
  `result_ref` varchar(512) DEFAULT NULL COMMENT '结果资源标识',
  `detail_ref` varchar(512) DEFAULT NULL COMMENT '结果详情标识',
  `error_summary` varchar(512) DEFAULT NULL COMMENT '失败摘要',
  `source_session_id` varchar(64) DEFAULT NULL COMMENT '来源会话ID',
  `source_artifact_ref` varchar(512) DEFAULT NULL COMMENT '来源产物引用',
  `replay_hint` varchar(512) DEFAULT NULL COMMENT '回看定位提示',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `complete_time` datetime DEFAULT NULL COMMENT '完成时间',
  `fail_time` datetime DEFAULT NULL COMMENT '失败时间',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0代表存在 1代表删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_xm_video_task_task_id` (`tenant_id`,`task_id`),
  KEY `idx_xm_video_task_user_state_time` (`tenant_id`,`user_id`,`task_state`,`update_time`),
  KEY `idx_xm_video_task_session` (`tenant_id`,`source_session_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2046250620360355842 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='视频任务元数据长期表';

-- ----------------------------
-- Table structure for xm_whiteboard_action_log
-- ----------------------------
DROP TABLE IF EXISTS `xm_whiteboard_action_log`;
CREATE TABLE `xm_whiteboard_action_log` (
  `action_id` varchar(64) NOT NULL COMMENT '白板动作主键',
  `tenant_id` varchar(20) DEFAULT '000000' COMMENT '租户编号',
  `turn_id` varchar(64) NOT NULL COMMENT '所属 turn ID',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `session_id` varchar(64) NOT NULL COMMENT '会话ID',
  `action_type` varchar(64) NOT NULL COMMENT '动作类型',
  `action_payload_json` longtext COMMENT '动作载荷(JSON)',
  `object_ref` varchar(255) DEFAULT NULL COMMENT '白板对象引用',
  `render_uri` varchar(500) DEFAULT NULL COMMENT '渲染产物引用(COS/URL)',
  `render_state` varchar(32) DEFAULT NULL COMMENT 'rendered/degraded 等状态',
  `action_time` datetime NOT NULL COMMENT '动作时间',
  `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` char(1) DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`action_id`),
  KEY `idx_xm_whiteboard_action_turn` (`turn_id`,`action_time`),
  KEY `idx_xm_whiteboard_action_session` (`session_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Companion 白板动作日志';

SET FOREIGN_KEY_CHECKS = 1;
