# Directory Index: references

> 外部参考与照抄来源目录。此目录以只读参考为主，实际业务开发仍在 `packages/` 中完成。

## Files

- **[INDEX.md](./INDEX.md)** - 参考项目总索引与复用边界说明
- **[README.md](./README.md)** - 参考目录说明与使用约束

## External API Docs

### 腾讯云智能体开发平台

位于开发手册中的产品与 API 参考文档。

- **[产品简介](../docs/01开发人员手册/000-腾讯云产品文档/0001腾讯云智能体平台-产品简介.md)** - 平台能力、产品优势与应用模式
- **[页面功能服务](../docs/01开发人员手册/000-腾讯云产品文档/0003腾讯云智能体平台-页面功能服务（给用户）.md)** - 标准模式、工作流模式与 Multi-Agent 模式说明
- **[API 文档网络索引](../docs/01开发人员手册/000-腾讯云产品文档/004腾讯云智能体平台-API 文档网络索引.md)** - 全量 API 能力导航
- **[应用接口文档](../docs/01开发人员手册/000-腾讯云产品文档/005腾讯云智能体平台-应用接口文档.md)** - 应用评测、运营与原子能力说明

## Subdirectories

### OpenMAIC/

开源多智能体互动课堂平台，基于 Next.js、React 19 与 LangGraph。

- **[README-zh.md](./OpenMAIC/README-zh.md)** - OpenMAIC 中文项目说明
- **[README.md](./OpenMAIC/README.md)** - OpenMAIC 英文原始文档
- **[app/](./OpenMAIC/app/)** - App Router 页面与 API 路由入口
- **[components/](./OpenMAIC/components/)** - 课堂、对话与协作 UI 组件
- **[lib/](./OpenMAIC/lib/)** - 编排、生成、音视频与服务端逻辑
- **[packages/](./OpenMAIC/packages/)** - OpenMAIC 子包与共享模块

### manim-to-video-claw/

AI 驱动的 Manim 视频生成流水线，覆盖分镜、代码生成、修复、渲染与合成。

- **[INDEX.md](./manim-to-video-claw/INDEX.md)** - 视频生成流水线目录索引
- **[README.zh-CN.md](./manim-to-video-claw/README.zh-CN.md)** - 中文部署与使用说明
- **[storyboard/](./manim-to-video-claw/storyboard/)** - 分镜生成服务
- **[scenext/](./manim-to-video-claw/scenext/)** - Manim 代码生成与自动修复
- **[manimtovideo/](./manim-to-video-claw/manimtovideo/)** - 渲染、TTS 与视频合成
- **[scenext-forwarding/](./manim-to-video-claw/scenext-forwarding/)** - 对外 FastAPI 网关

## Related Workspaces

- **[../packages/RuoYi-Vue-Plus-5.X/INDEX.md](../packages/RuoYi-Vue-Plus-5.X/INDEX.md)** - Java 管理后台与认证基座
- **[../packages/ruoyi-plus-soybean-master/INDEX.md](../packages/ruoyi-plus-soybean-master/INDEX.md)** - Vue 管理端前端基座

## Reuse Rules

- OpenMAIC 使用 AGPL-3.0，默认只借鉴架构与实现思路，不直接复制代码。
- `manim-to-video-claw` 为商业自有项目，可按内部许可边界复用。
- 任何借鉴或照抄动作，都应在 `docs/01开发人员手册/` 中记录来源与许可证约束。
