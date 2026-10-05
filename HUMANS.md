# Mortar browser extension: install and develop

## Requirements

The Mortar desktop app must be installed on the same computer and opened once: it registers the native messaging host `tech.rethunk.mortar` that the extension talks to. Without it the extension says "Mortar isn't installed" and changes nothing on the page.

## Install

Each release at https://github.com/Rethunk-Tech/mortar-browser-extension/releases/latest carries:

- `mortar-browser-extension.xpi`: Firefox. Open the file in Firefox to install the signed add-on. It is distributed here rather than on addons.mozilla.org, and Firefox updates it from the latest release's `updates.json`.
- `mortar-browser-extension.zip`: Chrome, Edge or another Chromium browser. Unzip it, open `chrome://extensions`, turn on Developer mode and choose **Load unpacked** on the unzipped folder.
- `mortar-browser-extension-chrome-web-store.zip`: the same files without the manifest `key`, for the Chrome Web Store upload.

## Protocol

The extension and Mortar exchange JSON messages over native messaging. Every message the extension sends carries `protocol` (this extension's protocol number), and every Mortar reply carries Mortar's own `protocol`. Each side accepts a range of the other's numbers:

- Mortar refuses a message whose protocol is outside its range and replies `protocolError: "extensionTooOld"` or `"extensionTooNew"`; its Settings › Downloads connection row says the extension is too old or too new for this Mortar.
- The extension checks Mortar's `protocol` against its own range and shows "Update Mortar" or "Update the browser extension" in its popup and on Nexus pages.

Both sides speak protocol 2 and accept 2..2; a message or reply without `protocol` counts as 0. A change to a message's shape bumps the number on both sides.

Requests that concern a game name it by its source: `{"type": "installed", "source": "nexus", "sourceGameKey": "<nexus domain>"}`. Every reply's `games` lists what Mortar manages, `[{id, name, sources: {nexus: "<domain>"}}]`; the extension draws its UI only on pages whose domain is listed and builds `mortar://<game id>/mod/<id>` from the matching `id`.

## Getting started

Needs `bun`, plus `lefthook` and `gitleaks` on PATH for the git hooks (`lefthook install` once; pre-commit scans staged changes for secrets, pre-push runs the gate).

```sh
bun install
bun run gate     # biome, bun test, web-ext lint
bun run build    # dist/mortar-browser-extension.zip, and dist/firefox (the Firefox manifest web-ext lints and signs)
```

Load the repo folder unpacked in Chrome, or with `about:debugging` in Firefox, to try a change. The manifest `key` pins the unpacked Chromium id that Mortar's native host allows.
