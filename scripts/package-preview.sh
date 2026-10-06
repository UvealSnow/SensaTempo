#!/usr/bin/env bash
# Builds the SSR preview and packages it as a Lambda zip (Node 24, arm64, glibc).
# The Lambda Web Adapter layer runs run.sh and proxies requests to the Node server.
#
# Usage: scripts/package-preview.sh [output.zip]
# Needs STORYBLOK_PREVIEW_TOKEN and PUBLIC_* language vars in the env or .env.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="${1:-$ROOT/preview-lambda.zip}"
[[ "$OUT" = /* ]] || OUT="$PWD/$OUT"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

cd "$ROOT"
PUBLIC_BUILD_TYPE=server NODE_ENV=production pnpm build

cp -R dist "$STAGE/dist"
node scripts/lambda-package-json.mjs dist/server "$STAGE/package.json"

# Install for the Lambda platform (linux arm64 glibc) whatever machine we're on
(cd "$STAGE" && npm install --omit=dev --no-package-lock --os=linux --cpu=arm64 --libc=glibc --no-audit --no-fund >/dev/null)
# sharp's WASM fallback is unused next to the native linux-arm64 binary
rm -rf "$STAGE/node_modules/@img/sharp-wasm32"

printf '#!/bin/sh\nexec node dist/server/entry.mjs\n' > "$STAGE/run.sh"
chmod +x "$STAGE/run.sh"

rm -f "$OUT"
(cd "$STAGE" && zip -qr "$OUT" run.sh dist node_modules package.json)
echo "Packaged $OUT ($(du -h "$OUT" | cut -f1) zipped, $(du -sh "$STAGE" | cut -f1) unzipped)"
