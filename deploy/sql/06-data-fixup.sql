-- ============================================================================
-- 06-data-fixup.sql
-- 在 mysqldump 导入完成 + 应用容器启动前 执行
-- 目的：把开发态数据中"必炸"的本地路径 / 测试垃圾清理到生产可用状态
--
-- 执行方式：
--   docker exec -i xm-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" xm_dev < 06-data-fixup.sql
--
-- 幂等性：所有语句多次执行结果一致；TRUNCATE 不会破坏 schema
-- ============================================================================

USE xm_dev;
SET FOREIGN_KEY_CHECKS=0;

-- ---------------------------------------------------------------------------
-- 1) MinIO endpoint 改为容器内 service 名（compose 网络可达）
-- ---------------------------------------------------------------------------
UPDATE sys_oss_config
   SET endpoint = 'minio:9000',
       access_key = 'xm_minio',                      -- 与 deploy/.env.prod 中 MINIO_ROOT_USER 保持一致
       secret_key = '4F8Wg3NH60sYAGc1fZZW0yy5',      -- 与 deploy/.env.prod 中 MINIO_ROOT_PASSWORD 保持一致
       bucket_name = 'ruoyi',
       is_https = 'N',
       update_time = NOW()
 WHERE config_key IN ('minio', 'image');

-- 确保只有 minio 在用（id=1），其他云配置全部停用
UPDATE sys_oss_config SET status = 1 WHERE config_key NOT IN ('minio', 'image');
UPDATE sys_oss_config SET status = 0 WHERE config_key = 'minio';

-- ---------------------------------------------------------------------------
-- 2) 历史 OSS 文件全部清空（用户决定：服务器空 bucket，历史不保留）
-- ---------------------------------------------------------------------------
TRUNCATE TABLE sys_oss;

-- 用户头像 URL 清空（依赖 sys_oss 的旧 URL，已失效）
UPDATE xm_user_profile SET avatar_url = '' WHERE avatar_url IS NOT NULL AND avatar_url != '';

-- ---------------------------------------------------------------------------
-- 3) 业务测试数据全清（用户决定：dev 期间产生的会话/产物/记录全部不保留）
-- ---------------------------------------------------------------------------
-- 视频与作品
TRUNCATE TABLE xm_video_task;
TRUNCATE TABLE xm_user_work;

-- 会话与产物（xm_session_artifact 含 800+ 行本地 URL，必清）
TRUNCATE TABLE xm_classroom_session;
TRUNCATE TABLE xm_session_artifact;
TRUNCATE TABLE xm_companion_turn;

-- 学习行为
TRUNCATE TABLE xm_learning_record;
TRUNCATE TABLE xm_learning_path;
TRUNCATE TABLE xm_learning_favorite;
TRUNCATE TABLE xm_learning_favorite_folder;
TRUNCATE TABLE xm_learning_favorite_folder_assignment;
TRUNCATE TABLE xm_learning_recommendation;
TRUNCATE TABLE xm_learning_wrongbook;

-- 答题与白板
TRUNCATE TABLE xm_quiz_result;
TRUNCATE TABLE xm_whiteboard_action_log;

-- 知识库聊天记录
TRUNCATE TABLE xm_knowledge_chat_log;

-- 注：保留的表（含配置/必需引用）
-- xm_ai_module / xm_ai_module_binding / xm_ai_provider / xm_ai_resource — AI 配置
-- xm_user_profile — 用户资料（avatar_url 上方已清空）
-- xm_landing_lead — 落地页留言（用户决定保留）

-- ---------------------------------------------------------------------------
-- 4) AI Provider edge-tts 复用服务器已有的容器（prorise-internal 网络）
--    api_key 与服务器 edge-tts 容器 ENV 中的 API_KEY=Maicol7896. 严格匹配
-- ---------------------------------------------------------------------------
UPDATE xm_ai_provider
   SET endpoint_url = 'http://edge-tts:5050/v1',
       api_key = 'Maicol7896.',
       update_time = NOW()
 WHERE provider_code = 'edge-tts';

-- ---------------------------------------------------------------------------
-- 5) SnailJob 注册节点清空（让新容器自注册）
-- ---------------------------------------------------------------------------
TRUNCATE TABLE sj_server_node;

-- ---------------------------------------------------------------------------
-- 6) 审计日志清空（dev 期间累积的 127.0.0.1 登录/操作日志，无业务价值）
-- ---------------------------------------------------------------------------
TRUNCATE TABLE sys_logininfor;
TRUNCATE TABLE sys_oper_log;

-- 在线用户缓存（Redis 同步会被新部署清空，DB 这边保险也清一遍）
-- xm_dev 用 Redis 存 ONLINE_TOKEN 不在 DB，跳过

-- ---------------------------------------------------------------------------
-- 7) 验证查询（执行后用以下语句人工 review）
-- ---------------------------------------------------------------------------
-- SELECT config_key, endpoint, status FROM sys_oss_config;
-- SELECT provider_code, endpoint_url FROM xm_ai_provider;
-- SELECT COUNT(*) AS oss_left FROM sys_oss;
-- SELECT COUNT(*) AS vtask_left FROM xm_video_task;

-- ---------------------------------------------------------------------------
-- 8) 学员角色 + 学生端最小权限种子（修复：新注册用户被 ruoyi/fastapi 全局 403）
--    - role_id=5 学员角色（tenant=000000，data_scope=5 仅本人）
--    - menu_id=21300 注册 video:task:add 功能权限（fastapi 创建视频任务硬要求）
--    - sys_role_menu 绑定 role_id=5 → menu_id=21300
--    - sys_user_role 回填：所有现存无角色的 sys_user 自动补 role_id=5
--    全部 INSERT IGNORE，幂等重跑安全
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO sys_role
  (role_id, tenant_id, role_name, role_key, role_sort, data_scope,
   menu_check_strictly, dept_check_strictly, status, del_flag, remark, create_time)
VALUES
  (5, '000000', '学员', 'student', 5, '5',
   1, 1, '0', '0', '学生端默认角色（注册自动绑定）', NOW());

-- 学生端使用的全部 fastapi/ruoyi 受保护接口对应的功能权限种子
-- video:task:* 用于 fastapi /video/task* 转发；classroom:session:* 用于 /classroom/session*
INSERT IGNORE INTO sys_menu
  (menu_id, menu_name, parent_id, order_num, path, component, query_param,
   is_frame, is_cache, menu_type, visible, status, perms, icon, remark, create_time)
VALUES
  (21300, '视频任务创建', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'video:task:add',         '#', '学生端必备：创建视频任务',  NOW()),
  (21301, '视频任务列表', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'video:task:list',        '#', '学生端必备：列表查询',      NOW()),
  (21302, '视频任务查询', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'video:task:query',       '#', '学生端必备：详情查询',      NOW()),
  (21303, '视频任务修改', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'video:task:edit',        '#', '学生端必备：状态修改',      NOW()),
  (21304, '视频任务删除', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'video:task:remove',      '#', '学生端必备：删除任务',      NOW()),
  (21310, '课堂会话列表', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'classroom:session:list', '#', '学生端必备：课堂列表',      NOW()),
  (21311, '课堂会话查询', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'classroom:session:query','#', '学生端必备：课堂详情',      NOW()),
  (21312, '课堂会话新增', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'classroom:session:add',  '#', '学生端必备：创建课堂',      NOW()),
  (21313, '课堂会话修改', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'classroom:session:edit', '#', '学生端必备：修改课堂',      NOW()),
  (21314, '课堂会话删除', 0, 0, '', NULL, NULL, 1, 0, 'F', '1', '0', 'classroom:session:remove','#', '学生端必备：删除课堂',     NOW());

INSERT IGNORE INTO sys_role_menu (role_id, menu_id) VALUES
  (5, 21300), (5, 21301), (5, 21302), (5, 21303), (5, 21304),
  (5, 21310), (5, 21311), (5, 21312), (5, 21313), (5, 21314);

INSERT IGNORE INTO sys_user_role (user_id, role_id)
SELECT u.user_id, 5
  FROM sys_user u
  LEFT JOIN sys_user_role ur ON u.user_id = ur.user_id
 WHERE ur.user_id IS NULL
   AND u.user_type = 'sys_user'
   AND u.del_flag = '0';

-- ---------------------------------------------------------------------------
-- 9) MinIO OSS 公网域名配置（避免浏览器拿到 http://minio:9000/... 而 ERR_NAME_NOT_RESOLVED）
--    前置：1panel openresty 已加 /oss/ → 127.0.0.1:19000 反代（详见 README）
--
--    ⚠ 关键：is_https 必须保持 'N'。
--    RuoYi-Plus OssClient 把 is_https 同时用于 S3 内部 endpoint 协议 + public URL 协议。
--    我们的容器内 MinIO 只监听 HTTP:9000，is_https=Y 会让 S3 客户端去 https://minio:9000
--    握 TLS → 120 秒超时 → 上传失败。
--
--    domain 以 https:// 开头时 getUrl() 会直接用 domain 做 public URL 前缀，不再依赖 is_https。
--    所以正确组合是：endpoint=minio:9000 + is_https=N + domain=https://xm.prorisehub.com/oss
-- ---------------------------------------------------------------------------
UPDATE sys_oss_config
   SET domain = 'https://xm.prorisehub.com/oss',
       is_https = 'N',
       update_time = NOW()
 WHERE config_key IN ('minio','image');

UPDATE sys_oss
   SET url = REPLACE(url, 'http://minio:9000', 'https://xm.prorisehub.com/oss')
 WHERE url LIKE 'http://minio:9000%';

UPDATE xm_user_profile
   SET avatar_url = REPLACE(avatar_url, 'http://minio:9000', 'https://xm.prorisehub.com/oss')
 WHERE avatar_url LIKE 'http://minio:9000%';

UPDATE xm_user_work
   SET cover_url = REPLACE(cover_url, 'http://minio:9000', 'https://xm.prorisehub.com/oss')
 WHERE cover_url LIKE 'http://minio:9000%';

UPDATE sys_social
   SET avatar = REPLACE(avatar, 'http://minio:9000', 'https://xm.prorisehub.com/oss')
 WHERE avatar LIKE 'http://minio:9000%';

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- 修复完成。下一步由 deploy.sh 启动应用层容器。
-- ============================================================================
