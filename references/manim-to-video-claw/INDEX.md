# Directory Index

AI 驱动的 Manim 视频生成流水线，根据问题自动生成讲解视频，集成大语言模型、动画渲染、TTS 语音合成和 SVG 生成。

## Files

- **[LICENSE](./LICENSE)** - 商业软件许可协议
- **[README.md](./README.md)** - 项目英文文档与部署指南
- **[README.zh-CN.md](./README.zh-CN.md)** - 项目中文文档与部署指南

## Subdirectories

### manimtovideo/

执行 Manim 代码、合成语音、合并视频并上传至 OSS 的核心渲染模块。

#### manimtovideo/manimtovideo/

TTS 语音合成引擎集成。

- **[baidutts.py](./manimtovideo/manimtovideo/baidutts.py)** - 百度 TTS 语音合成
- **[bytetts.py](./manimtovideo/manimtovideo/bytetts.py)** - 字节跳动 TTS 语音合成
- **[kokorotts.py](./manimtovideo/manimtovideo/kokorotts.py)** - Kokoro TTS 语音合成
- **[sparktts.py](./manimtovideo/manimtovideo/sparktts.py)** - 讯飞星火 TTS 语音合成

#### manimtovideo/cloudFunction/

云存储与 OSS 上传功能。

- **[cloudFuntion.py](./manimtovideo/cloudFunction/cloudFuntion.py)** - OSS 云存储上传与管理

#### manimtovideo/function_call/

视频生成核心功能。

- **[CreatManimVideo.py](./manimtovideo/function_call/CreatManimVideo.py)** - Manim 视频创建与渲染
- **[CreateLastFrame.py](./manimtovideo/function_call/CreateLastFrame.py)** - 视频末帧图片生成
- **[score_ops.py](./manimtovideo/function_call/score_ops.py)** - 分数运算可视化

#### manimtovideo/icon/

SVG 图标生成功能。

- **[icon_gene.py](./manimtovideo/icon/icon_gene.py)** - SVG 图标自动生成

#### 其他文件

- **[Dockerfile](./manimtovideo/Dockerfile)** - Docker 容器构建配置
- **[handler_fastapi.py](./manimtovideo/handler_fastapi.py)** - FastAPI 服务入口
- **[requirements.txt](./manimtovideo/requirements.txt)** - Python 依赖列表
- **[setup.py](./manimtovideo/setup.py)** - Python 包安装配置

---

### scenext/

根据分镜内容生成 Manim 动画代码的模块。

#### scenext/assistants/

AI 助手与模型定义。

- **[json_fix.py](./scenext/assistants/json_fix.py)** - JSON 格式修复工具
- **[models.py](./scenext/assistants/models.py)** - 数据模型定义
- **[manim_library/](./scenext/assistants/manim_library/)** - Manim 库数据库

#### scenext/auto_fix_code/

Manim 代码自动修复。

- **[ai_fix_code.py](./scenext/auto_fix_code/ai_fix_code.py)** - AI 驱动代码修复
- **[ast_fix_code.py](./scenext/auto_fix_code/ast_fix_code.py)** - AST 语法树修复
- **[render_fix_code.py](./scenext/auto_fix_code/render_fix_code.py)** - 渲染错误修复
- **[stat_check.py](./scenext/auto_fix_code/stat_check.py)** - 静态代码检查

#### scenext/code_render/

代码渲染功能。

- **[render.py](./scenext/code_render/render.py)** - Manim 代码渲染器
- **[templates/](./scenext/code_render/templates/)** - 代码模板目录

#### scenext/function_call/

功能调用接口。

- **[manimtovideo.py](./scenext/function_call/manimtovideo.py)** - manimtovideo 接口调用
- **[score_ops.py](./scenext/function_call/score_ops.py)** - 分数操作接口

#### scenext/Main/

主执行逻辑。

- **[execute.py](./scenext/Main/execute.py)** - 场景执行主流程

#### 其他文件

- **[config.yaml](./scenext/config.yaml)** - 模块配置文件
- **[Dockerfile](./scenext/Dockerfile)** - Docker 容器构建配置
- **[handler_fastapi.py](./scenext/handler_fastapi.py)** - FastAPI 服务入口
- **[requirements.txt](./scenext/requirements.txt)** - Python 依赖列表

---

### scenext-forwarding/

API 网关模块，对外暴露视频生成与状态查询接口。

- **[app.py](./scenext-forwarding/app.py)** - FastAPI 应用入口
- **[config.yaml](./scenext-forwarding/config.yaml)** - 模块配置文件
- **[requirements.txt](./scenext-forwarding/requirements.txt)** - Python 依赖列表

---

### storyboard/

根据问题生成视频分镜内容的模块。

#### storyboard/function/

分镜生成核心功能。

- **[main.py](./storyboard/function/main.py)** - 分镜生成主逻辑
- **[models.py](./storyboard/function/models.py)** - 数据模型定义
- **[json_fix.py](./storyboard/function/json_fix.py)** - JSON 格式修复工具

#### 其他文件

- **[app.py](./storyboard/app.py)** - FastAPI 应用入口
- **[config.yaml](./storyboard/config.yaml)** - 模块配置文件
- **[requirements.txt](./storyboard/requirements.txt)** - Python 依赖列表
