#!/usr/bin/env bash
set -euo pipefail

# Basic post-deploy smoke tests for the Bills app hosting.
# Usage:
#   SMOKE_URL=https://your-site.web.app ./scripts/smoke/deploy-smoke.sh
# or use the default URL configured earlier.

URL="${SMOKE_URL:-https://bill-planner-c92b3.web.app}"

echo "Smoke test: using URL=$URL"

echo "- Checking root responds 200..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/")
if [ "$HTTP_CODE" -ne 200 ]; then
  echo "ERROR: root returned HTTP $HTTP_CODE" >&2
  exit 2
fi

echo "- Checking index.html contains expected markers..."
BODY=$(curl -s "$URL/")
echo "$BODY" | grep -q '<div id="root"' || { echo "ERROR: root div not found in index.html" >&2; exit 3; }
echo "$BODY" | grep -q 'script src="bundle.js"' || { echo "ERROR: bundle.js <script> tag not found in index.html" >&2; exit 4; }

echo "- Checking bundle.js is reachable and non-empty..."
BUNDLE_URL="$URL/bundle.js"
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
if ! curl -sSf -o "$TMPFILE" "$BUNDLE_URL"; then
  echo "ERROR: failed to fetch $BUNDLE_URL" >&2
  exit 5
fi
SIZE=$(wc -c < "$TMPFILE" | tr -d ' ')
if [ "$SIZE" -lt 50 ]; then
  echo "ERROR: bundle.js appears too small ($SIZE bytes)" >&2
  exit 6
fi

echo "All smoke checks passed. Bundle size: ${SIZE} bytes"
exit 0
