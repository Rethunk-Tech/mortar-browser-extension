# Mortar browser extension

Plain-JS Manifest V3 extension; no bundler or transpile step; `bun run build` only packages it. Every content script shares one scope (see `scripts.test.js`), so top-level names are `mortar`-prefixed globals.

## Layout

- `manifest.json`: scripts, permissions, the Chromium `key` and the Firefox id. Mortar's `internal/nativehost` allows these ids.
- `background.js`: the one native port to Mortar (`tech.rethunk.mortar`); stamps `protocol` on every message; closes an idle port after 60 seconds; alarm `updates` every 30 minutes.
- `plural.js`: shared copy and connection state, including the protocol range check.
- `thunderstore.js`: the Thunderstore package-page content script (installed marks and install buttons).
- `content.js` and its helpers: Nexus page marks, menu and mod panel. `popup.*`: the toolbar popup. `options.*`: the options page (sites, markings, connection); `settings.js` holds the `chrome.storage.sync` keys (`siteNexus`, `siteThunderstore`, `markInstalled`, `markUpdate`, `markObsolete`, `markBroken`), their defaults and the mapping from `markInstalled` gray to listing highlight mode, shared by the page and the content scripts. Session keys `updatesReply` and `updatesError` are written by the background script.
- `docs/store/`: Chrome Web Store listing copy. Firefox is self-distributed: AMO signs it unlisted and never lists or updates it.

## Tests

`bun run gate` (biome, `bun test`, web-ext lint); CI and the pre-push hook run the same command.

## Release

Bump `version` in `manifest.json`, commit, tag `vX.Y.Z`. `release.yml` checks the tag matches, builds both zips and signs the unlisted `.xpi`. GitHub secrets `AMO_JWT_ISSUER`/`AMO_JWT_SECRET` are mapped to `WEB_EXT_API_KEY`/`WEB_EXT_API_SECRET` for `bun scripts/amo-signed.mjs <addon id> <version> <out.xpi>` (AMO signs each version once; a rerun fetches that copy) and, when AMO has no file yet, `web-ext sign --source-dir dist/firefox --channel unlisted`. It writes `updates.json`, which the manifest's `gecko.update_url` reads from the latest release. A protocol change bumps `protocol` here and in Mortar's `internal/nativehost` together, with each side's accepted range.

## Chrome Web Store

The developer dashboard cannot be automated: Chrome refuses every extension action on `chrome.google.com/webstore` ("The extensions gallery cannot be scripted"), signed in or not, and the Web Store API only uploads to and publishes an existing item. Listing, privacy and new-item work go to the maintainer as a paste guide built from `docs/store/chrome-web-store.md` plus the release zip.

## Gate budget

`bun run gate` is the `lint`, `test`, `webext` and `knip` scripts in `package.json` (`biome check --error-on-warnings .`, `bun test`, then `build` and `web-ext lint --source-dir dist/firefox`, then `knip --treat-config-hints-as-errors`), each run even if an earlier one fails, with a non-zero exit if any failed. Lefthook's pre-push job and CI's Gate step run that script. There is no `.gate.toml` and no `gate --profile`.
