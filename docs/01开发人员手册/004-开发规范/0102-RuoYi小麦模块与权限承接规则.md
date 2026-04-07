# 0102 RuoYi 小麦模块与权限承接规则

## 目标

`Story 10.2` 只冻结小麦业务在 `RuoYi` 中的承接方式，不提前实现真实业务 CRUD。

- 通过 `ruoyi-modules/ruoyi-xiaomai` 新增业务模块承接长期数据后台能力。
- 通过 `模块:资源:操作` 规则冻结菜单和按钮权限。
- 通过最小契约接口输出模块边界、资源规划和后续扩展点。

## 模块边界

- `RuoYi` 核心认证、`Sa-Token`、RBAC 主干不做业务侵入式修改。
- FastAPI 只消费 RuoYi 权限结果，通过防腐层交互，不复制权限真值。
- 当前阶段仅承接长期业务数据、后台查询、导出和审计扩展，不扩展成新的独立 ToB 产品域。
- `ruoyi-admin` 只新增模块依赖和 `SpringDoc` 分组，不引入新的登录、角色或菜单框架。

## 模块结构

- Maven 聚合：`packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/pom.xml`
- 模块 artifact：`ruoyi-xiaomai`
- Java 包根：`org.dromara.xiaomai`
- `SpringDoc` 分组：`6.小麦模块`
- 目录扩展点：
  - `org.dromara.xiaomai.controller.admin`
  - `org.dromara.xiaomai.service`
  - `org.dromara.xiaomai.domain.bo`
  - `org.dromara.xiaomai.domain.vo`
  - `org.dromara.xiaomai.mapper`
  - `src/main/resources/mapper/xiaomai`

## 资源与权限冻结

| 资源 | 业务表 | 权限前缀 | 接入模式 | 生成策略 | 默认动作 |
|------|--------|----------|----------|----------|----------|
| 视频任务 | `xm_video_task` | `video:task` | `CRUD_READY` | `GENERATOR_CRUD` | `list/query/add/edit/remove/export` |
| 课堂会话 | `xm_classroom_session` | `classroom:session` | `CRUD_READY` | `GENERATOR_CRUD` | `list/query/add/edit/remove/export` |
| 学习记录 | `xm_learning_record` | `learning:record` | `QUERY_ONLY` | `HANDWRITTEN_QUERY` | `list/query/export` |
| 学习收藏 | `xm_learning_favorite` | `learning:favorite` | `QUERY_WITH_REMOVE` | `HANDWRITTEN_QUERY` | `list/query/remove/export` |
| Companion 问答 | `xm_companion_turn` | `companion:turn` | `QUERY_ONLY` | `HANDWRITTEN_QUERY` | `list/query/export` |
| Evidence 问答 | `xm_knowledge_chat_log` | `evidence:chat` | `QUERY_ONLY` | `HANDWRITTEN_QUERY` | `list/query/export` |
| Learning Coach 结果 | `xm_quiz_result`、`xm_learning_path` | `learning:coach` | `QUERY_ONLY` | `HANDWRITTEN_QUERY` | `list/query/export` |
| 审计中心 | `sys_oper_log`、`xm_*` | `xiaomai:audit` | `AUDIT_ONLY` | `HANDWRITTEN_QUERY` | `list/query/export` |

## CRUD / 查询扩展策略

- 标准单表：视频任务、课堂会话优先通过 `RuoYi Generator` 生成 `Controller/Service/Mapper/Bo/Vo`。
- AI 运行配置域按 `xm_ai_module / xm_ai_provider / xm_ai_resource / xm_ai_module_binding` 多表拆分承接，只保留软关联，不建立物理外键；该域默认仅管理员可维护。
- 聚合查询：学习记录、收藏、问答日志、Learning Coach 结果、审计中心统一走手写查询。
- 导出与审计：统一要求 `@SaCheckPermission` + `@Log(..., BusinessType.EXPORT)`。
- 查询类能力默认后台可见；学习收藏允许后台清理；学习记录和问答日志默认不开放后台新增或编辑。

## SQL 脚本

- `20260328_xm_module_bootstrap.sql`
  - 冻结根菜单 `小麦业务`
  - 冻结模块规划菜单与 `xiaomai:module:*` 权限
- `20260328_xm_menu_permission.sql`
  - 冻结各业务资源菜单、按钮权限和管理员角色授权
  - 保持权限命名与后续 `10.4` 到 `10.8` 的业务资源一致

## 最小契约接口

- `GET /xiaomai/module/resources`
  - 返回分页 `TableDataInfo`
  - 仅用于查看当前模块资源规划
- `GET /xiaomai/module/overview`
  - 返回模块边界总览
- `POST /xiaomai/module/export`
  - 导出资源规划 Excel
  - 强制记录操作日志

这些接口只服务于后台模块规划和后续联调，不代表真实业务 CRUD 已经实现。
