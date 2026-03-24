# Directory Index

RuoYi-Plus-Soybean 是一个基于 Vue 3、TypeScript、Vite 和 Naive UI 构建的现代化企业级多租户管理系统前端项目。

## Files

### Configuration Files

- **[.drone.yml](./.drone.yml)** - Drone CI/CD 持续集成配置文件
- **[.editorconfig](./.editorconfig)** - 编辑器代码风格统一配置
- **[.env.dev](./.env.dev)** - 开发环境变量配置（后端地址、加密密钥等）
- **[.env.prod](./.env.prod)** - 生产环境变量配置
- **[.env.test](./.env.test)** - 测试环境变量配置
- **[.gitattributes](./.gitattributes)** - Git 属性配置（换行符等）
- **[.gitignore](./.gitignore)** - Git 忽略文件配置
- **[.npmrc](./.npmrc)** - NPM/pnpm 注册表配置
- **[eslint.config.js](./eslint.config.js)** - ESLint 代码规范配置
- **[tsconfig.json](./tsconfig.json)** - TypeScript 编译器配置
- **[uno.config.ts](./uno.config.ts)** - UnoCSS 原子化 CSS 配置
- **[vite.config.ts](./vite.config.ts)** - Vite 构建工具配置
- **[pnpm-workspace.yaml](./pnpm-workspace.yaml)** - pnpm Monorepo 工作区配置

### Documentation & Meta

- **[CHANGELOG.md](./CHANGELOG.md)** - 项目版本更新日志
- **[LICENSE](./LICENSE)** - MIT 开源许可证
- **[README.md](./README.md)** - 项目说明文档（安装、技术栈、开发指南）
- **[index.html](./index.html)** - 应用入口 HTML 文件
- **[package.json](./package.json)** - 项目依赖和脚本配置
- **[pnpm-lock.yaml](./pnpm-lock.yaml)** - pnpm 依赖锁定文件

---

## Subdirectories

### docs/

代码生成工具和 SQL 脚本文档。

- **[README.md](./docs/README.md)** - 文档目录说明
- **[VelocityUtils.java](./docs/java/VelocityUtils.java)** - Velocity 模板工具类（后端代码生成）
- **[index.vue.vm](./docs/template/index.vue.vm)** - Vue 页面代码生成模板
- **[index-tree.vue.vm](./docs/template/index-tree.vue.vm)** - 树形结构 Vue 页面模板
- **[sys_dict_data.sql](./docs/sql/sys_dict_data.sql)** - 字典数据 SQL 初始化脚本
- **[sys_menu.sql](./docs/sql/sys_menu.sql)** - 菜单数据 SQL 初始化脚本

### packages/

Monorepo 内部包，包含可复用的模块和工具。

#### packages/alova/

- **@sa/alova** - 基于 Alova 的 HTTP 客户端实现，支持请求/响应拦截和 Mock

#### packages/axios/

- **@sa/axios** - 基于 Axios 的 HTTP 客户端实现，封装请求和响应处理

#### packages/color/

- **@sa/color** - 颜色管理工具，处理主题色和颜色转换

#### packages/hooks/

- **@sa/hooks** - 可复用的 Vue Composition API 组合函数（useBoolean、useLoading 等）

#### packages/materials/

- **@sa/materials** - UI 组件和素材库，包含基础布局组件

#### packages/scripts/

- **@sa/scripts** - 构建和开发脚本（路由生成、Git 提交、版本发布等）

#### packages/uno-preset/

- **@sa/uno-preset** - UnoCSS 预设配置，定义项目样式规范

#### packages/utils/

- **@sa/utils** - 通用工具函数（加密、存储、ID 生成等）

### public/

静态资源文件。

- **[favicon.svg](./public/favicon.svg)** - 网站图标

### src/

主应用源代码目录。

#### Root Files

- **[App.vue](./src/App.vue)** - Vue 根组件
- **[main.ts](./src/main.ts)** - 应用入口文件，初始化 Vue 应用

#### src/assets/

静态资源（图片、SVG 图标）。

- **[imgs/](./src/assets/imgs/)** - 图片资源目录
- **[svg-icon/](./src/assets/svg-icon/)** - SVG 图标资源目录

#### src/components/

可复用的 Vue 组件库。

- **[_builtin/](./src/components/_builtin/)** - 内置基础组件
- **[about/](./src/components/about/)** - 关于页面相关组件
- **[common/](./src/components/common/)** - 通用业务组件
- **[custom/](./src/components/custom/)** - 自定义扩展组件

#### src/constants/

应用常量定义。

- **[business.ts](./src/constants/business.ts)** - 业务相关常量
- **[index.ts](./src/constants/index.ts)** - 常量导出入口

#### src/enum/

TypeScript 枚举类型定义。

#### src/hooks/

Vue 组合函数（Composition API）。

#### src/layouts/

页面布局组件。

- **[base-layout/](./src/layouts/base-layout/)** - 基础布局组件
- **[blank-layout/](./src/layouts/blank-layout/)** - 空白布局组件
- **[modules/](./src/layouts/modules/)** - 布局模块组件

#### src/locales/

国际化（i18n）配置。

- **[dayjs.ts](./src/locales/dayjs.ts)** - Dayjs 日期国际化
- **[index.ts](./src/locales/index.ts)** - i18n 导出入口
- **[locale.ts](./src/locales/locale.ts)** - 语言设置
- **[naive.ts](./src/locales/naive.ts)** - Naive UI 组件国际化
- **[langs/](./src/locales/langs/)** - 语言包目录

#### src/plugins/

Vue 插件配置。

- **[app.ts](./src/plugins/app.ts)** - 应用插件配置
- **[assets.ts](./src/plugins/assets.ts)** - 资源插件配置
- **[dayjs.ts](./src/plugins/dayjs.ts)** - Dayjs 插件配置
- **[iconify.ts](./src/plugins/iconify.ts)** - Iconify 图标插件配置
- **[index.ts](./src/plugins/index.ts)** - 插件导出入口
- **[loading.ts](./src/plugins/loading.ts)** - 加载动画插件
- **[nprogress.ts](./src/plugins/nprogress.ts)** - 进度条插件配置

#### src/router/

Vue Router 路由配置。

- **[index.ts](./src/router/index.ts)** - 路由导出入口
- **[elegant/](./src/router/elegant/)** - Elegant Router 路由定义
- **[guard/](./src/router/guard/)** - 路由守卫
- **[routes/](./src/router/routes/)** - 路由配置模块

#### src/service/

API 服务层。

- **[api/](./src/service/api/)** - API 接口定义
- **[request/](./src/service/request/)** - 请求封装和拦截器

#### src/store/

Pinia 状态管理。

- **[index.ts](./src/store/index.ts)** - Store 导出入口
- **[modules/](./src/store/modules/)** - 状态模块（app、theme、route、tab、auth、dict 等）

#### src/styles/

全局样式文件。

- **[css/](./src/styles/css/)** - CSS 样式文件
- **[scss/](./src/styles/scss/)** - SCSS 样式文件

#### src/theme/

主题配置。

- **[preset/](./src/theme/preset/)** - 主题预设配置
- **[settings.ts](./src/theme/settings.ts)** - 主题设置
- **[vars.ts](./src/theme/vars.ts)** - 主题 CSS 变量定义

#### src/typings/

TypeScript 类型定义。

- **[app.d.ts](./src/typings/app.d.ts)** - 应用类型定义
- **[common.d.ts](./src/typings/common.d.ts)** - 通用类型定义
- **[components.d.ts](./src/typings/components.d.ts)** - 组件类型定义
- **[elegant-router.d.ts](./src/typings/elegant-router.d.ts)** - 路由类型定义
- **[global.d.ts](./src/typings/global.d.ts)** - 全局类型定义
- **[naive-ui.d.ts](./src/typings/naive-ui.d.ts)** - Naive UI 类型定义
- **[router.d.ts](./src/typings/router.d.ts)** - 路由类型定义
- **[storage.d.ts](./src/typings/storage.d.ts)** - 存储类型定义
- **[union-key.d.ts](./src/typings/union-key.d.ts)** - 联合键类型定义
- **[vite-env.d.ts](./src/typings/vite-env.d.ts)** - Vite 环境类型定义

#### src/utils/

工具函数库。

- **[agent.ts](./src/utils/agent.ts)** - 用户代理检测
- **[common.ts](./src/utils/common.ts)** - 通用工具函数
- **[copy.ts](./src/utils/copy.ts)** - 剪贴板复制工具
- **[crypto.ts](./src/utils/crypto.ts)** - 加密解密工具
- **[icon-tag-format.ts](./src/utils/icon-tag-format.ts)** - 图标标签格式化
- **[icon.ts](./src/utils/icon.ts)** - 图标处理工具
- **[jsencrypt.ts](./src/utils/jsencrypt.ts)** - RSA 加密工具
- **[service.ts](./src/utils/service.ts)** - 服务相关工具
- **[sse.ts](./src/utils/sse.ts)** - Server-Sent Events 工具
- **[storage.ts](./src/utils/storage.ts)** - 本地存储工具
- **[websocket.ts](./src/utils/websocket.ts)** - WebSocket 连接工具

#### src/views/

页面视图组件。

- **[_builtin/](./src/views/_builtin/)** - 内置页面（登录、404 等）
- **[about/](./src/views/about/)** - 关于页面
- **[advanced/](./src/views/advanced/)** - 高级功能页面
- **[common/](./src/views/common/)** - 通用页面
- **[custom/](./src/views/custom/)** - 自定义页面
- **[demo/](./src/views/demo/)** - 示例演示页面
- **[home/](./src/views/home/)** - 首页
- **[monitor/](./src/views/monitor/)** - 系统监控页面
- **[system/](./src/views/system/)** - 系统管理页面
- **[tool/](./src/views/tool/)** - 工具页面
