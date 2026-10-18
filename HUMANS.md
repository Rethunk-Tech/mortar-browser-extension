# Mortar browser extension: install and develop

## Requirements

Mortar on the same computer, opened once (registers `tech.rethunk.mortar`). Firefox 140+ (142+ on Android). Without Mortar: popup/options say "Mortar isn't installed"; Nexus stays as Nexus drew it; Thunderstore package pages hint and do not install.

## Install

<https://github.com/Rethunk-Tech/mortar-browser-extension/releases/latest>

- `mortar-browser-extension.xpi` — open in Firefox. Not on AMO; updates from the latest release's `updates.json`.
- `mortar-browser-extension.zip` — Chromium Load unpacked (Developer mode).
- `mortar-browser-extension-chrome-web-store.zip` — no manifest `key`, for the Web Store.

## Protocol

JSON native messaging. Outbound carries this `protocol`; replies carry Mortar's. Out of range: Mortar `protocolError` `extensionTooOld` / `extensionTooNew`; here, "Update Mortar" / "Update the browser extension". Both speak 2, accept 2..2; missing `protocol` is 0. Shape change bumps both sides.

- `{ "type": "installed", "source": "nexus", "sourceGameKey": "<nexus domain>" }`
- `{ "type": "mod", "source": "nexus", "sourceGameKey": "<nexus domain>", "modId": <positive integer> }`
- `{ "type": "updates", "source": "nexus", "sourceGameKey": "<nexus domain>" }`
- `{ "type": "installedPackages", "source": "thunderstore", "sourceGameKey": "<community>" }`
- `{ "type": "installPackage", "source": "thunderstore", "sourceGameKey": "<community>", "package": "<Namespace-Name>" }`
- `{ "link": "<nxm:// or https:// URL>", "close": true }` — `close` optional; true closes the tab after accept. Other schemes are not forwarded.

Popup Check now is `{ "type": "checkNow" }` to the background script, which then sends `updates`. Reply `games`: `[{id, name, sources: {nexus: "<domain>", thunderstore: "<community>"}}]`. Nexus UI only on listed domains; `mortar://<game id>/mod/<id>` uses that `id`. Thunderstore community key is `sources.thunderstore`.

## Getting started

`bun`, `lefthook` and `gitleaks` on PATH (`lefthook install` once).

```sh
bun install && bun run gate
```

Load the repo unpacked in Chrome or `about:debugging` in Firefox. The manifest `key` pins the unpacked Chromium id Mortar allows.

```sh
# WEB_EXT_API_KEY / WEB_EXT_API_SECRET (CI: AMO_JWT_ISSUER / AMO_JWT_SECRET)
bun scripts/amo-signed.mjs <addon id> <version> <out.xpi>
```

No write when AMO has no public file for that version.

## Options

Keys and defaults: `settings.js`. Listing sidebar checkboxes are Gray out vs Off only; Hide is options-only. `markInstalled` gray is listing highlight (outline plus dim).
