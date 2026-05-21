#!/bin/bash
# Installs git hooks that point to version-controlled scripts.
# Safe to re-run — skips hooks that are already correctly linked.
set -euo pipefail

REPO=$(git rev-parse --show-toplevel)
HOOKS_DIR="$REPO/.git/hooks"

install_hook() {
  local name="$1"
  local target="$REPO/scripts/$2"
  local link="$HOOKS_DIR/$name"

  if [ -L "$link" ] && [ "$(readlink "$link")" = "$target" ]; then
    echo "  [skip] $name already linked"
  else
    ln -sf "$target" "$link"
    echo "  [ok]   $name → scripts/$2"
  fi
}

echo "Installing git hooks…"
install_hook post-merge deploy-finance.sh
echo "Done."
