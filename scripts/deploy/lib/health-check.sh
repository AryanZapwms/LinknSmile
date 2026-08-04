#!/usr/bin/env bash
# scripts/deploy/lib/health-check.sh
#
# Shared by deploy.sh and rollback.sh. Boots a Next.js build on a
# temporary local port, polls /api/health until it returns 200 (or gives
# up), then always kills the temporary process — regardless of the
# outcome — so it never leaks and never collides with the real port.
#
# Usage:
#   source scripts/deploy/lib/health-check.sh
#   run_health_check "<release_dir>" "<port>" "<log_file>"
# Returns 0 if healthy, 1 if not. Never touches the live "current" symlink
# or the live PM2 process — that decision is made by the caller based on
# this function's return code.

run_health_check() {
  local release_dir="$1"
  local port="$2"
  local log_file="$3"
  local max_attempts="${HEALTH_CHECK_ATTEMPTS:-30}"
  local sleep_seconds="${HEALTH_CHECK_INTERVAL:-1}"

  : "${NODE_BIN_DIR:?NODE_BIN_DIR must be set (absolute path to the node/npm/pm2 bin dir)}"

  mkdir -p "$(dirname "$log_file")"

  echo "→ Starting temporary instance from $release_dir on port $port for health check..."

  # Run detached so a failed/hung health check can't take the SSH session
  # down with it; PID is captured explicitly so cleanup is deterministic.
  (
    cd "$release_dir"
    export PATH="$NODE_BIN_DIR:$PATH"
    export PORT="$port"
    export NODE_ENV=production
    exec "$NODE_BIN_DIR/node" "$release_dir/node_modules/next/dist/bin/next" start -p "$port"
  ) >"$log_file" 2>&1 &
  local pid=$!

  # Always clean up the temp process, whether we succeed, fail, or the
  # script gets interrupted.
  # shellcheck disable=SC2317
  _health_check_cleanup() {
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  }
  trap _health_check_cleanup RETURN

  local attempt=1
  while [ "$attempt" -le "$max_attempts" ]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "✗ Temporary instance (pid $pid) exited before it became healthy. Last 50 log lines:"
      tail -n 50 "$log_file" || true
      return 1
    fi

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${port}/api/health" || echo "000")

    if [ "$http_code" = "200" ]; then
      echo "✓ Health check passed on attempt $attempt/$max_attempts (HTTP 200)"
      return 0
    fi

    echo "  attempt $attempt/$max_attempts: HTTP $http_code, retrying in ${sleep_seconds}s..."
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done

  echo "✗ Health check failed after $max_attempts attempts. Last 50 log lines from $log_file:"
  tail -n 50 "$log_file" || true
  return 1
}
