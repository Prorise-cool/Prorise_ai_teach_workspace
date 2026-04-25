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

[[ -f "$ROOT/deploy/.env.prod" ]] || { echo "❌ deploy/.env.prod 不存在，先 cp .env.prod.example 并填值"; exit 1; }
# 加载 .env.prod 取 SERVER_HOST/SERVER_SSH_PASSWORD
set -a; . "$ROOT/deploy/.env.prod"; set +a

REMOTE_HOST="${REMOTE_HOST:-${SERVER_HOST:-prorise@38.76.207.214}}"
REMOTE_ROOT="${REMOTE_ROOT:-/home/prorise/xm-prod}"
SSH_OPTS="${SSH_OPTS:--o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30}"

# 选 ssh 包装器：有密码 → sshpass；无密码 → 假定 ssh-copy-id 已配
if [[ -n "${SERVER_SSH_PASSWORD:-}" ]]; then
  command -v sshpass >/dev/null 2>&1 || { echo "❌ 需要 sshpass：brew install sshpass"; exit 1; }
  SSH="sshpass -p $SERVER_SSH_PASSWORD ssh $SSH_OPTS"
  SCP="sshpass -p $SERVER_SSH_PASSWORD scp $SSH_OPTS"
  RSYNC="sshpass -p $SERVER_SSH_PASSWORD rsync"
  RSYNC_RSH="ssh $SSH_OPTS"
else
  SSH="ssh $SSH_OPTS"
  SCP="scp $SSH_OPTS"
  RSYNC="rsync"
  RSYNC_RSH="ssh $SSH_OPTS"
fi

step() { printf "\n\033[1;35m[deploy] %s\033[0m\n" "$*"; }

# ---- 0. 前置检查 ----------------------------------------------------------
step "0/5 前置检查"
$SSH "$REMOTE_HOST" "true" 2>/dev/null \
  || { echo "❌ ssh 连不上 $REMOTE_HOST（密码错误或网络）"; exit 1; }
$SSH "$REMOTE_HOST" "test -d $REMOTE_ROOT/.git" 2>/dev/null \
  || { echo "❌ 服务器 $REMOTE_ROOT 未 git clone（需先初始化）"; exit 1; }
echo "[deploy]   ✅ ssh 通畅 / 服务器仓库就绪"

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

# 4.1 jar 不再本地传输；服务器侧用 docker maven 镜像编译（见 remote-up.sh）
# 仅当 BUILD_JARS_LOCAL=1 时才本地编译并上传
if [[ "${BUILD_JARS_LOCAL:-0}" == "1" ]]; then
  cp -f "$ROOT/packages/RuoYi-Vue-Plus-5.X/ruoyi-admin/target/ruoyi-admin.jar"                                    "$ART/"
  cp -f "$ROOT/packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-monitor-admin/target/ruoyi-monitor-admin.jar"       "$ART/"
  cp -f "$ROOT/packages/RuoYi-Vue-Plus-5.X/ruoyi-extend/ruoyi-snailjob-server/target/ruoyi-snailjob-server.jar"   "$ART/"
else
  rm -f "$ART/"ruoyi-*.jar
fi

# 4.2 dist tar
tar -czf "$ART/admin-dist.tar.gz"   -C "$ROOT/packages/ruoyi-plus-soybean"   dist
tar -czf "$ART/student-dist.tar.gz" -C "$ROOT/packages/student-web"          dist

# 4.3 .env.prod（敏感）
cp -f "$ROOT/deploy/.env.prod" "$ART/.env.prod"

ls -lh "$ART/" | awk 'NR>1 {printf "[deploy]   %s %s\n", $5, $9}'

# ---- 5. 上传 + 触发远端 --------------------------------------------------
step "5/5 上传 artifacts 并触发服务器部署"

$SSH "$REMOTE_HOST" "mkdir -p $REMOTE_ROOT/_artifacts"
$RSYNC -azP -e "$RSYNC_RSH" "$ART/" "$REMOTE_HOST:$REMOTE_ROOT/_artifacts/"

# 把 remote-up.sh 也一起送上去
$SCP "$SCRIPT_DIR/remote-up.sh" "$REMOTE_HOST:$REMOTE_ROOT/_artifacts/remote-up.sh"

$SSH "$REMOTE_HOST" "
  cd $REMOTE_ROOT &&
  chmod +x _artifacts/remote-up.sh &&
  REMOTE_ROOT='$REMOTE_ROOT' bash _artifacts/remote-up.sh
"

step "✅ 全部完成"
