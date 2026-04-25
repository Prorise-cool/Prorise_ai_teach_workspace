#!/usr/bin/env bash
# 在服务器上执行（被 deploy.sh 通过 ssh 触发）
# 假设：
#   - 当前 cwd = $REMOTE_ROOT（默认 /opt/xm-prod）
#   - artifacts/ 子目录已被 scp 推送 jar/dist/dump.sql.gz/.env.prod
#   - git 仓库已 clone 且 deploy/prod 分支跟踪到位
set -euo pipefail

ROOT="${REMOTE_ROOT:-/home/prorise/xm-prod}"
ART="$ROOT/_artifacts"
cd "$ROOT"

step() { printf "\n\033[1;36m[remote-up] %s\033[0m\n" "$*"; }

# ---- 1. 拉最新代码 --------------------------------------------------------
step "1/8 git pull deploy/prod"
git fetch origin deploy/prod
git reset --hard origin/deploy/prod
git submodule update --init --recursive 2>/dev/null || true

# ---- 2. 还原 dist + .env.prod；jar 看是否本地传了 -------------------------
step "2/8 还原 dist / .env.prod"
rm -rf packages/ruoyi-plus-soybean/dist packages/student-web/dist
tar -xzf "$ART/admin-dist.tar.gz"   -C packages/ruoyi-plus-soybean
tar -xzf "$ART/student-dist.tar.gz" -C packages/student-web
install -m 600 "$ART/.env.prod" deploy/.env.prod

# ---- 2.5. 编译 jar：本地传了直接用，否则服务器 docker maven build ---------
ADMIN_JAR=packages/RuoYi-Vue-Plus-5.X/ruoyi-admin/target/ruoyi-admin.jar
MONITOR_JAR=packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-monitor-admin/target/ruoyi-monitor-admin.jar
SNAILJOB_JAR=packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-snailjob-server/target/ruoyi-snailjob-server.jar

mkdir -p $(dirname "$ADMIN_JAR") $(dirname "$MONITOR_JAR") $(dirname "$SNAILJOB_JAR")

if [[ -f "$ART/ruoyi-admin.jar" ]]; then
  step "2.5/8 使用本地预编译 jar"
  install -m 644 "$ART/ruoyi-admin.jar"             "$ADMIN_JAR"
  install -m 644 "$ART/ruoyi-monitor-admin.jar"     "$MONITOR_JAR"
  install -m 644 "$ART/ruoyi-snailjob-server.jar"   "$SNAILJOB_JAR"
else
  step "2.5/8 服务器侧 docker maven 编译 jar（首次约 5-8 分钟，含依赖下载）"
  mkdir -p "$HOME/.m2"
  docker run --rm \
    -v "$ROOT/packages/RuoYi-Vue-Plus-5.X:/build" \
    -v "$HOME/.m2:/root/.m2" \
    -w /build \
    maven:3.9-eclipse-temurin-21 \
    mvn -B clean package -P prod -Dmaven.test.skip=true -T 1C \
        -pl ruoyi-admin,ruoyi-extend/ruoyi-monitor-admin,ruoyi-extend/ruoyi-snailjob-server -am
  for f in "$ADMIN_JAR" "$MONITOR_JAR" "$SNAILJOB_JAR"; do
    [[ -f "$f" ]] || { echo "[remote-up] ❌ jar 编译失败：$f 不存在"; exit 1; }
  done
  echo "[remote-up]   ✅ 三个 jar 编译完成"
fi

# ---- 3. compose build -----------------------------------------------------
step "3/8 docker compose build"
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod build

# ---- 4. 起基础设施层（edge-tts 复用宿主已有容器，不在本 compose 内）-----
step "4/8 启动 mysql / redis / minio + minio-init"
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod up -d \
  mysql redis minio minio-init

# 等 mysql healthy
echo "[remote-up] 等 mysql healthy..."
until [[ "$(docker inspect -f '{{.State.Health.Status}}' xm-mysql 2>/dev/null || echo starting)" == "healthy" ]]; do
  sleep 3
done
echo "[remote-up]   ✅ mysql healthy"

# ---- 5. 数据导入（仅当 xm_dev 表为空时执行，幂等保护）-------------------
step "5/8 检查 xm_dev 是否需要 import dump"
TABLES=$(docker exec xm-mysql mysql -uroot -p"$(grep '^MYSQL_ROOT_PASSWORD=' deploy/.env.prod | cut -d= -f2-)" \
  -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='xm_dev';" 2>/dev/null || echo 0)

if [[ "$TABLES" -lt 10 ]]; then
  echo "[remote-up]   xm_dev 仅 $TABLES 张表，开始导入 dump..."
  gunzip -c "$ART/dump.sql.gz" | docker exec -i xm-mysql mysql \
    -uroot -p"$(grep '^MYSQL_ROOT_PASSWORD=' deploy/.env.prod | cut -d= -f2-)" xm_dev
  echo "[remote-up]   ✅ dump 导入完成"

  echo "[remote-up]   执行 06-data-fixup.sql..."
  docker exec -i xm-mysql mysql \
    -uroot -p"$(grep '^MYSQL_ROOT_PASSWORD=' deploy/.env.prod | cut -d= -f2-)" xm_dev \
    < deploy/sql/06-data-fixup.sql
  echo "[remote-up]   ✅ fixup 完成"
else
  echo "[remote-up]   xm_dev 已有 $TABLES 张表，跳过 import（如要强制重导：先 docker volume rm xm-prod_mysql-data）"
fi

# ---- 6. 起 RuoYi 后端层 --------------------------------------------------
step "6/8 启动 ruoyi-snailjob / ruoyi-monitor / ruoyi-java"
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod up -d \
  ruoyi-snailjob ruoyi-monitor ruoyi-java

# ---- 7. 起应用 + 前端层 --------------------------------------------------
step "7/8 启动 fastapi / fastapi-worker / admin-fe / student-fe"
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod up -d \
  fastapi fastapi-worker admin-fe student-fe

# ---- 8. 状态报告 ---------------------------------------------------------
step "8/8 部署完成，当前服务状态："
docker compose -f deploy/docker-compose.yml ps
echo ""
echo "[remote-up] ✅ 全部容器已启动；公网入口请在 1panel openresty 反代到："
echo "  - xm.prorisehub.com/         → 127.0.0.1:18082 (student-web)"
echo "  - xm.prorisehub.com/admin/   → 127.0.0.1:18081 (admin)"
echo "  - xm.prorisehub.com/api/v1/  → 127.0.0.1:18090 (fastapi, 需 proxy_buffering off)"
echo "  - xm.prorisehub.com/prod-api/ /xiaomai/ /system/ /monitor/ /api/user/ /api/public/ → 127.0.0.1:18080 (ruoyi)"
