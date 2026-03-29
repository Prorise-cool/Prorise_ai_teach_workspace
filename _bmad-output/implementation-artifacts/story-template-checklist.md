# Story Template Checklist

## Required Metadata

- Story ID:
- Title:
- Story Type:
- Epic:
- Depends On:
- Blocks:
- Contract Asset Path:
- Mock Asset Path:
- API / Event / Schema Impact:
- Persistence Impact:
- Frontend States Covered:
- Error States Covered:
- Acceptance Test Notes:

## Ready Checklist

- [ ] 需求描述清晰
- [ ] 优先级明确
- [ ] 验收标准明确
- [ ] 依赖已识别
- [ ] 技术边界已确认
- [ ] 可拆分为执行任务
- [ ] Story 类型对应的 DoR 已满足

## Done Checklist

- [ ] 交付物已落地
- [ ] 全部 AC 满足
- [ ] 测试 / 验证通过
- [ ] 文档已同步
- [ ] 状态闭环完成
- [ ] 不违反架构边界
- [ ] 不存在 Blocker

## Parallel Gates

- [ ] G1 契约冻结
- [ ] G2 mock 可运行
- [ ] G3 测试通过
- [ ] G4 联调前门禁
- [ ] G5 合并前门禁
- [ ] G6 发布前门禁

## Explicit Anti-Patterns

- [ ] 不存在“等后端好了前端再做”
- [ ] 不存在“先把页面画出来联调时再改结构”
- [ ] 不存在“先不定义 schema，到时候按返回改”
- [ ] 不存在“先做 happy path，错误态后面补”
- [ ] 不存在“先放 Redis，后面再落库”
- [ ] 不存在“先直接调厂商 SDK，后面再抽象 Provider”
