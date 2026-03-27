# 10.5 Provider 规范

## 10.5.1 命名规范
[Rule] LLM 与 TTS Provider 标识符统一采用 `{vendor}-{model_or_voice}` 格式。

| Provider 类型 | 标识符格式 | 示例 |
|--------------|-----------|------|
| LLM | `{vendor}-{model}` | `gemini-2_5-pro`, `claude-3_7-sonnet` |
| TTS | `{vendor}-{voice}` | `doubao-standard`, `baidu-general` |

## 10.5.2 主备与健康检查
[Rule] Provider 需支持优先级、健康检查、Failover、超时、重试、缓存等统一策略。  
[Rule] Provider 健康状态可缓存在 Redis 中，Key 形如 `xm_provider_health:{provider}`，TTL 60s。
