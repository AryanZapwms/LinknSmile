#!/usr/bin/env bash
# scripts/deploy/rollback.sh
#
# Runs ON THE SERVER from inside the *currently live* release
# (i.e. $APP_ROOT/current/scripts/deploy/rollback.sh), which is why it
# works even though rollback ships no new commit of its own — it's
# reusing whatever code is already live to drive the switch.
#
# Rolls back to an already-deployed, already-built release: no npm ci,
# no build, just health-check the existing artifacts and flip the
# symlink. That's what makes it fast (seconds, not minutes).
#
# Usage: rollback.sh [target_release_name]
#   With no argument, rolls back to the most recent release that isn't
#   the one currently live.
#
# Required environment (same as deploy.sh):
#   APP_ROOT, NODE_BIN_DIR
# Optional:
#   PORT (default 3004), HEALTH_CHECK_PORT (default 3999)

set -euo pipefail

: "${APP_ROOT:?APP_ROOT must be set}"
: "${NODE_BIN_DIR:?NODE_BIN_DIR must be set}"
PORT="${PORT:-3004}"
HEALTH_CHECK_PORT="${HEALTH_CHECK_PORT:-3999}"

RELEASES_DIR="$APP_ROOT/releases"
SHARED_DIR="$APP_ROOT/shared"
CURRENT_LINK="$APP_ROOT/current"
LOCK_FILE="$APP_ROOT/.deploy.lock"
TARGET_ARG="${1:-}"

export PATH="$NODE_BIN_DIR:$PATH"

THIS_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/health-check.sh
source "$THIS_SCRIPT_DIR/lib/health-check.sh"

echo "=== Rollback ==="

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deploy or rollback is already in progress. Aborting."
  exit 1
fi

CURRENT_RELEASE=""
if [ -L "$CURRENT_LINK" ]; then
  CURRENT_RELEASE="$(basename "$(readlink -f "$CURRENT_LINK")")"
fi

echo "→ Currently live: ${CURRENT_RELEASE:-none}"
echo "→ Available releases (newest first):"
mapfile -t all_releases < <(cd "$RELEASES_DIR" && ls -1d */ 2>/dev/null | sed 's#/$##' | sort -r)
for r in "${all_releases[@]}"; do
  marker=""
  [ "$r" = "$CURRENT_RELEASE" ] && marker="  <- currently live"
  echo "    $r$marker"
done

if [ "${#all_releases[@]}" -eq 0 ]; then
  echo "✗ No releases found under $RELEASES_DIR"
  exit 1
fi

if [ -n "$TARGET_ARG" ]; then
  TARGET_RELEASE="$TARGET_ARG"
else
  TARGET_RELEASE=""
  for r in "${all_releases[@]}"; do
    if [ "$r" != "$CURRENT_RELEASE" ]; then
      TARGET_RELEASE="$r"
      break
    fi
  done
fi

if [ -z "$TARGET_RELEASE" ]; then
  echo "✗ Could not determine a target release to roll back to (no other release exists)."
  exit 1
fi

TARGET_DIR="$RELEASES_DIR/$TARGET_RELEASE"
if [ ! -d "$TARGET_DIR" ]; then
  echo "✗ Release '$TARGET_RELEASE' does not exist under $RELEASES_DIR"
  exit 1
fi
if [ ! -f "$TARGET_DIR/ecosystem.config.js" ] || [ ! -d "$TARGET_DIR/.next" ]; then
  echo "✗ '$TARGET_RELEASE' doesn't look like a complete built release (missing ecosystem.config.js or .next/). Refusing to roll back to it."
  exit 1
fi

if [ "$TARGET_RELEASE" = "$CURRENT_RELEASE" ]; then
  echo "→ Target release is already live. Nothing to do."
  exit 0
fi

echo "→ Rolling back to: $TARGET_RELEASE"

echo "→ Health-checking $TARGET_RELEASE on a temporary port before switching traffic"
HEALTH_LOG="$SHARED_DIR/logs/rollback-health-check-$TARGET_RELEASE-$(date +%s).log"
if ! run_health_check "$TARGET_DIR" "$HEALTH_CHECK_PORT" "$HEALTH_LOG"; then
  echo "✗ Health check failed for $TARGET_RELEASE. Leaving 'current' untouched."
  echo "  Full log: $HEALTH_LOG"
  exit 1
fi

echo "→ Health check passed. Atomically switching 'current' to $TARGET_RELEASE"
ln -sfn "$TARGET_DIR" "$APP_ROOT/current.tmp"
mv -Tf "$APP_ROOT/current.tmp" "$CURRENT_LINK"

echo "→ Reloading PM2"
"$NODE_BIN_DIR/pm2" startOrReload "$CURRENT_LINK/ecosystem.config.js" --update-env
"$NODE_BIN_DIR/pm2" save

echo "→ Confirming the live process is actually serving after reload"
attempt=1
until curl -sf -o /dev/null "http://127.0.0.1:${PORT}/api/health"; do
  if [ "$attempt" -ge 15 ]; then
    echo "✗ Live process did not become healthy after reload. Investigate immediately."
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done

echo "✓ Rollback complete: $TARGET_RELEASE is now live (was: ${CURRENT_RELEASE:-none})"
