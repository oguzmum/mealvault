#!/usr/bin/env bash

set -euo pipefail

if [ ! -x backend/.venv/bin/uvicorn ]; then
  echo "backend/.venv is missing. Set it up first:"
  echo "  cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt"
  exit 1
fi

if [ ! -d frontend/node_modules ]; then
  echo "frontend/node_modules is missing. Set it up first:"
  echo "  cd frontend && npm install"
  exit 1
fi

echo "==> Starting postgres (docker)"
docker compose up -d postgres

echo "==> Waiting for postgres to be ready"
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-mealvault}" >/dev/null 2>&1; do
  sleep 5
done

echo "==> Running migrations"
(cd backend && .venv/bin/alembic upgrade head)

echo "==> Starting backend on http://localhost:8000 (reload on change)"
(cd backend && .venv/bin/python3 -m app.cli && exec .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!

echo "==> Starting frontend on http://localhost:5173 (reload on change)"
(cd frontend && exec npm run dev -- --host) &
FRONTEND_PID=$!

cleanup() {
  echo
  echo "==> Stopping backend and frontend (postgres keeps running, see scripts/dev-stop.sh)"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait
