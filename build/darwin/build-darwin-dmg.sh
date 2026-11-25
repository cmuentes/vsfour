#!/usr/bin/env bash
# Builds Semafour for macOS (arm64), ad-hoc signs it, and packages a DMG.
#
# Usage:
#   ./build/darwin/build-darwin-dmg.sh [outDir]
#
# Output:
#   <outDir>/Semafour-darwin-arm64.dmg   (default outDir: <repo>/out-dmg)
#
# The app is ad-hoc signed (codesign -s -), which is required to launch on
# Apple Silicon. The resulting DMG is for local/distribution use; it is not
# notarized.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${1:-$REPO_ROOT/out-dmg}"
APP_DIR="$REPO_ROOT/../VSCode-darwin-arm64"
APP_PATH="$APP_DIR/Semafour.app"

cd "$REPO_ROOT"

echo "==> Building Semafour.app (gulp vscode-darwin-arm64)"
npx pnpm run gulp vscode-darwin-arm64

echo "==> Ad-hoc signing $APP_PATH"
codesign --force --deep --sign - "$APP_PATH"
codesign --verify --deep --strict "$APP_PATH"

echo "==> Creating DMG in $OUT_DIR"
VSCODE_ARCH=arm64 VSCODE_QUALITY=stable \
  node --experimental-strip-types build/darwin/create-dmg.ts "$APP_DIR" "$OUT_DIR"

FINAL_DMG="$OUT_DIR/Semafour-darwin-arm64.dmg"
mv -f "$OUT_DIR/VSCode-darwin-arm64.dmg" "$FINAL_DMG"

echo "==> Done: $FINAL_DMG"
