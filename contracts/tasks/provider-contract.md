# Provider Contract

## 目标

- 统一 LLM / TTS Provider 的协议、注册与装配方式。
- 业务层只依赖 `LLMProvider`、`TTSProvider` 与 `ProviderFactory`。
- 主备排序、超时、重试、健康状态来源通过配置驱动，不在业务流程中硬编码。

## 标识符约定

- Provider 标识符必须使用 `{vendor}-{model_or_voice}` 格式。
- 当前内置示例：
  - `stub-llm`
  - `stub-tts`
  - `demo-chat`
  - `demo-voice`

## 运行时配置结构

```json
{
  "provider": "demo-chat",
  "priority": 1,
  "timeout_seconds": 15,
  "retry_attempts": 2,
  "health_source": "redis:xm_provider_health:demo-chat",
  "settings": {
    "region": "ap-shanghai"
  }
}
```

字段说明：

- `provider` / `provider_id`：Provider 标识符。
- `priority`：数值越小优先级越高。
- `timeout_seconds`：请求超时时间。
- `retry_attempts`：调用重试次数。
- `health_source`：健康状态来源描述。本 Story 只冻结字段，不实现 2.8 的健康检查与 failover 行为。
- `settings`：Provider 自身扩展配置。

## 配置驱动装配

- `ProviderFactory.assemble_from_settings()` 默认读取：
  - `FASTAPI_DEFAULT_LLM_PROVIDER`
  - `FASTAPI_DEFAULT_TTS_PROVIDER`
- 如存在以下环境变量，会覆盖默认单 Provider 装配：
  - `FASTAPI_LLM_PROVIDER_CHAIN`
  - `FASTAPI_TTS_PROVIDER_CHAIN`

支持两种链配置形式：

1. 逗号分隔：

```text
demo-chat,stub-llm
```

2. JSON 数组：

```json
[
  {
    "provider": "demo-chat",
    "priority": 1,
    "timeout_seconds": 10,
    "retry_attempts": 1,
    "health_source": "redis:xm_provider_health:demo-chat"
  },
  {
    "provider": "stub-llm",
    "priority": 10,
    "timeout_seconds": 20,
    "retry_attempts": 0,
    "health_source": "static:fallback"
  }
]
```

## 错误边界

- 未注册 Provider：抛出 `ProviderNotFoundError`。
- 配置缺失或标识符非法：抛出 `ProviderConfigurationError`。
- 实现类未满足协议：抛出 `ProviderProtocolError`。

## 业务侧接入规则

- 业务代码通过 `ProviderFactory`、`get_llm_provider()`、`get_tts_provider()` 获取能力实例。
- 业务代码不得直接依赖具体 Provider 实现类。
- 新 Provider 接入只需：
  1. 实现对应 Protocol。
  2. 调用 `ProviderRegistry.register(...)` 注册。
  3. 通过配置或工厂选择该 Provider。
