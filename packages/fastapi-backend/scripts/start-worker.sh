#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PACKAGE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
VENV_PYTHON="$PACKAGE_DIR/.venv/bin/python"
DRAMATIQ_CMD="$PACKAGE_DIR/.venv/bin/dramatiq"

if [ ! -x "$DRAMATIQ_CMD" ] && [ -x "$VENV_PYTHON" ]; then
  exec "$VENV_PYTHON" -m dramatiq app.worker -p "${FASTAPI_DRAMATIQ_WORKER_PROCESSES:-1}" -t "${FASTAPI_DRAMATIQ_WORKER_THREADS:-2}"
fi

exec "$DRAMATIQ_CMD" app.worker -p "${FASTAPI_DRAMATIQ_WORKER_PROCESSES:-1}" -t "${FASTAPI_DRAMATIQ_WORKER_THREADS:-2}"
