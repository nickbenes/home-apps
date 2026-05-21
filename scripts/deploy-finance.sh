#!/bin/bash
# Called by the post-merge git hook when main is updated.
# Rebuilds the frontend bundle and restarts the user service (no sudo needed).
set -euo pipefail

REPO=/home/nickbenes/dev/bills-tracker

echo "[CD] Building benes-finance…"
cd "$REPO"
npm run finance:build

echo "[CD] Restarting benes-finance service…"
systemctl --user restart benes-finance

echo "[CD] Deploy complete — $(systemctl --user show benes-finance --property=ActiveState)"
