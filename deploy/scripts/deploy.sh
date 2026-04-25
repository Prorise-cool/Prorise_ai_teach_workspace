#!/usr/bin/env bash
# 一键部署主脚本（本地执行）
# 流程：build → 打包 artifacts → scp 到服务器 → ssh 触发 remote-up.sh
#
# 用法：
#   ./deploy/scripts/deploy.sh              # 完整流程（含 build + dump）
#   SKIP_BUILD=1 ./deploy/scripts/deploy.sh # 复用上次产物
#   SKIP_DUMP=1  ./deploy/scripts/deploy.sh # 不重新 dump 数据库
#
# 前置：
#   1. 服务器 prorise@38.76.207.214 已 ssh-copy-id（免密）
#   2. 服务器已 git clone https://github.com/Prorise-cool/Prorise_ai_teach_workspace.git
#      到 /opt/xm-prod 并 checkout deploy/prod
#   3. 服务器已装 docker compose（plugin 形式）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ART="$ROOT/deploy/_artifacts"
mkdir -p "$ART"

REMOTE_HOST="${REMOTE_HOST:-prorise@38.76.207.214}"
REMOTE_ROOT="${REMOTE_ROOT:-/home/prorise/xm-prod}"
SSH_OPTS="${SSH_OPTS:--o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30}"

step() { printf "\n\033[1;35m[deploy] %s\033[0m\n" "$*"; }

# ---- 0. 前置检查 ----------------------------------------------------------
step "0/5 前置检查"
[[ -f "$ROOT/deploy/.env.prod" ]] || { echo "❌ deploy/.env.prod 不存在，先 cp .env.prod.example 并填值"; exit 1; }
ssh $SSH_OPTS -o BatchMode=yes "$REMOTE_HOST" "true" 2>/dev/null \
  || { echo "❌ ssh 免密未配置：先 ssh-copy-id $REMOTE_HOST"; exit 1; }
ssh $SSH_OPTS "$REMOTE_HOST" "test -d $REMOTE_ROOT/.git" \
  || { echo "❌ 服务器 $REMOTE_ROOT 未 git clone，请先：ssh $REMOTE_HOST 'git clone <repo> $REMOTE_ROOT && cd $REMOTE_ROOT && git checkout deploy/prod'"; exit 1; }
echo "[deploy]   ✅ 本地 .env.prod 存在 / ssh 通畅 / 服务器仓库就绪"

# ---- 1. 推 git ------------------------------------------------------------
step "1/5 推送 deploy/prod 分支到 origin"
git -C "$ROOT" push origin deploy/prod

# ---- 2. 本地构建 ---------------------------------------------------------
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  step "2/5 本地构建（mvn jar + pnpm build）"
  bash "$SCRIPT_DIR/build-local.sh"
else
  step "2/5 SKIP_BUILD=1，沿用现有 jar/dist"
fi

# ---- 3. 数据库 dump ------------------------------------------------------
if [[ "${SKIP_DUMP:-0}" != "1" ]]; then
  step "3/5 dev-mysql dump"
  bash "$SCRIPT_DIR/dump-mysql.sh"
else
  step "3/5 SKIP_DUMP=1，沿用 $ART/dump.sql.gz"
fi

# ---- 4. 准备 artifacts 包 -------------------------------------------------
step "4/5 准备 artifacts 上传包"

# 4.1 jar（直接使用 build 出来的路径）
cp -f "$ROOT/packages/RuoYi-Vue-Plus-5.X/ruoyi-admin/target/ruoyi-admin.jar"                          "$ART/"
cp -f "$ROOT/packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-monitor-admin/target/ruoyi-monitor-admin.jar"     "$ART/"
cp -f "$ROOT/packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-snailjob-server/target/ruoyi-snailjob-server.jar" "$ART/"

# 4.2 dist tar
tar -czf "$ART/admin-dist.tar.gz"   -C "$ROOT/packages/ruoyi-plus-soybean"   dist
tar -czf "$ART/student-dist.tar.gz" -C "$ROOT/packages/student-web"          dist

# 4.3 .env.prod（敏感）
cp -f "$ROOT/deploy/.env.prod" "$ART/.env.prod"

ls -lh "$ART/" | awk 'NR>1 {printf "[deploy]   %s %s\n", $5, $9}'

# ---- 5. 上传 + 触发远端 --------------------------------------------------
step "5/5 上传 artifacts 并触发服务器部署"

ssh $SSH_OPTS "$REMOTE_HOST" "mkdir -p $REMOTE_ROOT/_artifacts"
rsync -azP -e "ssh $SSH_OPTS" "$ART/" "$REMOTE_HOST:$REMOTE_ROOT/_artifacts/"

# 把 remote-up.sh 也一起送上去（避免依赖 git pull 的版本同步问题）
scp $SSH_OPTS "$SCRIPT_DIR/remote-up.sh" "$REMOTE_HOST:$REMOTE_ROOT/_artifacts/remote-up.sh"

ssh $SSH_OPTS "$REMOTE_HOST" "
  cd $REMOTE_ROOT &&
  chmod +x _artifacts/remote-up.sh &&
  REMOTE_ROOT='$REMOTE_ROOT' bash _artifacts/remote-up.sh
"

step "✅ 全部完成"
