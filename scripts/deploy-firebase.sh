#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
stage=$(mktemp -d)
mkdir -p "$stage/public/house-tasks-site"
for entry in assets app-config.json favicon.svg index.html whiteboards.html manifest.webmanifest sw.js; do
  cp -R "$root/$entry" "$stage/public/house-tasks-site/"
done
cat > "$stage/firebase.json" <<'CONFIG'
{
  "hosting": {
    "site": "house-task-327d6",
    "public": "public",
    "redirects": [{ "source": "/", "destination": "/house-tasks-site/", "type": 302 }],
    "headers": [{
      "source": "/house-tasks-site/**",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }]
  }
}
CONFIG
cd "$stage"
firebase deploy --only hosting --project house-task-327d6
