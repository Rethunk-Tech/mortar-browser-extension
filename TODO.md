# TODO

Work that is decided but not built. `AGENTS.md` and `docs/` describe what
exists; this file is the only place that describes what does not.

Sections are unordered.

## Update rows are Nexus file links only

Measured-not-worth: Mortar protocol 2 `updates` rows are
`{modId, name, installed, latest}` from `activeNexusUpdates`. They have no
`community` or `namespace`. Thunderstore is `installedPackages` /
`installPackage`, not `updates`. No thunderstore.io URL template added;
Nexus files-tab hrefs stay as they are.

## 0.4.0: UX overhaul to match the redesigned website

Decided 2026-10-21 (maintainer): one Mortar look everywhere, sized to sit inside each site's layout.

- Popup and options page take the website's tokens (`mortar/web/src/styles/site.css`: `--bg`, `--raised`, `--raised2`, `--sand`, `--sand-ink`, `--line`, `--dim`) and bundle Atkinson Hyperlegible Next 400 and 700 woff2 (about 25 KB, OFL; credit it).
- In-page elements on Nexus, Thunderstore, CurseForge and the Mod DB (marks, the Mortar panel and menu, filter boxes, Install in Mortar buttons) share one set of Mortar badges and buttons with the sand accent and the Mortar mark, in the host page's font and spacing.
- Version 0.4.0; the native-messaging protocol stays unless a new message is needed.
- Then refresh `docs/store/chrome-web-store.md` screenshots and the promo tile.
