# Prorise AI Teach — 生产部署 SOP

> 服务器 `prorise@38.76.207.214`，域名 `xm.prorisehub.com`，部署根目录 `/home/prorise/xm-prod`。
> 本文是 LLM Agent 也能直接照抄执行的运行手册。

---

## TL;DR — 90% 的更新场景一行命令

```bash
# 在仓库根目录（macOS）
./deploy/scripts/deploy.sh
```

会自动：本地 build → scp 上传 → 服务器 git pull deploy/prod → docker compose build → 起容器。

**密钥/PAT 全部从 `deploy/.env.prod`（gitignored）读取**，不需要交互输入。

---

## 三种常见更新场景

### 1. 仅改了 RuoYi Java 后端代码

```bash
# 服务器侧 mvn 编译（缓存暖，30s 左右），其他服务镜像自动复用
SKIP_DUMP=1 ./deploy/scripts/deploy.sh
```

### 2. 仅改了 fastapi-backend Python 代码

```bash
SKIP_DUMP=1 ./deploy/scripts/deploy.sh
# 服务器 docker build fastapi 时，pip 层缓存命中，只重 COPY app/，~30s
```

### 3. 仅改了前端（admin / student-web）

前端 dist 必须**本地 build**（已在 `build-local.sh` 里），所以：

```bash
SKIP_DUMP=1 ./deploy/scripts/deploy.sh
```

如果只改 student-web，可让 build-local 跳过 admin（节省 1 min）：手动跑 `pnpm --filter student-web build` 后 `SKIP_BUILD=1 SKIP_DUMP=1 ./deploy/scripts/deploy.sh`。

### 4. 数据库 schema 变更

修改 `deploy/sql/06-data-fixup.sql` 后：

```bash
# 强制重导库（破坏性，慎用）
ssh prorise@38.76.207.214
cd /home/prorise/xm-prod
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod down mysql
docker volume rm xm-prod_mysql-data
exit

# 然后正常 deploy（会 mysqldump 并重导）
./deploy/scripts/deploy.sh
```

---

## 文件布局速查

```
deploy/
├── .env.prod                    本地真实凭据（gitignored）
├── .env.prod.example            模板（进 git）
├── docker-compose.yml           服务编排
├── Dockerfile.fastapi           Python 3.12 + texlive + manim 0.19
├── Dockerfile.ruoyi             OpenJDK 21（admin/monitor/snailjob 共用，build args 区分）
├── Dockerfile.admin-fe          nginx:alpine + 本地 dist
├── Dockerfile.student-fe        nginx:alpine + 本地 dist
├── fastapi-entrypoint.sh        api/worker/shell 三种 mode
├── nginx-fe/
│   ├── admin-fe.conf            /admin/ 子路径 alias
│   └── student-fe.conf          根路径 SPA fallback
├── sql/
│   └── 06-data-fixup.sql        本地 URL → 容器 service 名 + 测试数据清理（幂等）
├── scripts/
│   ├── deploy.sh                ⭐ 一键部署主脚本（本地）
│   ├── build-local.sh           本地构建（默认只 build 前端，jar 在服务器编）
│   ├── dump-mysql.sh            从本地 dev-mysql 导 xm_dev → _artifacts/dump.sql.gz
│   └── remote-up.sh             服务器侧执行（被 deploy.sh ssh 触发）
└── _artifacts/                  上传缓存（gitignored）
```

---

## 服务拓扑 + 端口表

```
浏览器 → xm.prorisehub.com (1panel openresty TLS 反代)
        ↓
        ├── /                    → 127.0.0.1:18082  (student-fe)
        ├── /admin/              → 127.0.0.1:18081  (admin-fe)
        ├── /api/v1/             → 127.0.0.1:18090  (fastapi)
        ├── /prod-api/           → 127.0.0.1:18080  (ruoyi-java，剥前缀)
        ├── /xiaomai/ /system/ /monitor/ /api/user/ /api/public/
        │                        → 127.0.0.1:18080  (ruoyi-java，不剥前缀)
        └── /minio/console/      → 127.0.0.1:19001  (可选，建议 IP 白名单)

仅内网 backend 网络：mysql:3306, redis:6379, ruoyi-monitor:9090, ruoyi-snailjob:8800
跨容器复用：edge-tts (位于宿主已有的 prorise-internal 网络)
```

### 1panel openresty 反代配置（你在 UI 里填）

```nginx
location / {
    proxy_pass http://127.0.0.1:18082;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /admin/ {
    proxy_pass http://127.0.0.1:18081;
    # 透传 /admin/ 前缀，不剥
}

location /api/v1/ {
    proxy_pass http://127.0.0.1:18090;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;          # SSE 必需
    proxy_read_timeout 3600s;
    chunked_transfer_encoding on;
}

location /prod-api/ {
    proxy_pass http://127.0.0.1:18080/;   # 末尾 / 表示剥前缀
}

location ~ ^/(xiaomai|system|monitor|api/user|api/public)/ {
    proxy_pass http://127.0.0.1:18080;
}
```

---

## 首次部署 SOP（迁移到新服务器）

### Step 1 · 服务器准备（一次性）

```bash
# A. 装 Docker（已装跳过）
ssh prorise@<NEW_SERVER>
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker prorise
exit && ssh prorise@<NEW_SERVER>   # 重连让 docker group 生效

# B. clone 仓库（用 PAT 认证一次）
mkdir -p /home/prorise/xm-prod
cd /home/prorise
git clone https://<USER>:<GITHUB_PAT>@github.com/Prorise-cool/Prorise_ai_teach_workspace.git xm-prod
cd xm-prod
git checkout deploy/prod

# C. 配置 git credential helper（PAT 落盘 ~/.git-credentials，后续免输）
git config credential.helper store
echo "https://<USER>:<GITHUB_PAT>@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
git remote set-url origin https://github.com/Prorise-cool/Prorise_ai_teach_workspace.git

# D. 创建外部 docker network（如果是全新服务器没有 prorise-internal）
docker network create prorise-internal

# E. （可选）拉个 edge-tts 进 prorise-internal
docker run -d --name edge-tts --restart unless-stopped \
  --network prorise-internal \
  -e API_KEY=Maicol7896. \
  travisvn/openai-edge-tts:latest
```

### Step 2 · 本地配置 `.env.prod`

```bash
cd /Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace
cp deploy/.env.prod.example deploy/.env.prod
# 编辑 .env.prod 填入：
# - SERVER_HOST / SERVER_SSH_PASSWORD（新服务器）
# - GITHUB_USER / GITHUB_PAT
# - 各种密码（mysql/redis/minio）
# - DOMAIN
```

### Step 3 · 一键部署

```bash
./deploy/scripts/deploy.sh
```

首次会跑：本地 pnpm build（~2 min）+ dump（10s）+ scp（11M ≈ 1 min）+ 服务器 mvn build（~8 min 含依赖下载）+ docker build（fastapi ~10 min 装 texlive）+ 起容器（~3 min 含 db import）→ **总计 25-30 分钟**。

后续更新：mvn 缓存命中 ~30s，docker build 缓存 ~2 min，**3-5 分钟一次部署**。

### Step 4 · 1panel 配反代

按上面"1panel openresty 反代配置"那段填进 1panel UI。

---

## 故障排查手册（基于实际踩过的坑）

### docker compose build 报 `Unknown compiler(s)` (gcc/cc 找不到)

**原因**：Dockerfile 里 `apt purge build-essential` 早于 `pip install`，编译 numpy/manim native 扩展时无 gcc。

**修法**：保留 build-essential（已修，commit `5da28f81`）。

### ruoyi-java 启动失败 `Connection refused` 到 mysql

**原因**：`application-prod.yml` 仍硬编码 `jdbc:mysql://localhost:3306`。

**修法**：yml 改 `jdbc:mysql://${MYSQL_HOST:mysql}:...`（已修，commit `f600b8b9`）。

### snailjob 客户端报 `Token authentication failed`

**原因**：`.env.prod` 的 `RUOYI_SNAILJOB_TOKEN` 与 DB 表 `sj_group_config.token` 不一致。

**修法**：以 DB 为准，或在 06-data-fixup.sql 里 UPDATE 同步 token。当前定值 `SJ_cKqBTPzCsWA3VyuCfFoccmuIEGXjr5KT`。

### healthcheck 一直 starting / unhealthy

**原因 1**：compose.yml 里设了 healthcheck override 了 Dockerfile 里的（已删 ruoyi-java 的 override，commit `01ad21a7`）。

**原因 2**：HEALTHCHECK CMD 用了 `${ARG_NAME}` 而非 `${ENV_NAME}` —— ARG 在 build 后丢失，运行时 sh 找不到（已改用 `${SERVER_PORT}` ENV）。

**原因 3**：actuator/health 默认要登录返回 401，curl -f 视为失败。改用根路径 `/`（已修，commit `5ab48b59`）。

### fastapi 启动 `IndexError: 1` 在 PROJECT_ROOT.parents[1]

**原因**：容器 PROJECT_ROOT=/app 只有 1 层 parent，老代码假设至少 2 层。

**修法**：parents 不够深时 fallback（已修，commit `8252ed0c`）。

### fastapi 启动 `SyntaxError: f-string expression part cannot include a backslash`

**原因**：业务代码 `scene_slide.py` 用了 PEP 701 嵌套 f-string，Python 3.11 不支持。

**修法**：Dockerfile 升 `python:3.12-slim`（已修，commit `5da28f81`）。

### 服务器某容器 `Restarting` 但 image 是新的

**原因**：docker compose 有时不会自动 pickup 新 image。

**修法**：
```bash
docker rm -f <container_name>
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod up -d <service_name>
```

### docker compose build 缓存导致 Dockerfile 改动未生效

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod build --no-cache <service>
```

---

## 日常运维命令速查

```bash
# 服务器登录
sshpass -p Prorise7896. ssh prorise@38.76.207.214
cd /home/prorise/xm-prod

# 看所有容器状态
docker ps -a --filter "name=xm-"

# 看某个服务日志
docker logs -f xm-fastapi --tail 100
docker logs -f xm-ruoyi-java --tail 100

# 进容器调试
docker exec -it xm-fastapi /usr/local/bin/fastapi-entrypoint.sh shell
docker exec -it xm-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" xm_dev

# 全栈重启
set -a; . deploy/.env.prod; set +a
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod restart

# 全栈拆掉重建（保留 volume）
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod down
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod up -d

# 备份 mysql
docker exec xm-mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines xm_dev | gzip > /home/prorise/backup/xm_dev_$(date +%F).sql.gz

# 备份 minio
docker exec xm-minio mc mirror local/ruoyi /tmp/minio-backup
```

---

## 回滚

```bash
# 本地切回上一个 commit
git checkout deploy/prod
git revert HEAD --no-edit && git push origin deploy/prod

# 服务器执行回滚（不重 build，仅切镜像 tag 是另一种思路；目前没维护多 tag，依赖 git revert）
./deploy/scripts/deploy.sh
```

未来如果要快速回滚，建议在 `Dockerfile.*` 里加 `LABEL version=$GIT_SHA`，build 时 `--build-arg GIT_SHA=$(git rev-parse HEAD)`，可保留多个 tag 切换。

---

## PAT 续期

PAT 有效期默认 90 天。续期：

1. https://github.com/settings/personal-access-tokens 找到 `xm-prod-deploy` → Regenerate
2. 把新 PAT 写进 `deploy/.env.prod` 的 `GITHUB_PAT` 字段
3. ssh 服务器，更新 git credential：
   ```bash
   echo "https://Prorise-cool:<NEW_PAT>@github.com" > ~/.git-credentials
   ```

---

## 容器拓扑变更（参考）

| 想做的事 | 改哪 |
|---------|------|
| 加新服务 | `deploy/docker-compose.yml` 加 service block，`deploy/scripts/remote-up.sh` 加到 step 7 |
| 改端口 | `deploy/.env.prod` 的 `HOST_*_PORT` + 1panel 反代规则 |
| 加挂载卷 | compose `volumes:` 段 |
| 改 JVM 内存 | `RUOYI_*_JAVA_OPTS` |
| 改 manim 渲染并发 | `FASTAPI_VIDEO_SECTION_CODEGEN_CONCURRENCY` |
| 加 fastapi 依赖 | `packages/fastapi-backend/pyproject.toml` + `Dockerfile.fastapi` 同步 pip install 段 |

---

## 安全提醒

- `deploy/.env.prod` **永远不要 commit**（已 gitignored）
- `deploy/_artifacts/` 含 dump（带 api_key）和 .env.prod 副本，**永远不要 commit**（已 gitignored）
- PAT 在服务器 `~/.git-credentials` 仅 `prorise` 用户可读（chmod 600）
- MinIO console 19001 默认无 IP 白名单，**生产建议 1panel 里加 IP 限制**或干脆不反代
- 接口加密 RSA 是 RSA-1024（与前端 bundle 烘焙一致）；如需升级到 2048，需同步：deploy/.env.prod + ruoyi-plus-soybean/.env.prod + student-web RSA 配置 + 重 build 前端

---

## 服务器资源水位

```
CPU: 8 vCPU
RAM: 7.8 GB（fastapi 镜像 1.8G + ruoyi-admin 0.5G + worker 1G + ...）
DISK: 50 GB（首次部署后约用 43G，剩 7G —— 视频渲染会持续增长，需定期清理 .runtime/CASES/）
```

清理无用 video task 中间产物：
```bash
docker exec xm-fastapi-worker find /app/.runtime/video-assets -name "vtask_*" -mtime +7 -exec rm -rf {} +
```
