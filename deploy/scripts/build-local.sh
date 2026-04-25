#!/usr/bin/env bash
# 本地构建：3 个 RuoYi jar + 2 个前端 dist
# 产物路径（被 deploy.sh 接力上传）：
#   packages/RuoYi-Vue-Plus-5.X/{ruoyi-admin,ruoyi-extend/*}/target/*.jar
#   packages/{ruoyi-plus-soybean,student-web}/dist
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

# 默认 SKIP_JARS=1：jar 在服务器侧用 docker maven 镜像构建，不本地传
# 如需本地预 build（调试用）：BUILD_JARS_LOCAL=1 ./build-local.sh
SKIP_JARS="${SKIP_JARS:-1}"
SKIP_FE="${SKIP_FE:-0}"
[[ "${BUILD_JARS_LOCAL:-0}" == "1" ]] && SKIP_JARS=0

# ---- 1. RuoYi jars ---------------------------------------------------------
if [[ "$SKIP_JARS" != "1" ]]; then
  echo "[build-local] mvn package（admin/monitor/snailjob，跳过测试编译）"
  cd "$ROOT/packages/RuoYi-Vue-Plus-5.X"
  mvn clean package -P prod -Dmaven.test.skip=true \
    -pl ruoyi-admin,ruoyi-extend/ruoyi-monitor-admin,ruoyi-extend/ruoyi-snailjob-server -am \
    -T 1C \
    --quiet

  for jar in \
    "ruoyi-admin/target/ruoyi-admin.jar" \
    "ruoyi-extend/ruoyi-monitor-admin/target/ruoyi-monitor-admin.jar" \
    "ruoyi-extend/ruoyi-snailjob-server/target/ruoyi-snailjob-server.jar"
  do
    [[ -f "$jar" ]] || { echo "[build-local] ❌ $jar 未生成"; exit 1; }
    SIZE=$(du -h "$jar" | cut -f1)
    echo "[build-local]   ✅ $jar ($SIZE)"
  done
  cd "$ROOT"
else
  echo "[build-local] SKIP_JARS=1，跳过 mvn"
fi

# ---- 2. 前端 dist ----------------------------------------------------------
if [[ "$SKIP_FE" != "1" ]]; then
  echo "[build-local] pnpm install + build（admin / student）"
  pnpm install --frozen-lockfile --prefer-offline
  pnpm --filter ruoyi-plus-soybean build
  pnpm --filter student-web build

  for dist in \
    "packages/ruoyi-plus-soybean/dist/index.html" \
    "packages/student-web/dist/index.html"
  do
    [[ -f "$dist" ]] || { echo "[build-local] ❌ $dist 未生成"; exit 1; }
  done
  echo "[build-local]   ✅ 两个 dist 都生成"
else
  echo "[build-local] SKIP_FE=1，跳过 pnpm build"
fi

echo "[build-local] ✅ 全部产物就绪"
