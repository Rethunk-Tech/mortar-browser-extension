# TODO

Work that is decided but not built. `AGENTS.md` and `docs/` describe what
exists; this file is the only place that describes what does not.

Sections are unordered.

## Thunderstore community listings have no installed marks

Nexus listings get outline, gray, hide, obsolete, broken and update badges
through `listingMarks.js` and the Mortar filter block in `hideInProfile.js`.
Thunderstore is wired only for package pages: `manifest.json` matches
`https://thunderstore.io/c/*/p/*`, and `thunderstore.js` paints a single
corner overlay. A community listing (`/c/<community>/`) has no marks, even
when the open profile already holds those packages. `installedPackages`
already returns `packages` as `Namespace-Name` ids.

Decided shape: a second Thunderstore content-script match for community
listings (and search, if the path is stable), a tile selector for that DOM,
and reuse of `mortarApplyListingHideMarks` with package-name ids instead of
Nexus mod numbers. Site enable stays `siteThunderstore`. Do not add obsolete
or broken rows until Thunderstore pages expose the same signals Nexus does.

Rejected: scraping package pages from the listing. Rejected: injecting the
Nexus `content.js` stack onto thunderstore.io.

This does not change Nexus listing behaviour or the package-page overlay.

### Read

1. `manifest.json:40` — Thunderstore match is package pages only.
2. `thunderstore.js:5` `mortarThunderstorePage` — listing paths return
   undefined at `:8`.
3. `thunderstore.js:12` `mortarThunderstoreManaged` and `:16`
   `mortarThunderstoreInstalled` — the host already names communities and
   installed packages.
4. `listingMarks.js:27` `mortarApplyListingHideMarks` — tile map is
   id-agnostic once `tiles` is collected.
5. `listingMarks.js:155` `mortarCollectInstalledTiles` — Nexus-specific
   `mortarTileLinkSelector` and `modID`.

### Traps

- **Content-script matches are not host_permissions.** Injecting into open
  Thunderstore tabs still needs `https://thunderstore.io/*` on
  `host_permissions` if `scripting.executeScript` is used the way Nexus is
  in `background.js:196`. Listing marks on navigation after install do not
  need that permission.
- **Package ids are case-insensitive.** `mortarThunderstoreInstalled` at
  `:18` lowercases both sides. Listing collection must do the same or
  `Author-Pkg` and `author-pkg` double-miss.
- **Nexus hide-in-profile controls copy Headless UI classes.** Do not mount
  `mortarEnsureHideInProfileControl` on Thunderstore; that DOM is Nexus's
  `#filters-panel`.

### Acceptance

- A Thunderstore community listing for a managed game outlines or grays
  packages in the open profile using the same `markInstalled` setting as
  Nexus. Hide removes those tiles.
- An unmanaged community listing is untouched. `siteThunderstore` off
  removes marks.
- Package pages still show the overlay and install button. Nexus listings
  are unchanged.
- `bun run gate` stays green.

## Update rows are Nexus file links only

`mortarUpdatesBadge` (`updates.js:8`) maps each host `updates` entry to
`https://www.nexusmods.com/${u.game}/mods/${u.modId}?tab=files`. The
background check (`background.js:81`) asks `updates` per Nexus domain and
stamps `game` from that list. Thunderstore packages with a newer version
never appear in the popup list or the toolbar badge.

Decided shape: only when Mortar's `updates` reply already includes
Thunderstore rows with a documented field set (community, namespace, name,
installed, latest). Map those rows to
`https://thunderstore.io/c/<community>/p/<namespace>/<name>/`. Do not
invent a host request. If a warm/cold capture of Mortar's current
protocol 2 `updates` reply has no Thunderstore fields, record
measured-not-worth here and add no row shape.

Rejected: guessing `u.source` or treating `u.game` as a Thunderstore
community. `u.game` is a Nexus domain from `mortarSupportedGames`.
Rejected: bumping `protocol` in this extension without Mortar's
`internal/nativehost`.

### Read

1. `updates.js:22` — every row becomes a Nexus files-tab URL.
2. `background.js:81` — `updates` asked per Nexus domain; `game: games[i]`.
3. `HUMANS.md:22` — a message-shape change bumps protocol on both sides.
4. `plural.js:16` — this extension speaks protocol 2, range 2..2.

### Traps

- **Protocol 2 may have no Thunderstore updates.** Measure Mortar's reply
  before adding fields. A guessed property is the outcome this section
  refuses.
- **Badge text is `updates.length`.** Mixing sources is fine only when
  each row has a working href; a dead link is worse than an omitted row.
- **Popup paint (`popup.js:53`) is source-agnostic** once `href` and
  `text` are set. Do not special-case Thunderstore in the popup.

### Acceptance

- If protocol 2 already carries Thunderstore update rows, the popup lists
  them with thunderstore.io package URLs and the badge counts them.
- If it does not, this section is updated to measured-not-worth and no
  URL template is added.
- Existing Nexus update rows and hrefs stay as they are.
- `bun run gate` stays green.

## Thunderstore tabs open at install are not injected

`background.js:194` `onInstalled` injects the Nexus content-script list
into `https://www.nexusmods.com/*` tabs. Thunderstore tabs that were
already open keep a dead page until reload. The comment at `:192` states
the reason: `scripting.executeScript` needs a thunderstore.io host
permission, and `host_permissions` (`manifest.json:59`) is Nexus only.
Content-script matches (`:40`) still run on later navigations.

Decided shape: add `https://thunderstore.io/*` to `host_permissions`,
query open Thunderstore package-page tabs on install, and inject
`content_scripts[1].js` (plural, settings, thunderstore) the way Nexus
uses `content_scripts[0].js`. Store listing copy must name Thunderstore
access the same way it names Nexus.

Rejected: injecting without the host permission. Rejected: injecting the
Nexus script list into Thunderstore tabs.

### Read

1. `background.js:191` — the comment that this is intentional today.
2. `background.js:196` — Nexus `tabs.query` + `executeScript`.
3. `manifest.json:40` — Thunderstore content scripts and `:59`
   `host_permissions`.
4. `docs/store/chrome-web-store.md` — permission justifications for the
   dashboard.

### Traps

- **Host permission is a store and Firefox review surface.** Chrome Web
  Store copy cannot be scripted (`AGENTS.md`). The paste guide and any
  privacy text must gain Thunderstore in the same commit as the manifest.
- **Match the package-page pattern**, not all of thunderstore.io, unless
  listing marks (the other TODO) land in the same change.
- **Firefox already injects via `content_scripts` matches** on load; this
  path is Chromium tabs that existed before install, like Nexus.

### Acceptance

- Installing or updating the extension paints the Thunderstore overlay on
  an already-open managed package page without a reload.
- `host_permissions` includes thunderstore.io; store copy mentions it.
- Nexus inject-on-install is unchanged.
- `bun run gate` stays green.
