#!/usr/bin/env bash
# Intentions: build the app and publish it to the folder nginx serves it from, on the server. Run from
# anywhere; it works on the checkout it lives in.
#
#   scripts/deploy.sh [web root]        # default: /var/www/app.biveit.com
#
# The build's settings (VITE_*) are baked in at build time, from the committed .env.prod (`--mode prod`; Vite reads
# it on top of .env, plus a server-only .env.prod.local if there is one). Without an API URL there the build would
# fall back to .env's local-dev one (a localhost API...) and the site would quietly break -- so no API URL, no build.
# nginx serves the new files right away: no restart. People with the app open get it on their next load.
set -euo pipefail
cd "$(dirname "$0")/.."

web_root="${1:-/var/www/app.biveit.com}"

if ! grep -qE '^VITE_API_BASE_URL=.+' .env.prod .env.prod.local 2>/dev/null; then
    echo "no VITE_API_BASE_URL in .env.prod (or .env.prod.local): the build would use the local-dev one. Refusing." >&2
    exit 1
fi
# rsync --delete empties the target first: only ever into an existing folder that isn't / or empty.
if [[ -z "$web_root" || "$web_root" == "/" || ! -d "$web_root" ]]; then
    echo "web root '$web_root' isn't an existing folder" >&2
    exit 1
fi

npm ci
npm run build -- --mode prod
# Trailing slashes: dist's CONTENTS go into the web root. --delete drops files from older builds (old hashed
# assets included).
rsync -a --delete dist/ "$web_root/"
echo "deployed to $web_root"
