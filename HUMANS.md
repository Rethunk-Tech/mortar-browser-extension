# Mortar browser extension: install and develop

## Requirements

The Mortar desktop app must be installed on the same computer and opened once: it registers the native messaging host `tech.rethunk.mortar` that the extension talks to. Firefox 140 or later (142 or later on Android). Without Mortar the popup and options page say "Mortar isn't installed"; Nexus pages are left as Nexus drew them; Thunderstore package pages show how to connect and do not install.

## Install

Each release at <https://github.com/Rethunk-Tech/mortar-browser-extension/releases/latest> carries:

- `mortar-browser-extension.xpi`: Firefox. Open the file in Firefox to install the signed add-on. It is distributed here rather than on addons.mozilla.org, and Firefox updates it from the latest release's `updates.json`.
- `mortar-browser-extension.zip`: Chrome, Edge or another Chromium browser. Unzip it, open `chrome://extensions`, turn on Developer mode and choose **Load unpacked** on the unzipped folder.
- `mortar-browser-extension-chrome-web-store.zip`: the same files without the manifest `key`, for the Chrome Web Store upload.

## Protocol

The extension and Mortar exchange JSON messages over native messaging. Every message the extension sends carries `protocol` (this extension's protocol number), and every Mortar reply carries Mortar's own `protocol`. Each side accepts a range of the other's numbers:

- Mortar refuses a message whose protocol is outside its range and replies `protocolError: "extensionTooOld"` or `"extensionTooNew"`; its Settings › Downloads connection row says the extension is too old or too new for this Mortar.
- The extension checks Mortar's `protocol` against its own range and shows "Update Mortar" or "Update the browser extension" in its popup and on Nexus pages.

Both sides speak protocol 2 and accept 2..2; a message or reply without `protocol` counts as 0. A change to a message's shape bumps the number on both sides.

Native messages the extension sends (each also carries `protocol`):

- `{ "type": "installed", "source": "nexus", "sourceGameKey": "<nexus domain>" }`
- `{ "type": "mod", "source": "nexus", "sourceGameKey": "<nexus domain>", "modId": <positive integer> }`
- `{ "type": "updates", "source": "nexus", "sourceGameKey": "<nexus domain>" }`
- `{ "type": "installedPackages", "source": "thunderstore", "sourceGameKey": "<community>" }`
- `{ "type": "installPackage", "source": "thunderstore", "sourceGameKey": "<community>", "package": "<Namespace-Name>" }`
- `{ "link": "<nxm:// or https:// URL>", "close": true }` — `close` is optional; when true the tab is closed after Mortar accepts the link. Other schemes are not forwarded.

The popup's Check now button is not a native message: it sends `{ "type": "checkNow" }` to the background script, which then asks `updates` as above.

Every reply's `games` lists what Mortar manages, `[{id, name, sources: {nexus: "<domain>", thunderstore: "<community>"}}]`; the extension draws its Nexus UI only on domains in that list and builds `mortar://<game id>/mod/<id>` from the matching `id`. Thunderstore package pages use `sources.thunderstore` as the community key.

## Getting started

Needs `bun`, plus `lefthook` and `gitleaks` on PATH for the git hooks (`lefthook install` once; pre-commit scans staged changes for secrets, pre-push runs the gate).

```sh
bun install
bun run lint     # biome check --error-on-warnings .
bun run test     # bun test
bun run webext   # build, then web-ext lint --source-dir dist/firefox
bun run gate     # lint, test and webext; non-zero if any failed
bun run build    # dist/mortar-browser-extension.zip, and dist/firefox (the Firefox manifest web-ext lints and signs)
```

Load the repo folder unpacked in Chrome, or with `about:debugging` in Firefox, to try a change. The manifest `key` pins the unpacked Chromium id that Mortar's native host allows.

A release rerun fetches an already-signed Firefox add-on with:

```sh
# WEB_EXT_API_KEY and WEB_EXT_API_SECRET must be set (CI maps GitHub secrets AMO_JWT_ISSUER / AMO_JWT_SECRET to these).
bun scripts/amo-signed.mjs <addon id> <version> <out.xpi>
```

Writes nothing when AMO has no public file for that version.

## Options

The options page (Sites, Markings on mod lists, Connection to Mortar) stores these keys in `chrome.storage.sync`. A missing or unreadable value uses the default.

| Key | Default | Values |
| --- | --- | --- |
| `siteNexus` | `true` | Sites: Nexus Mods |
| `siteThunderstore` | `true` | Sites: Thunderstore package pages |
| `markInstalled` | `"gray"` | Off, Gray out, Hide (`off` / `gray` / `hide`) |
| `markUpdate` | `"on"` | Off or Show badge (`off` / `on`) |
| `markObsolete` | `"off"` | Off, Gray out, Hide |
| `markBroken` | `"off"` | Off, Gray out, Hide |

Gray out on the installed row is the listing "highlight" mode (outline plus dim). Listing sidebar checkboxes only switch a row between Gray out and Off; Hide is set on the options page. The last update check is kept in `chrome.storage.session` (`updatesReply`, `updatesError`) so the popup and badge can paint without a new native request. The background alarm named `updates` runs every 30 minutes. An idle native port is closed after 60 seconds.
