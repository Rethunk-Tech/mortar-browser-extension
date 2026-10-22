#!/bin/sh
# Builds dist/mortar-browser-extension.zip for Chromium browsers loaded unpacked, dist/mortar-browser-extension-chrome-web-store.zip
# for the Chrome Web Store and Edge Add-ons, and dist/firefox, the source web-ext lints and signs.
set -eu
cd "$(dirname "$0")/.."
bunx web-ext@10.8.0 build --artifacts-dir dist --filename mortar-browser-extension.zip
# web-ext packs every file web-ext-config.mjs does not ignore, so a new repo file would otherwise reach users unnoticed.
extra=$(unzip -Z1 dist/mortar-browser-extension.zip | grep -vE '^(LICENSE|manifest\.json|(popup|options)\.html|ui\.css|[A-Za-z]+\.js|icons/|icons/icon-(16|32|48|128)\.png|fonts/|fonts/atkinson-hyperlegible-next-latin-(400|700)-normal\.woff2|fonts/OFL\.txt)$' || true)
if [ -n "$extra" ]; then
  echo "unexpected files in the extension package: $extra" >&2
  exit 1
fi
rm -rf dist/firefox
mkdir -p dist/firefox
unzip -q dist/mortar-browser-extension.zip -d dist/firefox
# Firefox runs background.scripts and warns about service_worker, which Chrome requires.
jq 'del(.background.service_worker)' manifest.json >dist/firefox/manifest.json
# The Chrome Web Store assigns its own id and rejects an upload that carries the manifest key, which only pins the
# unpacked build's id.
store=$(mktemp -d)
trap 'rm -rf "$store"' EXIT
unzip -q dist/mortar-browser-extension.zip -d "$store"
jq 'del(.key)' manifest.json >"$store/manifest.json"
rm -f dist/mortar-browser-extension-chrome-web-store.zip
(cd "$store" && zip -q -r "$OLDPWD/dist/mortar-browser-extension-chrome-web-store.zip" .)
