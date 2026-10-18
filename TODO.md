# TODO

Work that is decided but not built. `AGENTS.md` and `docs/` describe what
exists; this file is the only place that describes what does not.

Sections are unordered.

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
