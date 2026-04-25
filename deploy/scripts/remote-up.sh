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

# ---- 2. 把 artifacts 还原到工作树 -----------------------------------------
step "2/8 还原 jar / dist / .env.prod"
install -m 644 "$ART/ruoyi-admin.jar"               packages/RuoYi-Vue-Plus-5.X/ruoyi-admin/target/ruoyi-admin.jar
install -m 644 "$ART/ruoyi-monitor-admin.jar"       packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-monitor-admin/target/ruoyi-monitor-admin.jar
install -m 644 "$ART/ruoyi-snailjob-server.jar"     packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-snailjob-server/target/ruoyi-snailjob-server.jar

mkdir -p packages/RuoYi-Vue-Plus-5.X/ruoyi-admin/target \
         packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-monitor-admin/target \
         packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-snailjob-server/target

rm -rf packages/ruoyi-plus-soybean/dist packages/student-web/dist
tar -xzf "$ART/admin-dist.tar.gz"   -C packages/ruoyi-plus-soybean
tar -xzf "$ART/student-dist.tar.gz" -C packages/student-web

install -m 600 "$ART/.env.prod" deploy/.env.prod

# ---- 3. compose build -----------------------------------------------------
step "3/8 docker compose build"
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod build

# ---- 4. 起基础设施层 -----------------------------------------------------
step "4/8 启动 mysql / redis / minio + minio-init"
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.prod up -d \
  mysql redis minio minio-init edge-tts

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
