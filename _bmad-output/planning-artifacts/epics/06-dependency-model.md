## Dependency Model
### Global Dependency Rules
- `Epic 0` 是所有 Epic 的入口依赖。  
- `Epic 2` 是所有长任务类 Epic 的运行时底座依赖。  
- `Epic 10` 是所有长期业务数据回写类 Epic 的持久化依赖。  
- `Epic 6` 依赖 `Epic 4` 与 `Epic 5` 产出的 `SessionArtifactGraph`。  
- `Epic 8` 依赖 `Epic 5` 的结束信号，以及 `Epic 6` / `Epic 7` 的学习行为沉淀。  
- `Epic 9` 可以在 mock 下先做，但真实数据接入依赖 `Epic 10` 和相关业务 Epic 的长期数据 schema 稳定。  

### Simplified Dependency Graph
```text
Epic 0  ->  Epic 1
Epic 0  ->  Epic 2
Epic 0  ->  Epic 10

Epic 1  ->  Epic 3
Epic 1  ->  Epic 5

Epic 2  ->  Epic 3
Epic 2  ->  Epic 4
Epic 2  ->  Epic 5
Epic 2  ->  Epic 6
Epic 2  ->  Epic 7
Epic 2  ->  Epic 8

Epic 10 ->  Epic 4
Epic 10 ->  Epic 5
Epic 10 ->  Epic 6
Epic 10 ->  Epic 7
Epic 10 ->  Epic 8
Epic 10 ->  Epic 9

Epic 3  ->  Epic 4
Epic 4  ->  Epic 6
Epic 5  ->  Epic 6
Epic 5  ->  Epic 8
Epic 6  ->  Epic 7
Epic 6  ->  Epic 8
Epic 7  ->  Epic 8
```

