# Story 1.7 RuoYi 代码生成器字段填写说明

> **状态**：可直接使用  
> **适用范围**：`xm_landing_lead`  
> **最后更新**：2026-04-05  
> **事实源**：`_bmad-output/implementation-artifacts/1-7-营销落地页与-home-首页分流.md`  
> **补充避坑**：`docs/01开发人员手册/004-开发规范/0103-RuoYi-开发联调常见坑与防呆清单.md`

---

## 文档用途

这份文档只做一件事：

帮你在 RuoYi 后台「系统工具 -> 代码生成 -> 编辑表字段」时，直接把 `xm_landing_lead` 这张表填对，不再靠猜。

这次最关键的约束是：

1. `processing_status` 必须是**字符型字典值**，不是数字型。
2. `id` 必须继续走 **Snowflake / ASSIGN_ID**，不是 `AUTO_INCREMENT`。
3. 上级菜单必须挂到 **小麦业务**，不是 `学生管理`。

---

## 先说结论

| 项目 | 正确填写 | 错误填写 | 说明 |
|------|----------|----------|------|
| 生成模板 | `单表` ✅ | 主子表 / 树表 ❌ | 这是标准单表 CRUD |
| 生成包路径 | `org.dromara.xiaomai.landing` ✅ | `org.dromara.xiaomai.user.profile` ❌ | 这是新的落地页线索业务域 |
| 生成模块名 | `xiaomai` ✅ | `ruoyi-xiaomai` ❌ | 这里填的是模块标识，不是 Maven 模块名 |
| 生成业务名 | `landingLead` ✅ | `landing-lead` / `landing/lead` ❌ | 现有小麦业务统一使用 camelCase |
| 生成功能名 | `落地页线索` ✅ | `xm_landing_lead` ❌ | 菜单和注释标题应该是中文业务名 |
| 上级菜单 | `小麦业务` ✅ | `学生管理` / `系统工具` ❌ | 当前 Story 1.7 属于小麦业务后台 |
| `processing_status` | `String + 单选框 + xm_landing_lead_status` ✅ | `Long + 文本框 + 无字典` ❌ | 状态值是 `pending/contacted/closed` |
| `source_locale` | `String + 下拉框 + sys_language` ✅ | `文本框 + 无字典` ❌ | 语言值要和现有系统语言字典对齐 |
| `id` | `bigint(20)` 非自增 ✅ | `AUTO_INCREMENT` ❌ | 全局主键策略已经是 `ASSIGN_ID` |

---

## 先执行 SQL，再进生成器

如果你已经导入过 `xm_landing_lead`，先执行下面这段 SQL。

它会做两件事：

1. 覆盖 / 修正表结构，把 `processing_status` 固定为**字符型**。
2. 新增并重建字典 `xm_landing_lead_status`。

执行完后，再去代码生成器里点：

1. `同步字段` ✅
2. `编辑` ✅
3. 按本文下面的表格逐项填写 ✅

```sql
-- Story 1.7: 落地页线索表字段修正 + 状态字典
-- 用途：
-- 1. 若 xm_landing_lead 尚未创建，则先建表
-- 2. 若你已经导入过旧表，则覆盖为当前 Story 1.7 基线
-- 3. processing_status 明确使用字符型字典值：pending / contacted / closed

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
```

---

## 基本信息怎么填

| 配置项 | 填写值 | 是否这样填 | 说明 |
|--------|--------|------------|------|
| 生成模板 | `单表` | ✅ | 这就是标准单表 CRUD |
| 生成包路径 | `org.dromara.xiaomai.landing` | ✅ | 和当前小麦模块包路径保持一致 |
| 生成模块名 | `xiaomai` | ✅ | 生成后接口前缀会带 `/xiaomai/` |
| 生成业务名 | `landingLead` | ✅ | 现有小麦业务真值都是 camelCase |
| 生成功能名 | `落地页线索` | ✅ | 后台菜单名称和注释标题 |
| 上级菜单 | `小麦业务` | ✅ | 对应根菜单 `menu_id = 21000` |
| 生成方式 | `zip 压缩包` | ✅ | 方便你把产物打包给我 |
| 自定义路径 | 保持默认 `/` | ✅ | 当前不需要写死项目路径 |
| `landing-lead` | 不要填 | ❌ | 这会让权限和接口命名风格跑偏 |
| `学生管理` | 不要选 | ❌ | Story 1.7 不是学生中心后台菜单 |

---

## 字段配置总表

说明：

- `✅` 表示勾选
- `❌` 表示不勾选
- 生成器没有“隐藏”显示类型，所以**系统字段靠 `插入 / 编辑 / 列表 / 查询` 是否勾选来控制**

| 字段名 | Java 类型 | Java 属性 | 插入 | 编辑 | 列表 | 查询 | 查询方式 | 必填 | 显示类型 | 字典类型 | 说明 |
|--------|-----------|-----------|------|------|------|------|----------|------|-----------|----------|------|
| `id` | `Long` | `id` | ❌ | ✅ | ❌ | ❌ | `=` | ❌ | 文本框 | - | 主键需要保留在更新模型里，但不要出现在列表 / 查询里 |
| `tenant_id` | `String` | `tenantId` | ❌ | ❌ | ❌ | ❌ | `=` | ❌ | 文本框 | - | 系统字段，由框架处理 |
| `contact_name` | `String` | `contactName` | ✅ | ✅ | ✅ | ✅ | `LIKE` | ✅ | 文本框 | - | 对应前端 `firstName` |
| `organization_name` | `String` | `organizationName` | ✅ | ✅ | ✅ | ✅ | `LIKE` | ❌ | 文本框 | - | 对应前端 `lastName` |
| `contact_email` | `String` | `contactEmail` | ✅ | ✅ | ✅ | ✅ | `LIKE` | ✅ | 文本框 | - | 邮箱检索用模糊查询更稳 |
| `subject` | `String` | `subject` | ✅ | ✅ | ✅ | ✅ | `LIKE` | ✅ | 文本框 | - | 当前落地页就是单主题输入 |
| `message` | `String` | `message` | ✅ | ✅ | ❌ | ❌ | `=` | ✅ | 文本域 | - | 长文本，不建议放列表 |
| `source_page` | `String` | `sourcePage` | ❌ | ❌ | ✅ | ✅ | `=` | ❌ | 文本框 | - | 前端会固定提交 `/landing` |
| `source_locale` | `String` | `sourceLocale` | ❌ | ❌ | ✅ | ✅ | `=` | ❌ | 下拉框 | `sys_language` | 和系统语言字典对齐 |
| `processing_status` | `String` | `processingStatus` | ✅ | ✅ | ✅ | ✅ | `=` | ✅ | 单选框 | `xm_landing_lead_status` | 必须保持字符型，不要改成数字 |
| `remark` | `String` | `remark` | ✅ | ✅ | ❌ | ❌ | `=` | ❌ | 文本域 | - | 后台备注，只放编辑抽屉即可 |
| `create_dept` | `Long` | `createDept` | ❌ | ❌ | ❌ | ❌ | `=` | ❌ | 文本框 | - | 系统字段 |
| `create_by` | `Long` | `createBy` | ❌ | ❌ | ❌ | ❌ | `=` | ❌ | 文本框 | - | 系统字段 |
| `create_time` | `Date` | `createTime` | ❌ | ❌ | ✅ | ✅ | `BETWEEN` | ❌ | 日期时间 | - | 这是 Story 1.7 最关键的后台筛选字段 |
| `update_by` | `Long` | `updateBy` | ❌ | ❌ | ❌ | ❌ | `=` | ❌ | 文本框 | - | 系统字段 |
| `update_time` | `Date` | `updateTime` | ❌ | ❌ | ✅ | ❌ | `BETWEEN` | ❌ | 日期时间 | - | 可展示，但不是本 Story 的核心筛选字段 |
| `del_flag` | `String` | `delFlag` | ❌ | ❌ | ❌ | ❌ | `=` | ❌ | 文本框 | - | 逻辑删除字段，不要暴露给 CRUD 表单 |

---

## 你截图里最容易填错的地方

| 项目 | 应该改成 | 不要这样填 | 原因 |
|------|----------|------------|------|
| `id -> 列表` | `❌` | `✅` | 这个字段没必要在后台表格里占列 |
| `id -> 必填` | `❌` | `✅` | 否则新增时会被主键校验卡住 |
| `source_page -> 插入 / 编辑` | `❌ / ❌` | `✅ / ✅` | 这是来源元数据，不是人工录入字段 |
| `source_locale -> 显示类型` | `下拉框` ✅ | `文本框` ❌ | 要复用 `sys_language` |
| `processing_status -> Java 类型` | `String` ✅ | `Long / Integer` ❌ | 这套状态字典值是字符型 |
| `processing_status -> 显示类型` | `单选框` ✅ | `文本框` ❌ | 状态字段必须走字典单选 |
| `processing_status -> 字典类型` | `xm_landing_lead_status` ✅ | 留空 ❌ | 不配字典，后面列表和搜索都会返工 |
| `message -> 显示类型` | `文本域` ✅ | `文本框` ❌ | 留言内容是长文本 |

---

## 生成后你要给我什么

你生成完以后，按下面这份清单把产物给我就够了：

| 产物 | 要不要给我 | 说明 |
|------|------------|------|
| 后端 Java 代码 | ✅ | Controller / Service / Mapper / domain / bo / vo |
| Soybean 前端代码 | ✅ | `views`、`service/api`、`typings` |
| 菜单 SQL | ✅ | 生成器导出的菜单和权限 SQL |
| 你执行过的表结构 SQL | ✅ | 就是本文上面的修正脚本或你最终落库版本 |
| 截图 | ✅ | 如果生成器页面有你不确定的勾选项，直接截图给我 |

---

## 最短操作顺序

1. 先执行上面的 SQL，覆盖表结构和状态字典。✅
2. 进 RuoYi 后台，找到 `xm_landing_lead`，点 `同步字段`。✅
3. 按本文“基本信息怎么填”和“字段配置总表”逐项改。✅
4. 生成代码，导出 `backend / frontend / sql` 三类产物。✅
5. 把生成产物发给我，我来负责后续 `mv` 进仓库和 student-web 联调。✅

