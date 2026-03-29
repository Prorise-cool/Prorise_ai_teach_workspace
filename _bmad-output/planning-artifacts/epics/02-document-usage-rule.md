## Document Usage Rule
- 本文档是 **Epic / Story 规划文档**，不是实现代码文档。  
- 本文档中的 Story 默认采用“前端 Story / 后端 Story / 持久化 Story / 集成 Story”拆法。  
- 任一 Story 如果涉及跨后端、跨运行态与长期态、跨业务域 schema，必须优先拆出“契约 Story”。  
- 任一 Story 如果依赖另一个 Story 的接口或 schema，但其页面仍可基于 mock 推进，则必须明确写出 adapter 边界，而不能用“等待后端完成”作为前置阻塞。  
- 任一 Story 的 AC 必须能直接用于：手工验收、接口测试、页面状态检查或联调检查。  
- 任一 Story 不得同时承载“底座能力 + 单业务链 + 持久化 + 管理端 + 体验端”的五层内容。  
- 本文档默认按实施优先级阅读：`Epic 0 -> Epic 1 -> Epic 2 -> Epic 10 -> 业务 Epic`。  

