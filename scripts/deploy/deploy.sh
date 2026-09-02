#!/usr/bin/env bash
# scripts/deploy/deploy.sh
#
# Runs ON THE SERVER, from inside a freshly-cloned release directory
# (i.e. this script's own $(dirname) is the new release). Builds the new
# release, health-checks it on a temporary port, and only if that passes
# does it atomically flip the "current" symlink and reload PM2. If
# anything fails before the symlink flip, "current" is never touched —
# the live site keeps serving the previous release untouched.
#
# Required environment (exported by the caller — see
# .github/workflows/deploy.yml):
#   APP_ROOT        e.g. /home/linknsmile.com
#   NODE_BIN_DIR    absolute path to the node/npm/pm2 bin dir (nvm-installed
#                   Node isn't on PATH in a non-interactive SSH session)
# Optional:
#   PORT                 default 3004
#   HEALTH_CHECK_PORT    default 3999
#   RELEASES_TO_KEEP     default 5

set -euo pipefail

: "${APP_ROOT:?APP_ROOT must be set}"
: "${NODE_BIN_DIR:?NODE_BIN_DIR must be set}"
PORT="${PORT:-3004}"
HEALTH_CHECK_PORT="${HEALTH_CHECK_PORT:-3999}"
RELEASES_TO_KEEP="${RELEASES_TO_KEEP:-5}"

RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE_NAME="$(basename "$RELEASE_DIR")"
RELEASES_DIR="$APP_ROOT/releases"
SHARED_DIR="$APP_ROOT/shared"
CURRENT_LINK="$APP_ROOT/current"
LOCK_FILE="$APP_ROOT/.deploy.lock"

export PATH="$NODE_BIN_DIR:$PATH"

# shellcheck source=lib/health-check.sh
source "$RELEASE_DIR/scripts/deploy/lib/health-check.sh"

echo "=== Deploying release $RELEASE_NAME from $RELEASE_DIR ==="

# Serialize deploys/rollbacks so two runs can never race on the same
# symlink or the same health-check port.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deploy or rollback is already in progress. Aborting."
  exit 1
fi

mkdir -p "$RELEASES_DIR" "$SHARED_DIR/logs"

if [ ! -f "$SHARED_DIR/.env" ]; then
  echo "✗ $SHARED_DIR/.env does not exist. Create it once (see DEPLOYMENT.md initial setup) before the first deploy."
  exit 1
fi

echo "→ Linking shared .env and logs into the release"
ln -sfn "$SHARED_DIR/.env" "$RELEASE_DIR/.env.local"
ln -sfn "$SHARED_DIR/logs" "$RELEASE_DIR/logs"

echo "→ Installing dependencies"
npm ci

echo "→ Building"
npm run build

echo "→ Health-checking the new build on a temporary port before it goes live"
HEALTH_LOG="$SHARED_DIR/logs/health-check-$RELEASE_NAME.log"
if ! run_health_check "$RELEASE_DIR" "$HEALTH_CHECK_PORT" "$HEALTH_LOG"; then
  echo "✗ Health check failed. Leaving 'current' untouched — the live site is unaffected."
  echo "  Full log: $HEALTH_LOG"
  exit 1
fi

echo "→ Health check passed. Atomically switching 'current' to $RELEASE_NAME"
ln -sfn "$RELEASE_DIR" "$APP_ROOT/current.tmp"
mv -Tf "$APP_ROOT/current.tmp" "$CURRENT_LINK"

echo "→ Reloading PM2 (zero-downtime rolling restart in cluster mode)"
"$NODE_BIN_DIR/pm2" startOrReload "$CURRENT_LINK/ecosystem.config.js" --update-env
"$NODE_BIN_DIR/pm2" save



echo "→ Confirming the live process is actually serving after reload"
attempt=1
until curl -sf -o /dev/null "http://127.0.0.1:${PORT}/api/health"; do
  if [ "$attempt" -ge 15 ]; then
    echo "✗ Live process did not become healthy after reload. Investigate immediately —"
    echo "  'current' now points at $RELEASE_NAME but PM2 may not be serving it correctly."
    echo "  Run the Rollback workflow to revert to the previous release."
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done
echo "✓ Live process confirmed healthy on port $PORT"

echo "→ Pruning old releases (keeping the last $RELEASES_TO_KEEP)"
# Release dirs are named YYYYMMDDHHMMSS, so a reverse lexicographic sort
# is newest-first and doesn't depend on filesystem mtimes (which rm/mv
# operations elsewhere in releases/ could otherwise disturb).
mapfile -t all_releases < <(cd "$RELEASES_DIR" && ls -1d */ 2>/dev/null | sed 's#/$##' | sort -r)
if [ "${#all_releases[@]}" -gt "$RELEASES_TO_KEEP" ]; then
  for old in "${all_releases[@]:$RELEASES_TO_KEEP}"; do
    echo "  removing releases/$old"
    rm -rf "${RELEASES_DIR:?}/${old:?}"
  done
fi

echo "=== Deploy complete: $RELEASE_NAME is now live ==="
