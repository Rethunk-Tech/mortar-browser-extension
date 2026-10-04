# Mortar browser extension

Plain-JS Manifest V3 extension; no build step. Every content script shares one scope (see `scripts.test.js`), so top-level names are `mortar`-prefixed globals.

## Layout

- `manifest.json`: scripts, permissions, the Chromium `key` and the Firefox id. Mortar's `internal/nativehost` allows these ids.
- `background.js`: the one native port to Mortar (`tech.rethunk.mortar`); stamps `protocol` on every message.
- `plural.js`: shared copy and connection state, including the protocol range check.
- `content.js` and its helpers: Nexus page marks, menu and mod panel. `popup.*`: the toolbar popup.
- `docs/store/`: Chrome Web Store and AMO listing copy.

## Tests

`bun run gate` (biome, `bun test`) and `bun run webext` (web-ext lint). CI runs the same.

## Release

Bump `version` in `manifest.json`, commit, tag `vX.Y.Z`. `release.yml` checks the tag matches, builds both zips and signs the unlisted `.xpi` with `AMO_JWT_ISSUER`/`AMO_JWT_SECRET`; AMO signs each version once. A protocol change bumps `protocol` here and in Mortar's `internal/nativehost` together, with each side's accepted range.
