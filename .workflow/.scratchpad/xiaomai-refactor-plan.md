# ruoyi-xiaomai 模块重构方案

> 生成时间: 2026-04-09
> 分支策略: 从 master 拉出 `refactor/xiaomai-module-structure`
> 参考: ruoyi-system 模块标准写法

---

## 一、量化现状

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| 手动 set() | 91 处 | 0（全部用 MapstructUtils） |
| @AutoMapper | 18 个 Vo/Bo（声明了但没用） | 全部通过 MapstructUtils.convert() 消费 |
| @Translation | 3 处（仅 XmUserProfileVo） | 所有需要翻译的字段覆盖 |
| @Log | 33 处 / 11 个 Controller | 所有写操作覆盖 |
| @RepeatSubmit | 24 处 / 12 个 Controller | 所有 CUD 操作覆盖 |
| 包结构 | 存在游离 domain/controller/service 包 | 按业务域收拢 |

---

## 二、重灾区排名

### ServiceImpl 手动 set() 分布

| 文件 | set() 数量 | 重构难度 |
|------|-----------|---------|
| `XmModuleBoundaryServiceImpl` | 35 | 高（嵌套结构复杂） |
| `XmAiProviderServiceImpl` | 22 | 中（已有 @AutoMapper 声明） |
| `LearningCenterServiceImpl` | 11 | 中 |
| `AuditCenterServiceImpl` | 10 | 中 |
| `XmUserProfileServiceImpl` | 6 | 低 |
| `XmPersistenceSyncService` | ~80+（非 ServiceImpl，独立 Service） | **极高** |
| 其他 6 个 ServiceImpl | 各 1 处 | 低 |

---

## 三、分批次执行计划

### Wave 1: P0 — 消灭手动 set()（核心改造）

#### 1.1 通用改动：Vo/Bo 补齐 @AutoMapper

以下文件**已声明** `@AutoMapper`，只需在 ServiceImpl 中改用 `MapstructUtils.convert()`：
- XmAiProviderVo/Bo ✅
- XmAiModuleVo/Bo ✅
- XmAiModuleBindingVo/Bo ✅
- XmAiResourceVo/Bo ✅
- ClassroomSessionVo/Bo ✅
- XmLandingLeadVo/Bo ✅
- VideoTaskVo/Bo ✅
- XmUserWorkVo/Bo ✅
- XmUserProfileVo/Bo ✅

以下文件**需要新增** `@AutoMapper` 声明：
- `AuditRecordVo` → 需确定 target 实体
- `AuditRecordBo` → 需确定 target 实体
- `LearningResultVo` → 需确定 target 实体
- `LearningCenterRecordVo` → 需确定 target 实体
- `XmModuleBoundaryVo` → 需确定 target 实体
- `XmModuleResourceVo` → 需确定 target 实体
- `XmAiRuntimeConfigVo` → 复合 Vo，需拆分或用 `@AutoMapping`
- `XmPersistenceSyncVo` → 复合 Vo，内部嵌套类需单独处理

#### 1.2 逐文件改造清单

**文件: `XmAiProviderServiceImpl.java`**（22 处 set）
- 删除 `buildEntityFromBo()` 方法
- 替换为 `MapstructUtils.convert(bo, XmAiProvider.class)`
- 确认 Bo 已有 `@AutoMapper(target = XmAiProvider.class)`

**文件: `XmModuleBoundaryServiceImpl.java`**（35 处 set）
- 为 `XmModuleBoundaryVo` 添加 `@AutoMapper`
- 为 `XmModuleResourceVo` 添加 `@AutoMapper`
- 将所有手动 set 替换为 `MapstructUtils.convert()`
- 嵌套结构（resourceList 等）用 `MapstructUtils.convert(list, Vo.class)` 处理

**文件: `XmUserProfileServiceImpl.java`**（6 处 set）
- 已有 `@AutoMapper`，直接替换为 `MapstructUtils.convert()`

**文件: `LearningCenterServiceImpl.java`**（11 处 set）
- 删除 `copyQuery()` 方法，改用 `BeanUtil.copyProperties()` 或 `MapstructUtils.convert()`
- 简化分页查询逻辑

**文件: `AuditCenterServiceImpl.java`**（10 处 set）
- 删除 `copyQuery()` 方法
- 为 `AuditRecordBo`/`AuditRecordVo` 补 `@AutoMapper`

**文件: `XmPersistenceSyncService.java`**（~80+ 处 set，**最复杂**）
- 拆分策略：
  - 为 `XmCompanionTurn` 实体创建对应的 Vo/Bo（目前没有）
  - 为 `XmWhiteboardActionLog` 创建对应的 Vo/Bo
  - 内嵌的 `XmPersistenceSyncVo.CompanionTurnSyncVo` 等静态内部类 → 拆为独立 Vo 类
  - 所有 `to*Vo()` 方法用 MapStruct 替代
  - 所有 `persist*()` 方法中的 Bo→Entity 转换用 `MapstructUtils.convert()` 替代
  - 提取 `writeJson()`/`readStringList()`/`readObjectMap()` 到工具类

**文件: 其余 6 个 ServiceImpl**（各 1 处 set）
- 直接替换即可，工作量小

---

### Wave 2: P1 — 注解补全

#### 2.1 补 @Translation（当前仅 3 处）

需要翻译的字段清单：
- `XmAiProviderVo.vendorCode` → 字典翻译 `xm_ai_vendor_code`
- `XmAiProviderVo.status` → 字典翻译
- `XmAiProviderVo.authType` → 字典翻译
- `VideoTaskVo.taskState` → 字典翻译
- `ClassroomSessionVo.status` → 字典翻译
- `XmLandingLeadVo.processingStatus` → 字典翻译
- `XmUserWorkVo.workType` → 字典翻译
- `AuditRecordVo` 中各类状态字段 → 字典翻译
- `LearningResultVo.resultType` → 字典翻译
- 创建翻译常量类 `XmTransConstant`，注册自定义翻译类型

#### 2.2 补 @Log

缺少操作日志的 Controller 方法：
- `XmPersistenceSyncController` — 全部方法补 `@Log`
- `XmAiRuntimeConfigController` — 全部方法补 `@Log`
- `XmModuleBoundaryController` — 全部方法补 `@Log`
- `AuditCenterController` — 导出方法补 `@Log(businessType = BusinessType.EXPORT)`

#### 2.3 补 @RepeatSubmit

缺少防重提交的写操作：
- `XmPersistenceSyncController` — sync 相关 POST 方法
- `XmAiRuntimeConfigController` — 配置修改方法
- `XmModuleBoundaryController` — 模块操作方法

#### 2.4 补 @RateLimiter

公开接口需加限流：
- `XmLandingLeadPublicController.submitLead()` → `@RateLimiter(key = "landing_lead", time = 60, count = 10)`

---

### Wave 3: P2 — Controller 规范化 + Record 替换

#### 3.1 替换 Java Record 为标准 Bo/Vo

| 当前 Record | 改造为 |
|-------------|--------|
| `XmLandingLeadPublicController.PublicLandingLeadSubmitRequest` | `XmLandingLeadPublicSubmitBo` |
| `XmLandingLeadPublicController.CreateLandingLeadResponse` | `XmLandingLeadPublicRespVo` |
| `XmUserProfileAppController.ProfileCompletedVo` | `XmProfileCompletedVo` |

#### 3.2 Controller 返回值统一

- `XmPersistenceSyncController`: 消除 `R.fail(HttpStatus.NOT_FOUND, ...)` 混用，统一用 `R.ok()/R.fail()`
- 所有 Controller 继承 `BaseController`

#### 3.3 命名统一

- `AuditCenterController` → `XmAuditCenterController`
- 所有 Controller 统一 `Xm` 前缀

---

### Wave 4: P3 — 包结构收拢 + XML 清理

#### 4.1 游离包收拢

| 当前位置 | 迁移到 |
|---------|--------|
| `controller/admin/XmModuleBoundaryController.java` | `module/controller/XmModuleBoundaryController.java`（新建 module 业务包） |
| `domain/bo/XmModuleResourceBo.java` | `module/domain/bo/XmModuleResourceBo.java` |
| `domain/vo/XmModuleBoundaryVo.java` | `module/domain/vo/XmModuleBoundaryVo.java` |
| `domain/vo/XmModuleResourceVo.java` | `module/domain/vo/XmModuleResourceVo.java` |
| `service/IXmModuleBoundaryService.java` | `module/service/IXmModuleBoundaryService.java` |
| `service/impl/XmModuleBoundaryServiceImpl.java` | `module/service/impl/XmModuleBoundaryServiceImpl.java` |

#### 4.2 删除冗余

- 删除 `learning/domain/dto/` 空目录
- 删除 `XmUserWorkMapper.xml` 空壳
- 删除 `mapper/xiaomai/README.md`、`mapper/xiaomai/learning/README.md`

#### 4.3 XML 去重

- `AuditCenterMapper.xml` — 提取 `<sql>` 公共片段，减少 UNION ALL 重复
- `LearningCenterMapper.xml` — 同上
- `LearningResultMapper.xml` — 消除硬编码字典值，改用参数化或字典表

#### 4.4 硬编码清理

- `XmPersistenceSyncService` 中 `"000000"` → `TenantConstants.GLOBAL_TENANT_ID`
- `XmLandingLeadPublicController` 中默认值常量 → 移至配置或字典
- `LearningCenterServiceImpl` 中 `new PageQuery(10, 1)` → 用默认常量

---

## 四、文件改动汇总

### 新建文件（~8 个）
1. `XmTransConstant.java` — xiaomai 模块翻译常量
2. `XmCompanionTurnVo.java` — 伴侣对话 Vo
3. `XmCompanionTurnBo.java` — 伴侣对话 Bo（可选）
4. `XmWhiteboardActionLogVo.java` — 白板日志 Vo
5. `XmLandingLeadPublicSubmitBo.java` — 替代 Record
6. `XmLandingLeadPublicRespVo.java` — 替代 Record
7. `XmProfileCompletedVo.java` — 替代 Record
8. `module/` 业务包目录结构

### 修改文件（~35 个）

#### ServiceImpl（12 个，核心改动）
| 文件 | 改动类型 |
|------|---------|
| `XmAiProviderServiceImpl` | 删除 buildEntityFromBo，改 MapstructUtils |
| `XmModuleBoundaryServiceImpl` | 全面替换 set() |
| `XmUserProfileServiceImpl` | 替换 set() |
| `LearningCenterServiceImpl` | 删除 copyQuery，替换 set() |
| `AuditCenterServiceImpl` | 删除 copyQuery，替换 set() |
| `XmPersistenceSyncService` | 大规模重构（拆 Vo、工具类提取） |
| `XmAiRuntimeConfigService` | 替换手动 Vo 构建 |
| `XmAiResourceServiceImpl` | 替换 set() |
| `XmUserWorkServiceImpl` | 替换 set() |
| `VideoTaskServiceImpl` | 替换 set() |
| `XmAiModuleBindingServiceImpl` | 替换 set() |
| `ClassroomSessionServiceImpl` | 替换 set() |
| `XmAiModuleServiceImpl` | 替换 set() |
| `XmLandingLeadServiceImpl` | 替换 set() |

#### Vo/Bo（~10 个，补注解）
- 各 Vo 补 `@Translation`
- `AuditRecordVo`、`LearningCenterRecordVo`、`LearningResultVo` 补 `@AutoMapper`
- `XmModuleBoundaryVo`、`XmModuleResourceVo` 补 `@AutoMapper`

#### Controller（~12 个，补注解 + 规范化）
- 补 `@Log`、`@RepeatSubmit`、`@SaCheckPermission`
- 替换 Record 内部类
- 统一返回值

#### Mapper XML（~3 个，去重）
- AuditCenterMapper.xml、LearningCenterMapper.xml、LearningResultMapper.xml

#### 删除文件（~3 个）
- `XmUserWorkMapper.xml`（空壳）
- `mapper/xiaomai/README.md`
- `mapper/xiaomai/learning/README.md`

---

## 五、执行顺序与依赖

```
Wave 1 (P0): 消灭手动 set()
  ├── Step 1: Vo/Bo 补齐 @AutoMapper 声明（无依赖，可先行）
  ├── Step 2: 简单 ServiceImpl 改造（6 个各 1 处的，5 分钟一个）
  ├── Step 3: 中等 ServiceImpl 改造（Provider、Profile、Learning、Audit）
  └── Step 4: 重度重构（PersistenceSyncService — 最复杂，放最后）

Wave 2 (P1): 注解补全（依赖 Wave 1 完成，避免冲突）
  ├── Step 5: 创建 XmTransConstant + 注册翻译类型
  ├── Step 6: Vo 补 @Translation
  ├── Step 7: Controller 补 @Log、@RepeatSubmit、@RateLimiter
  └── Step 8: 命名统一（Controller 加 Xm 前缀）

Wave 3 (P2): Controller 规范化
  ├── Step 9: Record 替换为标准 Bo/Vo
  └── Step 10: 返回值统一

Wave 4 (P3): 包结构 + XML 清理
  ├── Step 11: 游离包收拢到 module/ 业务包
  ├── Step 12: XML 公共片段提取
  └── Step 13: 硬编码清理 + 空文件删除
```

---

## 六、风险与注意事项

1. **XmPersistenceSyncService 是最大风险点**：它被 FastAPI 后端直接调用，改动需确保接口契约不变
2. **MapStruct 编译**：添加 `@AutoMapper` 后需要 `mvn compile` 验证生成的转换代码
3. **翻译类型注册**：新增 `@TranslationType` 需要在 Spring 容器中注册
4. **包移动后**：需要全量搜索 import 路径，确保没有遗漏引用
5. **每个 Wave 完成后应单独编译验证**：`mvn compile -pl ruoyi-modules/ruoyi-xiaomai`

---

## 七、验收标准

- [ ] `grep -r '\.set\w\+(' service/impl/` 结果为 0（除必要的特殊字段赋值）
- [ ] 所有 Vo/Bo 都有 `@AutoMapper` 声明
- [ ] 所有写操作 Controller 都有 `@Log` + `@RepeatSubmit`
- [ ] 所有字典/状态字段有 `@Translation`
- [ ] 无游离的 domain/controller/service 包
- [ ] `mvn compile` 通过
- [ ] 现有 API 接口契约不变（URL、参数、返回值结构）
