# ManimCat 移植分析与架构决策记录

**文档日期**: 2026-04-14  
**参与者**: Prorise (产品/技术负责人) + AI 助手  
**状态**: 讨论中，尚未最终决策  
**参考项目**: `references/ManimCat-main/`

---

## 1. 背景与动机

### 1.1 当前问题

现有 FastAPI 视频管道存在严重的性能和质量问题：

- **速度**: 同样的 LLM 模型，我们需要 **20 分钟**，ManimCat 只需 **1 分钟**
- **质量**: code2video 的 section 场景渲染"知识含量很低，讲解的内容基本对读者没有任何帮助"
- **稳定性**: 77 次 LLM 调用中任意一次超时/429 都可能导致整个任务失败
- **公式质量**: 改动后"数学公式还没原来的好"

> **用户原话**: "我们的流程跑一遍下来同样的模型，我们居然要20分钟，他只需要一分钟，就证明我们现在的流程是溃败不堪的"

### 1.2 为什么选择 ManimCat

ManimCat (GitHub: Wing900/ManimCat) 是一个开源的 AI 辅助数学动画生成系统，在渲染速度和数学公式质量上明显优于我们当前实现。用户实际体验后确认其核心价值。

---

## 2. ManimCat 技术调研（5 Agent 并行调研）

### 2.1 技术栈

| 维度 | ManimCat | 我们的 FastAPI |
|------|----------|---------------|
| 语言 | TypeScript (Node 22) | Python 3.11 |
| Web 框架 | Express 4.18 | FastAPI |
| 任务队列 | Bull 4.16 (Redis) | Dramatiq (Redis) |
| LLM | OpenAI SDK 4.50 | httpx + Provider 三表体系 |
| 持久化 | Redis 缓存 (可选 Supabase) | RuoYi MySQL |
| 前端 | React 19 + Vite | 独立 (student-web / soybean) |
| 部署 | Docker 单容器 | 微服务 (FastAPI + RuoYi + Redis) |

**关键发现: ManimCat 是 TypeScript/Node.js 项目，没有任何 .py 文件。** 所有编排逻辑在 Express 进程内，仅通过 `child_process.spawn()` 调用 py_compile/mypy/manim 三个 Python 命令。

### 2.2 ManimCat 项目规模

| 模块 | 文件数 | 代码行数 | 说明 |
|------|--------|---------|------|
| Workflow 管道 | ~50 | ~5,500 | 核心视频生成（两阶段 AI + 静态检查 + 修复） |
| Studio Agent | 128 | ~12,271 | 交互式 AI 创作工作台（Builder/Designer/Reviewer） |
| Plot Studio | ~10 | ~500 | matplotlib 静态图生成 |
| 前端 UI | ~90 | ~8,000 | React 工作区 |
| 基础设施 | ~30 | ~2,500 | 配置/中间件/工具 |
| **总计** | **~308** | **~28,771** | |

### 2.3 ManimCat 核心管道流程

```
用户输入概念
    ↓
第1次 LLM: Scene Designer（场景设计，温度 0.8，思考 20000 tokens）
    ↓
第2次 LLM: Code Generator（代码生成，温度 0.7，API 编码本嵌入）
    ↓
Static Guard: py_compile 语法检查 + mypy 类型检查（本地，不调 LLM）
    ↓
Manim 渲染（直接执行，含内存监控）
    ↓
若失败 → 4 轮 LLM 补丁修复（提取 stderr → AI 写补丁，非重新生成）
    ↓
FFmpeg 后处理
    ↓
输出视频/图片

总 LLM 调用: 2 次（成功时）~ 6 次（4 轮修复时）
```

### 2.4 ManimCat 核心代码地图（管道部分）

```
src/
├── services/
│   ├── concept-designer/
│   │   ├── scene-design-stage.ts      182行  ⭐ 阶段1：场景设计
│   │   └── code-from-design-stage.ts  137行  ⭐ 阶段2：代码生成
│   ├── static-guard/
│   │   ├── manager.ts                 413行  ⭐ 检查循环管理
│   │   └── checker.ts                 354行  ⭐ py_compile + mypy
│   ├── code-retry/
│   │   ├── manager.ts                 183行  ⭐ 4轮修复循环
│   │   ├── code-generation.ts         102行  LLM 补丁生成
│   │   └── prompt-builder.ts           84行  修复 prompt
│   └── openai-client.ts               161行  LLM 通信
├── prompts/
│   ├── api-index.ts                   475行  ⭐ 300+ Manim API 编码本
│   └── loader.ts                      332行  Prompt 加载器
├── queues/processors/
│   ├── video-processor-flows-static.ts 233行  三模式编排
│   └── video.processor.ts             222行  Bull 队列处理
└── utils/
    ├── manim-executor.ts              154行  ⭐ Manim 执行器
    ├── manim-executor-runtime.ts      187行  运行时管理
    ├── process-memory.ts              209行  内存监控
    └── manim-code-cleaner/rules.ts    242行  代码清洗规则
```

---

## 3. 速度差距根因分析（核心发现）

### 3.1 LLM 调用次数对比

| 系统 | LLM 调用次数 | 耗时 |
|------|------------|------|
| ManimCat | **2 次** | ~1 分钟 |
| 我们 (5 sections) | **~77 次** | ~20 分钟 |

### 3.2 我们 77 次调用的精确分解

```
  1 次  Outline 生成
+ 1 次  Storyboard 生成
+ 5 次  Asset 增强（每 section 1 次）
+ 5 次  代码生成（每 section 1 次）
+50 次  代码修复（每 section 最多 10 次 LLM 重试）  ← 65% 最大瓶颈
+10 次  MLLM 视觉反馈（每 section 2 轮）            ← 26%
+10 次  反馈优化代码（每 section 2 轮）
─────
≈77 次
```

### 3.3 扩展性灾难

| Section 数 | 当前架构 LLM 次数 | 当前架构耗时 | ManimCat LLM 次数 | ManimCat 耗时 |
|-----------|------------------|------------|-------------------|-------------|
| 5 | 77 | 20 min | 2 | 1 min |
| 10 | ~150 | 40 min | 2 | 1 min |
| 20 | ~300 | 80 min | 2-6 | 3-5 min |

**当前架构是 O(N×M)，ManimCat 是 O(1)。** 根本不在一个量级。

### 3.4 隐藏问题

- `gpt_request.py` 每次 LLM 调用都新建 httpx 客户端，无连接池复用
- 77 次调用 × ~150ms TCP/TLS 开销 = 额外 11.5 秒浪费

### 3.5 速度差距 Top 3 根因

1. **代码修复的 LLM 循环** (50 次/65%) — 每 section 最多 10 次 LLM 重试
2. **MLLM 反馈循环** (20 次/26%) — 每 section 2 轮视觉审查 + 优化
3. **Section 循环本身** (10 次/13%) — 逐 section 调用而非全量生成

---

## 4. 当前 FastAPI 视频模块现状

### 4.1 代码规模

- **48 个 Python 文件，9,188 行**
- 核心文件：agent.py(1408行) + orchestrator.py(1254行) + scope_refine.py(801行)
- 10 阶段流水线，~15 个 API 端点

### 4.2 删除影响分析

| 类别 | 数量 |
|------|------|
| 待删 Python 文件 | 48 个 |
| 待删代码行数 | 9,188 行 |
| 必改外部文件 | 4 个 (router.py, worker.py, main.py, config.py) |
| 待删 env 变量 | 9 个 |
| 待删测试文件 | 16 个 |
| 待删 Settings 字段 | 9 个 |

详细清单见：`.workflow/.scratchpad/video-module-audit-report.md`

---

## 5. 产品定位讨论

### 5.1 ManimCat vs 小麦的定位差异

| 维度 | ManimCat | 小麦 |
|------|----------|------|
| 目标用户 | 开发者/教师（交互式创作） | 学生（开箱即用） |
| 核心交互 | Studio 工作台（对话式迭代） | 一键生成（输入题目→出视频） |
| 输出类型 | 无声数学动画/静态图 | 带讲解的教学视频 |
| TTS | 无 | 必须有 |
| 分镜编排 | 无（单场景） | 多段落讲解结构 |

> **用户判断**: "他最重要的是那个express服务...他这个更偏向于数学公式直观生成，而我们更偏向于教师视频讲解"

### 5.2 Studio/Agent 模块的评估

> **用户判断**: "我去实际体验了一下，我们重点还是要的就是manim的视频生成功能加上讲解，这些东西适合做在教师端里，学生要的是功能，开箱即用的功能，这个更偏向于教师或者开发者"

**结论**: Studio Agent (12,271行) 暂不移植。后期如做教师端再考虑。

### 5.3 最终移植范围

**要移植的（核心管道 ~4,050 行 TS → Python）**：

| 模块 | 行数 | 价值 |
|------|------|------|
| 两阶段 AI (scene-design + code-gen) | 423 | 质量核心 |
| Manim API 编码本 (api-index.ts) | 475 | 代码质量核心 |
| Prompt 加载器 (loader.ts) | 332 | prompt 管理 |
| 静态检查 (static-guard/) | 767 | 渲染前拦截 |
| 4 轮代码修复 (code-retry/) | 536 | 成功率提升 |
| Manim 执行器 + 内存监控 | 550 | 执行管理 |
| 代码清洗 (code-cleaner/) | 283 | 防御性 |
| 流程编排 (processor-flows) | 455 | 三模式架构 |
| OpenAI 客户端 | 229 | 连接管理 |

**不移植的**：

| 模块 | 行数 | 原因 |
|------|------|------|
| Studio Agent | 12,271 | 教师端功能，学生不需要 |
| Plot Studio | 500 | 后期可加 |
| BGM 混音 | 141 | 用户明确不需要 |
| 前端 UI | 8,000 | 前端暂不管 |
| 图片渲染模式 | 350 | 先做视频 |

**保留我们自己的**：

| 模块 | 说明 |
|------|------|
| TTS 管道 | ManimCat 没有，必须保留 |
| SSE 进度 + 补发 | 用户体验核心 |
| RuoYi 认证 + 持久化 | 多用户必须 |
| Provider 三表体系 | 替代 ManimCat 的 OpenAI 直连 |
| Docker 沙箱 | 替代 ManimCat 的同容器执行（更安全） |

---

## 6. 架构方向讨论

### 6.1 Section 架构的根本问题

当前的 Section 架构假设每个 Section 需要独立调用 LLM，导致 O(N×M) 的调用复杂度。ManimCat 证明了 O(1) 的可能性。

核心矛盾：
- **学生需要分段讲解**（多 Section 带 TTS）
- **但 LLM 调用不应该随 Section 数线性增长**

### 6.2 三种解决思路

#### 思路 A：全局生成，后期分段（推荐探索方向）

```
第1次LLM: "设计 N 个 section 的完整教学方案" → 完整故事板
第2次LLM: "生成覆盖所有 section 的完整 Manim 代码" → 一个大脚本
静态检查: py_compile + mypy（本地，不调 LLM）
4轮修复: 只在渲染失败时才调 LLM（通常 0-1 次）
渲染: 一次渲染出完整视频
TTS: N 个 section 的讲稿并行生成

总调用: 2-3 次 LLM + N 次 TTS（并行）
总耗时: ~2-3 分钟（不管几个 section）
```

#### 思路 B：分批生成（超长视频折中）

```
第1次LLM: 完整设计方案
第2-4次LLM: 分批生成代码（每批 6-7 个 section，带前文累积）
静态检查 + 修复: 每批 1 次
渲染: 分批渲染 → FFmpeg 合并
TTS: 并行全部

总调用: 4-6 次 LLM（固定，不随 section 数线性增长）
总耗时: ~3-5 分钟（20 个 section 的 1 小时视频）
```

#### 思路 C：保留 Section 循环但砍 LLM（治标不治本）

```
保留逐 section 生成，但：
- 砍掉 LLM 代码修复（改用静态检查）
- 砍掉 MLLM 反馈循环
- 每 section 只调 2 次 LLM

总调用: 2 + 2N 次
N=20 时: 42 次 → ~12 分钟（改善但仍然慢）
```

### 6.3 TTS-Manim 同步问题

ManimCat 没有 TTS，这是我们必须自己解决的问题：

| 方案 | 做法 | 优缺点 |
|------|------|--------|
| 先 TTS 后 Manim | TTS 生成音频 → 获取时长 → 注入代码生成 prompt 中控制 self.wait() | 音画同步最好 |
| 先 Manim 后对齐 | Manim 自由生成 → 拿到时长 → TTS 调速对齐 | 更简单，节奏可能不匹配 |

---

## 7. 风险评估

### 7.1 高风险

| 风险 | 说明 | 缓解 |
|------|------|------|
| Prompt 适配 Section | ManimCat prompt 给单场景，我们要多段落 | 在 prompt 中加 section 上下文 |
| TTS-Manim 时长同步 | ManimCat 不考虑音频时长 | 先 TTS → 注入时长到 prompt |
| TS→Python 翻译准确性 | 4,050 行翻译可能有遗漏 | 逐模块翻译 + 单测 |

### 7.2 中风险

| 风险 | 说明 | 缓解 |
|------|------|------|
| Provider 体系适配 | 替代 ManimCat 的 OpenAI 直连 | 写 adapter 层 |
| Dramatiq 替代 Bull | API 不同 | 仅替换调度层 |
| Section 间视觉连续性 | 多段视频需要一致风格 | prompt 约束 |

### 7.3 低风险

| 风险 | 说明 |
|------|------|
| Docker 沙箱 + mypy | Dockerfile 加一行 pip install mypy |
| 代码清洗 | 简单字符串处理 |
| 内存监控 | psutil 替代 Node process.memoryUsage() |

---

## 8. 调研产物清单

| 产物 | 位置 | 说明 |
|------|------|------|
| 本文档 | `docs/01开发人员手册/006-模块开发指南/manimcat-migration-analysis.md` | 决策记录 |
| FastAPI 视频模块审查 | `.workflow/.scratchpad/video-module-audit-report.md` | 48 文件删除清单 |
| ManimCat 管道调研 | `MANIMCAT_RESEARCH_REPORT.md` | 完整管道流程分析 |
| 集成策略分析 | `memory/manimcat-integration-strategy.md` | 方案对比 |
| AI 系统架构 | `memory/manimcat-ai-system-architecture.md` | Agent/LLM/Studio |

---

## 9. 待决事项

- [ ] 最终确认移植方案（全局生成 vs 分批生成 vs Section 优化）
- [ ] 确认 Section 架构重设计方向
- [ ] 确认 TTS-Manim 同步策略
- [ ] 确认是否替换 Dramatiq
- [ ] 确认新分支名称和开发计划
- [ ] 数据库表重新设计（用户会删除现有表）

---

*本文档记录讨论过程和决策依据，随讨论推进持续更新。*
