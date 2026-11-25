#!/usr/bin/env bash
# One-step local dev run.
#
#   pnpm run run-dev        (or: ./scripts/run-dev.sh)
#
# Does everything the manual flow did, in a single terminal:
#   1. Switches to the Node version pinned in .nvmrc (via nvm)
#   2. Starts `pnpm run watch` in the background
#   3. Waits for the initial compile, then launches the app in the foreground
#
# Closing the app stops the watcher and exits. Any extra args are passed
# through to scripts/code.sh (e.g. --builtin, --extensionTestsPath=...).
set -euo pipefail

# Repo root (this script lives in scripts/)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 1. Use the Node version from .nvmrc. nvm is a shell function, so source it.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
	# shellcheck disable=SC1091
	. "$NVM_DIR/nvm.sh"
	nvm use --silent
else
	echo "nvm not found at $NVM_DIR/nvm.sh — install nvm or set NVM_DIR." >&2
	exit 1
fi

# 2. Start the watcher in its own process group so the whole tree
#    (pnpm -> npm-run-all2 -> individual watchers) can be killed at once.
set -m
pnpm run watch &
WATCH_PID=$!
set +m
trap 'kill -- -"${WATCH_PID}" 2>/dev/null || true' EXIT

# 3. Wait for the initial compile to produce out/main.js before launching.
echo "Waiting for initial compile (out/main.js)..."
for _ in $(seq 1 120); do
	[ -f "$ROOT/out/main.js" ] && break
	sleep 5
done
if [ ! -f "$ROOT/out/main.js" ]; then
	echo "Timed out waiting for out/main.js. Check the watcher output above." >&2
	exit 1
fi

# 4. Launch the app in the foreground. Blocks until the app is closed, then the
#    EXIT trap above stops the watcher. No `exec` so the trap still runs.
./scripts/code.sh "$@"
