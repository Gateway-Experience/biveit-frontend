#!/usr/bin/env bash
# Intentions: build the app and publish it to the folder nginx serves it from, on the server. Run from
# anywhere; it works on the checkout it lives in.
#
#   scripts/deploy.sh [web root]        # default: /var/www/app.biveit.com
#
# The build's settings (VITE_*) are baked in at build time, from .env.production -- which is gitignored and
# lives only on the server. Without it Vite would fall back to the committed .env, whose values are for
# local dev (a localhost API...), and the site would quietly break -- so no .env.production, no build.
# nginx serves the new files right away: no restart. People with the app open get it on their next load.
set -euo pipefail
cd "$(dirname "$0")/.."

web_root="${1:-/var/www/app.biveit.com}"

if [[ ! -f .env.production ]]; then
    echo "no .env.production here: the build would use the local-dev .env (e.g. a localhost API). Refusing." >&2
    exit 1
fi
# rsync --delete empties the target first: only ever into an existing folder that isn't / or empty.
if [[ -z "$web_root" || "$web_root" == "/" || ! -d "$web_root" ]]; then
    echo "web root '$web_root' isn't an existing folder" >&2
    exit 1
fi

npm ci
npm run build
# Trailing slashes: dist's CONTENTS go into the web root. --delete drops files from older builds (old hashed
# assets included).
rsync -a --delete dist/ "$web_root/"
echo "deployed to $web_root"
