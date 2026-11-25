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
WATCH_LOG="$(mktemp "${TMPDIR:-/tmp}/vsfour-watch.XXXXXX")"
set -m
pnpm run watch > >(tee -a "$WATCH_LOG") 2>&1 &
WATCH_PID=$!
set +m
trap 'kill -- -"${WATCH_PID}" 2>/dev/null || true; rm -f "$WATCH_LOG"' EXIT

# 3. The transpile watcher deletes out/ and rebuilds it. out/main.js from a
# previous run is not a finished build. Wait until this watcher prints that
# its initial transpile completed, then require the workbench entry to exist.
echo "Waiting for the watcher to finish its initial transpile..."
READY=0
for _ in $(seq 1 180); do
	if grep -q "Finished transpilation with 0 errors" "$WATCH_LOG"; then
		READY=1
		break
	fi
	if grep -q "Finished transpilation with 1 errors" "$WATCH_LOG"; then
		echo "Initial transpile failed. Check the watcher output above." >&2
		exit 1
	fi
	if ! kill -0 "$WATCH_PID" 2>/dev/null; then
		echo "Watcher exited before the initial transpile finished." >&2
		exit 1
	fi
	sleep 1
done
if [ "$READY" -ne 1 ]; then
	echo "Timed out waiting for the initial transpile. Check the watcher output above." >&2
	exit 1
fi
if [ ! -f "$ROOT/out/vs/workbench/workbench.desktop.main.js" ]; then
	echo "Initial transpile finished but out/vs/workbench/workbench.desktop.main.js is missing." >&2
	exit 1
fi

# 4. Launch the app in the foreground. Blocks until the app is closed, then the
#    EXIT trap above stops the watcher. No `exec` so the trap still runs.
./scripts/code.sh "$@"
