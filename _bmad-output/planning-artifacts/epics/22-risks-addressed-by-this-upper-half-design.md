## Risks Addressed by This Upper-Half Design
### R-01: 视频 Epic 吞掉底座导致全局卡死
通过 `Epic 2` 拆出底座，避免视频域成为所有业务域的隐藏依赖中心。  

### R-02: 课堂与视频看似并行，实则等待同一底座
通过显式依赖 `Epic 2`，让真正并行建立在统一底座完成之后，而不是建立在“先做页面壳再赌联调”之上。  

### R-03: 前端所谓 mock 只是静态假图
通过 `Epic 0` 与各契约 Story，要求 mock 必须具备状态流、错误态、权限态与恢复态。  

### R-04: Companion 后续无法接上下文
通过 `Story 4.9` 与 `Story 5.8`，提前把 `SessionArtifactGraph` 作为正式交付物，而不是后期补洞。  

### R-05: Learning Coach 与学习中心后期被迫重构
通过课堂结束信号和 artifact 回写，先把后续消费接口边界钉住。  

---

```markdown
