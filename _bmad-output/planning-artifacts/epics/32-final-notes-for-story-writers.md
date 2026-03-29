## Final Notes for Story Writers
后续如果你们要继续往下写到更细的 story 卡片、Jira tickets 或 BMAD story files，建议强制附加以下字段：

### Required Fields Per Story
- Story ID
- Story Type
- Depends On
- Blocks
- Contract Asset Path
- Mock Asset Path
- API / Event / Schema Impact
- Persistence Impact
- Frontend States Covered
- Error States Covered
- Acceptance Test Notes

### Suggested Ticket Template
```text
Story ID:
Title:
Type:
Epic:
Depends On:
Blocks:
Goal:
In Scope:
Out of Scope:
Contract Assets:
Mock Assets:
Persistence Impact:
Acceptance Criteria:
Test Notes:
Open Questions:
```

### Strong Warning
以下三种写法禁止再出现：
1. “等后端接口好了前端再做”
2. “这个先放 Redis，后面再落库”
3. “这个先不定义 schema，到时候按返回改
```markdown
4. “这个先做 happy path，错误态后面补”
5. “这个先把页面画出来，联调时再改结构”
6. “这个先直接调厂商 SDK，后面再抽象 Provider”

---

