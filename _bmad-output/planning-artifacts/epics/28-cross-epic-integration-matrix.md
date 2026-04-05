## Cross-Epic Integration Matrix
### Matrix A: Runtime to Persistence
| 来源 Epic | 产出 | 消费 Epic | 集成边界 |
|---|---|---|---|
| Epic 4 | 视频任务元数据、video artifact、公开视频卡片元数据 | Epic 3 / Epic 6 / Epic 9 / Epic 10 | task result + public card schema + SessionArtifactGraph |
| Epic 5 | 课堂任务元数据、classroom artifact、completion signal | Epic 6 / Epic 8 / Epic 9 / Epic 10 | result schema + learning signal |
| Epic 6 | companion turn、whiteboard log | Epic 9 / Epic 10 | turn history schema |
| Epic 7 | evidence chat、citation record、web search citation context | Epic 5 / Epic 9 / Epic 10 | evidence record schema + citation scope |
| Epic 8 | checkpoint / quiz / wrongbook / path | Epic 9 / Epic 10 | learning result schema |

### Matrix B: UI Consumption
| 页面域 | 主要依赖 Epic | 次要依赖 Epic |
|---|---|---|
| `/` | Epic 1 | Epic 0 |
| `/landing` | Epic 1 | |
| `/login` | Epic 1 | Epic 0 |
| `/video/input` | Epic 1 / Epic 3 | Epic 2 / 4 |
| `/video/:id/generating` | Epic 2 / Epic 4 | Epic 3 |
| `/video/:id` | Epic 4 | Epic 6 / 7 / 8 |
| `/classroom/input` | Epic 1 / Epic 5 | Epic 2 / 7 |
| `/classroom/:id/generating` | Epic 2 / Epic 5 | |
| `/classroom/:id` | Epic 5 | Epic 6 / 7 / 8 |
| 来源抽屉 | Epic 7 | Epic 6 / 9 |
| Learning Coach 页面 | Epic 8 | Epic 5 / 6 / 7 |
| `/learning` | Epic 9 | Epic 10 |
| `/history` | Epic 9 | Epic 10 |
| `/favorites` | Epic 9 | Epic 10 |
| `/profile` | Epic 9 | Epic 1 / Epic 10 |
| `/settings` | Epic 9 | Epic 0 |

### Matrix C: Contract Freeze Order
1. Epic 0 契约资产规范  
2. Epic 1 认证契约  
3. Epic 2 任务 / SSE / Provider 契约  
4. Epic 10 长期数据边界与表清单  
5. Epic 3 视频创建契约  
6. Epic 4 视频 stage 与结果契约  
7. Epic 5 课堂 result 与 completion signal 契约  
8. Epic 6 Companion 契约  
9. Epic 7 Evidence 契约  
10. Epic 8 Learning Coach 契约  
11. Epic 9 聚合页与分页契约  

---

### Matrix D: Cross-Epic Parallel Guardrails
| 并行组合 | 是否建议 | 允许前提 | 必须避开的冲突点 |
|---|---|---|---|
| Epic 3 + Epic 5 | 推荐 | Epic 1 真正收口，Epic 2 已稳定 | 不要同时重写首页入口、顶栏分发和共享输入壳层 |
| Epic 4 + Epic 8 | 不推荐整块并行 | 至少先冻结视频 / 课堂结果页的后续动作入口 | 不要同时改结果页 CTA、结果页回跳和会话后入口 |
| Epic 6 + Epic 7 | 有条件并行 | 先冻结结果页挂载位、侧栏入口和抽屉入口 | 不要同时改同一个结果页容器、同一套问答历史区 |
| Epic 9 + Epic 6 / 7 / 8 | 不推荐真实联调并行 | 仅允许先做假数据页面壳层 | 不要在上游字段未稳时直接接真实聚合接口 |

### Matrix E: 当前进度对齐提醒
1. `sprint-status.yaml` 当前仍显示 `Epic 1` 为 `in-progress`，因此“Epic 1 已完成后再并行”目前只是计划前提，不是现状。
2. `Epic 10` 虽已标记完成，但后台生成器接管路径直到本轮才补上菜单、字典和生成器元数据；后续仍要以生成代码真正落库和导入为最终闭环。
3. 当前文档原本更偏重“单个 Epic 内部并行”，缺少“跨 Epic 谁拥有哪块页面 / 容器”的硬边界；多 Agent 并行时必须以本矩阵为准。
