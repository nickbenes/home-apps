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

echo "[CD] Building finance…"
cd "$REPO"
npm run finance:build

echo "[CD] Restarting finance service…"
systemctl --user restart finance

echo "[CD] Deploy complete — $(systemctl --user show finance --property=ActiveState)"
