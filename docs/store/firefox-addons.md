# Firefox Add-ons (AMO) listing

Same extension as the Chrome listing ([chrome-web-store.md](chrome-web-store.md)); the manifest carries the Firefox id `mortar@rethunk.tech` and `strict_min_version` 128.0, and the background declares `scripts` for Firefox's event page.

## Listing fields

- Name: Mortar
- Add-on URL slug: mortar
- Categories: Games & Entertainment (primary); Download Management is the alternative
- Homepage: https://github.com/Rethunk-AI/mortar
- Support site: https://github.com/Rethunk-AI/mortar/issues
- License: the repository's license (confirm in the repository before submitting)
- Requires payment: no

## Summary (250 characters max)

Sends Nexus Mods Mod Manager Download clicks to the Mortar desktop mod manager for Stardew Valley and marks the mods you already have on Nexus pages. Requires the Mortar desktop app.

## Description

Mortar is a desktop mod manager for Stardew Valley. This add-on connects Firefox to it while you browse Nexus Mods.

- Mod Manager Download buttons are relayed to Mortar, so a burst of clicks from many tabs all arrive.
- Mods and files already in your open Mortar profile are marked on Nexus pages (highlight, hide or off, chosen in the toolbar popup).
- Mod pages show installed files, requirements and known problems as reported by Mortar.
- The toolbar badge and popup list the mods in your profile that have updates, checked every 30 minutes.

The add-on never downloads anything itself and never opens Nexus pages on its own. It only works on https://www.nexusmods.com and needs the Mortar desktop app (https://github.com/Rethunk-AI/mortar) running on the same computer.

## Permissions (shown at install and justified in review notes)

- Native messaging (`nativeMessaging`): the only channel to the Mortar desktop app (`tech.rethunk.mortar`). Carries download links out and installed-mod/update information back.
- `scripting`: injects the content scripts into Nexus tabs that were already open when the add-on is installed or updated.
- `storage`: the user's highlight/hide/off choice, the per-game hide filter, and the cached last update check.
- `alarms`: the 30-minute update check.
- Access to `https://www.nexusmods.com/*`: read Nexus pages to mark mods and relay Mod Manager Download clicks.

## Data collection

No data is collected or transmitted to the developers or any third party. The add-on makes no network requests of its own; its only external communication is native messaging to the Mortar app on the user's computer. If AMO's data collection declaration is requested: required data none, optional data none.

## Notes for reviewers

- No remote code, no minification, no build step: the zip holds the source files as in `browser-extension/` (tests excluded).
- To test: install the Mortar desktop app from https://github.com/Rethunk-AI/mortar (the app registers the native messaging host), then open a Stardew Valley mod page on nexusmods.com. Without the app the add-on is inert and the popup shows "Mortar is not running".
- Source: https://github.com/Rethunk-AI/mortar/tree/main/browser-extension

## Screenshots

Same shot list as the Chrome listing (items 1 to 4). AMO accepts PNG/JPEG/GIF; 1280x800 is fine; no fixed size is enforced, keep 16:10.
