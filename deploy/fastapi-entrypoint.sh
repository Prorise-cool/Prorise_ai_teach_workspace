#!/usr/bin/env bash
# FastAPI 镜像入口分流：api / worker / shell
set -euo pipefail

mode="${1:-api}"

case "$mode" in
  api)
    exec uvicorn app.main:app \
      --host "${FASTAPI_HOST:-0.0.0.0}" \
      --port "${FASTAPI_PORT:-8090}" \
      --proxy-headers \
      --forwarded-allow-ips '*'
    ;;

  worker)
    procs="${FASTAPI_DRAMATIQ_WORKER_PROCESSES:-1}"
    threads="${FASTAPI_DRAMATIQ_WORKER_THREADS:-2}"
    exec python -m dramatiq app.worker \
      --processes "$procs" \
      --threads "$threads"
    ;;

  shell)
    exec /bin/bash
    ;;

  *)
    echo "[fastapi-entrypoint] unknown mode: $mode (expected: api|worker|shell)" >&2
    exit 64
    ;;
esac
