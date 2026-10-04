<h1 align="center">Mortar browser extension</h1>

<div align="center">

![Licence](https://img.shields.io/badge/licence-AGPL--3.0-blue)
![Manifest](https://img.shields.io/badge/manifest-V3-informational)

</div>

---

A Chrome, Edge and Firefox extension for [Mortar](https://github.com/Rethunk-Tech/mortar), the desktop mod manager. On https://www.nexusmods.com it hands Mod Manager Download clicks to Mortar, marks the mods the open Mortar profile already has, flags broken and obsolete mods, and shows available updates in its popup. It needs the Mortar app on the same computer and does nothing on the page without it.

## Getting started

```sh
bun install && bun run gate
```

Install from a release, requirements, the native-messaging protocol and the dev loop: [HUMANS.md](HUMANS.md).

## Highlights

- Relays Nexus's own Mod Manager Download button to Mortar; never starts downloads or opens Nexus pages itself
- Marks mods and files the open profile already has, on mod pages, file lists and listings
- Flags broken and obsolete mods and shows available updates in the popup
- Versioned native-messaging handshake: each side says which one to update when they cannot talk

## Documentation

| Topic | Location |
| --- | --- |
| Install, protocol, develop | [HUMANS.md](HUMANS.md) |
| Layout, tests, release | [AGENTS.md](AGENTS.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Security policy | [SECURITY.md](SECURITY.md) |
| Store listing copy | [docs/store/](docs/store/) |
| Licence | [LICENSE](LICENSE) |

## License

AGPL-3.0, see [LICENSE](LICENSE).
