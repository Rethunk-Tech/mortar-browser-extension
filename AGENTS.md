# Mortar browser extension

Plain-JS Manifest V3 extension; no bundler or transpile step; `bun run build` only packages it. Every content script shares one scope (see `scripts.test.js`), so top-level names are `mortar`-prefixed globals.

## Layout

- `manifest.json`: scripts, permissions, the Chromium `key` and the Firefox id. Mortar's `internal/nativehost` allows these ids.
- `background.js`: the one native port to Mortar (`tech.rethunk.mortar`); stamps `protocol` on every message.
- `plural.js`: shared copy and connection state, including the protocol range check.
- `thunderstore.js`: the Thunderstore package-page content script (installed marks and install buttons).
- `content.js` and its helpers: Nexus page marks, menu and mod panel. `popup.*`: the toolbar popup. `options.*`: the options page (sites, markings, connection); `settings.js` holds the `chrome.storage.sync` keys, their defaults and the mapping to the listing mode, shared by the page and the content scripts.
- `docs/store/`: Chrome Web Store listing copy. Firefox is self-distributed: AMO signs it unlisted and never lists or updates it.

## Tests

`bun run gate` (biome, `bun test`, web-ext lint); CI and the pre-push hook run the same command.

## Release

Bump `version` in `manifest.json`, commit, tag `vX.Y.Z`. `release.yml` checks the tag matches, builds both zips and signs the unlisted `.xpi` with `AMO_JWT_ISSUER`/`AMO_JWT_SECRET` (AMO signs each version once; a rerun fetches that copy with `scripts/amo-signed.mjs`) and writes `updates.json`, which the manifest's `gecko.update_url` reads from the latest release. A protocol change bumps `protocol` here and in Mortar's `internal/nativehost` together, with each side's accepted range.

## Chrome Web Store

The developer dashboard cannot be automated: Chrome refuses every extension action on `chrome.google.com/webstore` ("The extensions gallery cannot be scripted"), signed in or not, and the Web Store API only uploads to and publishes an existing item. Listing, privacy and new-item work go to the maintainer as a paste guide built from `docs/store/chrome-web-store.md` plus the release zip.

## Gate budget

The detected gates match CI, which runs `bun run gate` (`lint`, `test`, then `build` and `web-ext lint` on `dist/firefox`); `gate` runs the build and web-ext lint chained and the rest concurrently. Measured 2026-10-09 with `gate --profile` at load 5 to 6 (CPU is the evidence): warm 0.85 to 0.94 s wall and 1.5 CPU-s; cold (a clone without `dist`, throwaway bun cache) 1.6 s wall and 2.4 CPU-s, 1.2 s of it `web-ext lint`. Within budget; nothing is duplicated or oversubscribed. `bunx` keeps its own download cache outside `BUN_INSTALL_CACHE_DIR`, so the cold figure does not include fetching web-ext.
