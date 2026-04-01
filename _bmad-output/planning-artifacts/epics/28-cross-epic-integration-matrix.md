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
