#!/bin/bash
# Wrapper for the systemd service — sets up nvm PATH before starting.
# If you upgrade Node via nvm, update the path below to match.
export PATH=/home/nickbenes/.nvm/versions/node/v24.15.0/bin:$PATH
cd /home/nickbenes/dev/home-apps

# Build the frontend bundle (idempotent — safe to run on every start)
npm run finance:build

# Start the server; exec replaces the shell so systemd tracks the right PID
exec npm run finance:dev
