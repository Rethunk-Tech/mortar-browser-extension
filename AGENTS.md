# Mortar browser extension

Plain-JS Manifest V3; `bun run build` only packages. Content scripts share one scope (`scripts.test.js`): top-level names are `mortar`-prefixed globals.

`manifest.json`: Chromium `key` and Firefox id (Mortar `internal/nativehost` allows both). `background.js`: one port `tech.rethunk.mortar`, stamps `protocol`, idle close 60s, alarm `updates` every 30m. Shared copy and range check: `plural.js`. Thunderstore package pages: `thunderstore.js`. CurseForge and Mod DB: `projectSites.js`. Listing filter box (not Nexus): `filterBox.js`. Nexus: `content.js` and helpers. Storage keys: `settings.js`. Firefox is self-distributed (AMO unlisted, no listing or AMO updates). Chrome paste guide: `docs/store/`.

Release: bump `version` in `manifest.json`, tag `vX.Y.Z`. A protocol change bumps `protocol` here and in Mortar's `internal/nativehost` together. `release.yml` writes `updates.json` (`gecko.update_url`) and signs the unlisted `.xpi` with `scripts/amo-signed.mjs` (AMO signs each version once). Chrome Web Store dashboard cannot be scripted; paste `docs/store/chrome-web-store.md` plus the release zip.

`bun run gate` runs `lint`, `test`, `webext` and `knip` from `package.json`, each even if an earlier one fails. Lefthook pre-push and CI. No `.gate.toml`, no `gate --profile`.
