# Directory Index

## Files

- **[.editorconfig](./.editorconfig)** - Editor configuration file
- **[.gitignore](./.gitignore)** - Git ignore patterns
- **[LICENSE](./LICENSE)** - MIT License file
- **[pom.xml](./pom.xml)** - Maven project configuration

- **[README.md](./README.md)** - Project documentation

## Subdirectories

### ruoyi-admin/

- **[pom.xml](./ruoyi-admin/pom.xml)** - Admin module Maven configuration
- **[src/](./ruoyi-admin/src/) - Source code directory

  - **[main/](./ruoyi-admin/src/main/java/org/dromara/RuoYiApplication.java) - Application entry point
  - **[resources/](./ruoyi-admin/src/main/resources) - Application resources

### ruoyi-common/

#### ruoyi-common-bom/

- **[pom.xml](./ruoyi-common/pom.xml)** - Common modules BOM configuration

#### ruoyi-common-core/

- **[pom.xml](./ruoyi-common-core/pom.xml)** - Core module Maven configuration

- **[src/](./ruoyi-common-core/src/) - Source code directory

  - **[main/](./ruoyi-common-core/src/main/java/org/dromara/common/config/RuoYiConfig.java) - Application configuration
  - **[constant/](./ruoyi-common-core/src/main/java/org/dromara/common/constant) - Global constants
  - **[domain/](./ruoyi-common-core/src/main/java/org/dromara/common/domain) - Domain entities
  - **[enums/](./ruoyi-common-core/src/main/java/org/dromara/common/enums) - Enumerations
  - **[exception/](./ruoyi-common-core/src/main/java/org/dromara/common/exception) - Exception classes
  - **[utils/](./ruoyi-common-core/src/main/java/org/dromara/common/utils) - Utility classes
  - **[utils/file](./ruoyi-common-core/src/main/java/org/dromara/common/utils/file) - File utilities
  - **[utils/jackson](./ruoyi-common-core/src/main/java/org/dromara/common/utils/jackson) - JSON serialization utilities
  - **[utils/log/](./ruoyi-common-core/src/main/java/org/dromara/common/utils/log) - Logging utilities
  - **[utils/mapstruct](./ruoyi-common-core/src/main/java/org/dromara/common/utils/mapstruct) - MapStruct converters
  - **[utils/redis](./ruoyi-common-core/src/main/java/org/dromara/common/utils/redis) - Redis utilities
  - **[utils/spring](./ruoyi-common-core/src/main/java/org/dromara/common/utils/spring) - Spring utilities

#### ruoyi-common-doc/

- **[pom.xml](./ruoyi-common-doc/pom.xml)** - API documentation module configuration
- **[src/](./ruoyi-common-doc/src/) - Source code directory
  - **[main/](./ruoyi-common-doc/src/main/java/org/dromara/common/doc) - Documentation support

#### ruoyi-common-encrypt/

- **[pom.xml](./ruoyi-common-encrypt/pom.xml)** - Encryption module Maven configuration
- **[src/](./ruoyi-common-encrypt/src/) - Source code directory
  - **[main/](./ruoyi-common-encrypt/src/main/java/org/dromara/common/encrypt/config) - Encryption configuration
  - **[core/](./ruoyi-common-encrypt/src/main/java/org/dromara/common/encrypt/core) - Encryption core utilities
  - **[encrypt/](./ruoyi-common-encrypt/src/main/java/org/dromara/common/encrypt/encrypt) - Encryption interfaces
  - **[enforcer/](./ruoyi-common-encrypt/src/main/java/org/dromara/common/encrypt/enforce) - Encryption annotation

#### ruoyi-common-excel/

- **[pom.xml](./ruoyi-common-excel/pom.xml)** - Excel export module configuration
- **[src/](./ruoyi-common-excel/src/) - Source code directory
  - **[main/](./ruoyi-common-excel/src/main/java/org/dromara/common/excel/config) - Excel configuration
  - **[annotation/](./ruoyi-common-excel/src/main/java/org/dromara/common/excel/annotation) - Excel annotations
  - **[convert/](./ruoyi-common-excel/src/main/java/org/dromara/common/excel/convert) - Excel converters
  - **[core/](./ruoyi-common-excel/src/main/java/org/dromara/common/excel/core) - Excel core utilities
  - **[dict/](./ruoyi-common-excel/src/main/java/org/dromara/common/excel/dict) - Excel dictionary data

#### ruoyi-common-idempotent/

- **[pom.xml](./ruoyi-common-idempotent/pom.xml)** - Idempotent module Maven configuration
- **[src/](./ruoyi-common-idempotent/src/) - Source code directory
  - **[main/](./ruoyi-common-idempotent/src/main/java/org/dromara/common/idempotent/config) - Idempotent configuration
  - **[annotation/](./ruoyi-common-idempotent/src/main/java/org/dromara/common/idempotent/annotation) - Idempotent annotations
  - **[core/](./ruoyi-common-idempotent/src/main/java/org/dromara/common/idempotent/core) - Idempotent core utilities

#### ruoyi-common-job/

- **[pom.xml](./ruoyi-common-job/pom.xml)** - Job scheduling module configuration
- **[src/](./ruoyi-common-job/src/) - Source code directory
  - **[main/](./ruoyi-common-job/src/main/java/org/dromara/common/job/config) - Job configuration
  - **[domain/](./ruoyi-common-job/src/main/java/org/dromara/common/job/domain) - Job domain entities
  - **[mapper/](./ruoyi-common-job/src/main/java/org/dromara/common/job/mapper) - Job mappers
#### ruoyi-common-json/

- **[pom.xml](./ruoyi-common-json/pom.xml)** - JSON serialization module configuration
- **[src/](./ruoyi-common-json/src/) - Source code directory
  - **[main/](./ruoyi-common-json/src/main/java/org/dromara/common/json/config) - JSON configuration
  - **[handler/](./ruoyi-common-json/src/main/java/org/dromara/common/json/handler) - JSON handlers
  - **[utils/](./ruoyi-common-json/src/main/java/org/dromara/common/json/utils) - JSON utilities
#### ruoyi-common-log/

- **[pom.xml](./ruoyi-common-log/pom.xml)** - Logging module configuration
- **[src/](./ruoyi-common-log/src/) - Source code directory
  - **[main/](./ruoyi-common-log/src/main/java/org/dromara/common/log/config) - Log configuration
  - **[annotation/](./ruoyi-common-log/src/main/java/org/dromara/common/log/annotation) - Log annotations
  - **[aspect/](./ruoyi-common-log/src/main/java/org/dromara/common/log/aspect) - Log aspect
  - **[config/](./ruoyi-common-log/src/main/java/org/dromara/common/log/config) - Log configuration
  - **[controller/](./ruoyi-common-log/src/main/java/org/dromara/common/log/controller) - Log controllers
            - **[domain/](./ruoyi-common-log/src/main/java/org/dromara/common/log/domain) - Log domain entities
            - **[enums/](./ruoyi-common-log/src/main/java/org/dromara/common/log/enums) - Log enumerations
            - **[event/](./ruoyi-common-log/src/main/java/org/dromara/common/log/event) - Log events
            - **[listener/](./ruoyi-common-log/src/main/java/org/dromara/common/log/listener) - Log listeners
            - **[mapper/](./ruoyi-common-log/src/main/java/org/dromara/common/log/mapper) - Log mappers
            - **[model/](./ruoyi-common-log/src/main/java/org/dromara/common/log/model) - Log models
            - **[service/](./ruoyi-common-log/src/main/java/org/dromara/common/log/service) - Log services

#### ruoyi-common-mail/

- **[pom.xml](./ruoyi-common-mail/pom.xml)** - Mail module Maven configuration
- **[src/](./ruoyi-common-mail/src/) - Source code directory
  - **[main/](./ruoyi-common-mail/src/main/java/org/dromara/common/mail/config) - Mail configuration
  - **[utils/](./ruoyi-common-mail/src/main/java/org/dromara/common/mail/utils) - Mail utilities
#### ruoyi-common-mybatis/

- **[pom.xml](./ruoyi-common-mybatis/pom.xml)** - MyBatis module configuration
- **[src/](./ruoyi-common-mybatis/src/) - Source code directory
  - **[main/](./ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/config) - MyBatis configuration
            - **[core/](./ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/core) - MyBatis core utilities
            - **[enums/](./ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/enums) - MyBatis enumerations
            - **[helper/](./ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/helper) - MyBatis helpers
#### ruoyi-common-oss/

- **[pom.xml](./ruoyi-common-oss/pom.xml)** - OSS storage module configuration
- **[src/](./ruoyi-common-oss/src/) - Source code directory
  - **[main/](./ruoyi-common-oss/src/main/java/org/dromara/common/oss/config) - OSS configuration
            - **[constants/](./ruoyi-common-oss/src/main/java/org/dromara/common/oss/constants) - OSS constants
            - **[core/](./ruoyi-common-oss/src/main/java/org/dromara/common/oss/core) - OSS core utilities
            - **[entity/](./ruoyi-common-oss/src/main/java/org/dromara/common/oss/entity) - OSS entities
            - **[enums/](./ruoyi-common-oss/src/main/java/org/dromara/common/oss/enums) - OSS enumerations
            - **[exception/](./ruoyi-common-oss/src/main/java/org/dromara/common/oss/exception) - OSS exceptions
            - **[factory/](./ruoyi-common-oss/src/main/java/org/dromara/common/oss/factory) - OSS factory
            - **[mapper/](./ruoyi-common-oss/src/main/java/org/dromara/common/oss/mapper) - OSS mappers
#### ruoyi-common-ratelimiter/

- **[pom.xml](./ruoyi-common-ratelimiter/pom.xml)** - Rate limiter module configuration
- **[src/](./ruoyi-common-ratelimiter/src/) - Source code directory
  - **[main/](./ruoyi-common-ratelimiter/src/main/java/org/dromara/common/ratelimiter/config) - Rate limiter configuration
            - **[annotation/](./ruoyi-common-ratelimiter/src/main/java/org/dromara/common/ratelimiter/annotation) - Rate limiter annotations
#### ruoyi-common-redis/

- **[pom.xml](./ruoyi-common-redis/pom.xml)** - Redis cache module configuration
- **[src/](./ruoyi-common-redis/src/) - Source code directory
  - **[main/](./ruoyi-common-redis/src/main/java/org/dromara/common/redis/config) - Redis configuration
            - **[cache/](./ruoyi-common-redis/src/main/java/org/dromara/common/redis/cache) - Cache utilities
            - **[configure/](./ruoyi-common-redis/src/main/java/org/dromara/common/redis/configure) - Redis configuration helper
            - **[lock/](./ruoyi-common-redis/src/main/java/org/dromara/common/redis/lock) - Distributed lock annotation
            - **[utils/](./ruoyi-common-redis/src/main/java/org/dromara/common/redis/utils) - Redis utilities
#### ruoyi-common-satoken/

- **[pom.xml](./ruoyi-common-satoken/pom.xml)** - Sa-Token authentication module configuration
- **[src/](./ruoyi-common-satoken/src/) - Source code directory
  - **[main/](./ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/config) - Sa-Token configuration
            - **[core/](./ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/core) - Sa-Token core utilities
            - **[annotation/](./ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/annotation) - Sa-Token annotations
            - **[config/](./ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/config) - Sa-Token configuration
            - **[dao/](./ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/dao) - Sa-Token data access
            - **[handler/](./ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/handler) - Sa-Token handlers
            - **[interceptor/](./ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/interceptor) - Sa-Token interceptors

            - **[model/](./ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/model) - Sa-Token models
            - **[service/](./ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/service) - Sa-Token services
#### ruoyi-common-security/

- **[pom.xml](./ruoyi-common-security/pom.xml)** - Security module Maven configuration
- **[src/](./ruoyi-common-security/src/) - Source code directory
  - **[main/](./ruoyi-common-security/src/main/java/org/dromara/common/security/config) - Security configuration
            - **[annotation/](./ruoyi-common-security/src/main/java/org/dromara/common/security/annotation) - Security annotations
            - **[config/](./ruoyi-common-security/src/main/java/org/dromara/common/security/config) - Security configuration
            - **[handler/](./ruoyi-common-security/src/main/java/org/dromara/common/security/handler) - Security handlers
            - **[interceptor/](./ruoyi-common-security/src/main/java/org/dromara/common/security/interceptor) - Security interceptors
            - **[service/](./ruoyi-common-security/src/main/java/org/dromara/common/security/service) - Security services
#### ruoyi-common-sensitive/

- **[pom.xml](./ruoyi-common-sensitive/pom.xml)** - Data masking module configuration
- **[src/](./ruoyi-common-sensitive/src/) - Source code directory
  - **[main/](./ruoyi-common-sensitive/src/main/java/org/dromara/common/sensitive/config) - Sensitive configuration
            - **[annotation/](./ruoyi-common-sensitive/src/main/java/org/dromara/common/sensitive/annotation) - Sensitive annotations
            - **[core/](./ruoyi-common-sensitive/src/main/java/org/dromara/common/sensitive/core) - Sensitive core utilities
#### ruoyi-common-sms/

- **[pom.xml](./ruoyi-common-sms/pom.xml)** - SMS messaging module configuration
- **[src/](./ruoyi-common-sms/src/) - Source code directory
  - **[main/](./ruoyi-common-sms/src/main/java/org/dromara/common/sms/config) - SMS configuration
            - **[config/](./ruoyi-common-sms/src/main/java/org/dromara/common/sms/config) - SMS configuration
            - **[core/](./ruoyi-common-sms/src/main/java/org/dromara/common/sms/core) - SMS core utilities
            - **[entity/](./ruoyi-common-sms/src/main/java/org/dromara/common/sms/entity) - SMS entities
#### ruoyi-common-social/

- **[pom.xml](./ruoyi-common-social/pom.xml)** - Social login module configuration
- **[src/](./ruoyi-common-social/src/) - Source code directory
  - **[main/](./ruoyi-common-social/src/main/java/org/dromara/common/social/config) - Social login configuration
            - **[config/](./ruoyi-common-social/src/main/java/org/dromara/common/social/config) - Social configuration
            - **[core/](./ruoyi-common-social/src/main/java/org/dromara/common/social/core) - Social login core utilities
#### ruoyi-common-tenant/

- **[pom.xml](./ruoyi-common-tenant/pom.xml)** - Multi-tenant module configuration
- **[src/](./ruoyi-common-tenant/src/) - Source code directory
  - **[main/](./ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/config) - Tenant configuration
            - **[core/](./ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/core) - Tenant core utilities
            - **[helper/](./ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/helper) - Tenant helpers
            - **[properties/](./ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/properties) - Tenant properties
            - **[kt/](./ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/kt) - Tenant Kotlin extensions
            - **[mgr/](./ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/mgr) - Tenant managers
#### ruoyi-common-translation/

- **[pom.xml](./ruoyi-common-translation/pom.xml)** - Translation module configuration
- **[src/](./ruoyi-common-translation/src/) - Source code directory
  - **[main/](./ruoyi-common-translation/src/main/java/org/dromara/common/translation/config) - Translation configuration
            - **[annotation/](./ruoyi-common-translation/src/main/java/org/dromara/common/translation/annotation) - Translation annotations
            - **[constants/](./ruoyi-common-translation/src/main/java/org/dromara/common/translation/constants) - Translation constants
            - **[core/](./ruoyi-common-translation/src/main/java/org/dromara/common/translation/core) - Translation core utilities
            - **[handler/](./ruoyi-common-translation/src/main/java/org/dromara/common/translation/handler) - Translation handlers
            - **[mapper/](./ruoyi-common-translation/src/main/java/org/dromara/common/translation/mapper) - Translation mappers
#### ruoyi-common-web/

- **[pom.xml](./ruoyi-common-web/pom.xml)** - Web module configuration
- **[src/](./ruoyi-common-web/src/) - Source code directory
  - **[main/](./ruoyi-common-web/src/main/java/org/dromara/common/web/config) - Web configuration
            - **[controller/](./ruoyi-common-web/src/main/java/org/dromara/common/web/controller) - Global exception handler
            - **[domain/](./ruoyi-common-web/src/main/java/org/dromara/common/web/domain) - Domain entities
            - **[enums/](./ruoyi-common-web/src/main/java/org/dromara/common/web/enums) - Web enumerations
            - **[exception/](./ruoyi-common-web/src/main/java/org/dromara/common/web/exception) - Web exceptions
            - **[handler/](./ruoyi-common-web/src/main/java/org/dromara/common/web/handler) - Web handlers
            - **[interceptor/](./ruoyi-common-web/src/main/java/org/dromara/common/web/interceptor) - Web interceptors
            - **[mapper/](./ruoyi-common-web/src/main/java/org/dromara/common/web/mapper) - Web mappers
            - **[utils/](./ruoyi-common-web/src/main/java/org/dromara/common/web/utils) - Web utilities
#### ruoyi-common-websocket/

- **[pom.xml](./ruoyi-common-websocket/pom.xml)** - WebSocket module configuration
- **[src/](./ruoyi-common-websocket/src/) - Source code directory
  - **[main/](./ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/config) - WebSocket configuration
            - **[config/](./ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/config) - WebSocket config properties
            - **[constant/](./ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/constant) - WebSocket constants
            - **[handler/](./ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/handler) - WebSocket handlers
            - **[listener/](./ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/listener) - WebSocket listeners
            - **[message/](./ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/message) - WebSocket messages
            - **[neo/](./ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/neo) - WebSocket session objects
            - **[utils/](./ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/utils) - WebSocket utilities

### ruoyi-extend/

#### ruoyi-monitor-admin/

- **[pom.xml](./ruoyi-extend/ruoyi-monitor-admin/pom.xml)** - Monitor admin Maven configuration
- **[src/](./ruoyi-extend/ruoyi-monitor-admin/src/) - Source code directory

  - **[main/](./ruoyi-extend/ruoyi-monitor-admin/src/main/java/org/dromara/monitor) - Monitor admin application
            - **[resources/](./ruoyi-extend/ruoyi-monitor-admin/src/main/resources) - Application resources

#### ruoyi-snailjob-server/

- **[pom.xml](./ruoyi-extend/ruoyi-snailjob-server/pom.xml)** - SnailJob server Maven configuration
- **[src/](./ruoyi-extend/ruoyi-snailjob-server/src/) - Source code directory

  - **[main/](./ruoyi-extend/ruoyi-snailjob-server/src/main/java/org/dromara/snailjob/server) - SnailJob server application
            - **[resources/](./ruoyi-extend/ruoyi-snailjob-server/src/main/resources) - Application resources

### ruoyi-modules/

#### ruoyi-demo/

- **[pom.xml](./ruoyi-modules/ruoyi-demo/pom.xml)** - Demo module Maven configuration
- **[src/](./ruoyi-modules/ruoyi-demo/src/) - Source code directory

  - **[main/](./ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo) - Demo application
            - **[domain/](./ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo/domain) - Demo domain entities
            - **[controller/](./ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo/controller) - Demo controllers
            - **[mapper/](./ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo/mapper) - Demo mappers
            - **[service/](./ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo/service) - Demo services

#### ruoyi-generator/

- **[pom.xml](./ruoyi-modules/ruoyi-generator/pom.xml)** - Code generator Maven configuration
- **[src/](./ruoyi-modules/ruoyi-generator/src/) - Source code directory
  - **[main/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator) - Code generator application
            - **[config/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/config) - Generator configuration
            - **[config/properties](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/config/properties) - Generator properties
            - **[constant/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/constant) - Generator constants
            - **[core/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/core) - Generator core utilities
            - **[engine/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/engine) - Generator engine (Velocity)
            - **[entity/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/entity) - Generator entities
            - **[enums/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/enums) - Generator enumerations
            - **[mapper/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/mapper) - Generator mappers
            - **[service/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/service) - Generator services
            - **[util/](./ruoyi-modules/ruoyi-generator/src/main/java/org/dromara/generator/util) - Generator utilities
#### ruoyi-job/

- **[pom.xml](./ruoyi-modules/ruoyi-job/pom.xml)** - Job module Maven configuration
- **[src/](./ruoyi-modules/ruoyi-job/src/) - Source code directory
  - **[main/](./ruoyi-modules/ruoyi-job/src/main/java/org/dromara/job) - Job application
            - **[config/](./ruoyi-modules/ruoyi-job/src/main/java/org/dromara/job/config) - Job configuration
            - **[controller/](./ruoyi-modules/ruoyi-job/src/main/java/org/dromara/job/controller) - Job controllers
            - **[domain/](./ruoyi-modules/ruoyi-job/src/main/java/org/dromara/job/domain) - Job domain entities
            - **[dto/](./ruoyi-modules/ruoyi-job/src/main/java/org/dromara/job/dto) - Job DTOs
            - **[mapper/](./ruoyi-modules/ruoyi-job/src/main/java/org/dromara/job/mapper) - Job mappers
            - **[service/](./ruoyi-modules/ruoyi-job/src/main/java/org/dromara/job/service) - Job services
#### ruoyi-system/

- **[pom.xml](./ruoyi-modules/ruoyi-system/pom.xml)** - System module Maven configuration
- **[src/](./ruoyi-modules/ruoyi-system/src/) - Source code directory
  - **[main/](./ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system) - System application
            - **[config/](./ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/config) - System configuration
            - **[controller/](./ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/controller) - System controllers
            - **[domain/](./ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/domain) - System domain entities
            - **[dto/](./ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/dto) - System DTOs
            - **[enums/](./ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/enums) - System enumerations
            - **[listener/](./ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/listener) - System listeners
            - **[mapper/](./ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/mapper) - System mappers
            - **[service/](./ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/service) - System services
#### ruoyi-workflow/

- **[pom.xml](./ruoyi-modules/ruoyi-workflow/pom.xml)** - Workflow module Maven configuration
- **[src/](./ruoyi-modules/ruoyi-workflow/src/) - Source code directory
  - **[main/](./ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow) - Workflow application
            - **[config/](./ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/config) - Workflow configuration
            - **[cond/](./ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/cond) - Workflow condition handler
            - **[controller/](./ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/controller) - Workflow controllers
            - **[domain/](./ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/domain) - Workflow domain entities
            - **[dto/](./ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/dto) - Workflow DTOs
            - **[enums/](./ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/enums) - Workflow enumerations
            - **[mapper/](./ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/mapper) - Workflow mappers
            - **[service/](./ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/service) - Workflow services
### script/

#### bin/

- **[pom.xml](./script/bin/pom.xml)** - Shell scripts Maven configuration
- **[bin/](./script/bin/) - Shell script directory
  - **[main/](./script/bin/main/java/org/dromara/script) - Shell script entry point

            - **[config/](./script/bin/main/java/org/dromara/script/config) - Script configuration
            - **[domain/](./script/bin/main/java/org/dromara/script/domain) - Shell script domain entities
#### docker/

- **[sql/](./script/sql) - SQL initialization scripts
- **[docker-compose.yml](./script/docker/docker-compose.yml) - Docker Compose configuration
- **[Dockerfile](./script/docker/Dockerfile) - Docker configuration file
- **[docker-entrypoint.sh](./script/docker/docker-entrypoint.sh) - Docker entry script
#### leave/

- **[leave.sql](./script/leave/leave.sql) - Leave process SQL script
- **[sql/](./script/sql) - SQL queries for leave management

