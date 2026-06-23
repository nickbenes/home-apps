#!/bin/bash
# Rebuilds all frontend bundles and restarts home-apps services.
# Used as the post-merge git hook (via symlink from .git/hooks/post-merge).
# Can also be run directly for a manual deploy.
set -euo pipefail

# When invoked as a git hook, only deploy on main.
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "unknown" ]; then
  exit 0
fi

REPO=$(git rev-parse --show-toplevel)

cd "$REPO"

echo "[CD] Building finance…"
npm run finance:build

echo "[CD] Building food…"
npm run food:build

echo "[CD] Building dashboard (also covers todos' shared esbuild bundle)…"
npm run build

echo "[CD] Restarting services…"
systemctl --user restart finance food todos dashboard

echo "[CD] Deploy complete:"
for svc in finance food todos dashboard; do
  echo "  $svc: $(systemctl --user show "$svc" --property=ActiveState --value)"
done
