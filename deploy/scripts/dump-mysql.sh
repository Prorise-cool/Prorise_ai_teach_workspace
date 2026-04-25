#!/usr/bin/env bash
# 本地 dev-mysql 导出 xm_dev 数据库，gzip 压缩到 deploy/_artifacts/dump.sql.gz
# 这份 dump 含完整 schema + 业务数据 + AI provider keys；运维上视同密钥
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ART_DIR="$ROOT/deploy/_artifacts"
mkdir -p "$ART_DIR"

CONTAINER="${DEV_MYSQL_CONTAINER:-dev-mysql}"
DB="${DEV_MYSQL_DB:-xm_dev}"
USER="${DEV_MYSQL_USER:-root}"
PASS="${DEV_MYSQL_PASS:-root}"
OUT="$ART_DIR/dump.sql.gz"

echo "[dump-mysql] 从容器 $CONTAINER 导出 $DB → $OUT"
docker exec "$CONTAINER" mysqldump \
  -u"$USER" -p"$PASS" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --no-tablespaces \
  --default-character-set=utf8mb4 \
  --set-gtid-purged=OFF \
  "$DB" 2>/dev/null \
  | gzip -9 > "$OUT"

SIZE=$(ls -lh "$OUT" | awk '{print $5}')
GZCAT="$(command -v gzcat || command -v zcat)"
ROWS=$("$GZCAT" "$OUT" | grep -c '^INSERT INTO' || true)
echo "[dump-mysql] ✅ 完成：$OUT (${SIZE}，${ROWS} 个 INSERT 语句)"
