#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PACKAGE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
VENV_PYTHON="$PACKAGE_DIR/.venv/bin/python"
DRAMATIQ_CMD="$PACKAGE_DIR/.venv/bin/dramatiq"
WORKER_MATCH_PATTERN="$PACKAGE_DIR/.venv/bin/python .*dramatiq app.worker"

if [ ! -x "$VENV_PYTHON" ]; then
  echo "FastAPI worker virtualenv is missing: $VENV_PYTHON" >&2
  exit 1
fi

BOOTSTRAP_ENV=$(
  cd "$PACKAGE_DIR"
  "$VENV_PYTHON" - <<'PY'
from __future__ import annotations

import shlex

from app.core.config import get_settings

settings = get_settings()
pairs = {
    "WORKER_PROCESSES": settings.dramatiq_worker_processes,
    "WORKER_THREADS": settings.dramatiq_worker_threads,
    "PROMETHEUS_ENABLED": 1 if settings.dramatiq_prometheus_enabled else 0,
    "PROMETHEUS_HOST": settings.dramatiq_prometheus_host,
    "PROMETHEUS_PORT": settings.dramatiq_prometheus_port,
}
for key, value in pairs.items():
    print(f"{key}={shlex.quote(str(value))}")
PY
)
eval "$BOOTSTRAP_ENV"

if command -v pgrep >/dev/null 2>&1; then
  EXISTING_WORKER_PIDS=$(pgrep -f "$WORKER_MATCH_PATTERN" || true)
  for pid in $EXISTING_WORKER_PIDS; do
    if [ -z "$pid" ]; then
      continue
    fi
    echo "Stopping existing Dramatiq worker (PID $pid) before restart..."
    kill "$pid" 2>/dev/null || true
    attempts=0
    while kill -0 "$pid" 2>/dev/null; do
      attempts=$((attempts + 1))
      if [ "$attempts" -ge 10 ]; then
        echo "Force killing stale Dramatiq worker (PID $pid)." >&2
        kill -9 "$pid" 2>/dev/null || true
        break
      fi
      sleep 1
    done
  done
fi

if [ "$PROMETHEUS_ENABLED" = "1" ]; then
  export dramatiq_prom_host="$PROMETHEUS_HOST"
  export dramatiq_prom_port="$PROMETHEUS_PORT"
fi

if [ ! -x "$DRAMATIQ_CMD" ] && [ -x "$VENV_PYTHON" ]; then
  exec "$VENV_PYTHON" -m dramatiq app.worker -p "$WORKER_PROCESSES" -t "$WORKER_THREADS"
fi

exec "$DRAMATIQ_CMD" app.worker -p "$WORKER_PROCESSES" -t "$WORKER_THREADS"
