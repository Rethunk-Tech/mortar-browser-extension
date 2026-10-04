# Firefox Add-ons (AMO) listing

Same extension as the Chrome listing ([chrome-web-store.md](chrome-web-store.md)); the manifest carries the Firefox id `mortar@rethunk.tech` and `strict_min_version` 140.0 (the first release with `data_collection_permissions`), and the background declares `scripts` for Firefox's event page.

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

- Mod Manager Download buttons are relayed to Mortar, so a burst of clicks from many tabs all arrive. Nexus first shows a "Download mod file" dialog listing the file's requirements; when Mortar is installed and the connection is on, the add-on clicks that dialog's own Download link so the link reaches Mortar. Mortar shows the requirements itself.
- Mods and files already in your open Mortar profile are marked on Nexus pages (highlight, hide or off, chosen in the toolbar popup).
- A Mortar section in the filter sidebar of Stardew Valley mod listings has three filters that gray out mods in your profile, obsolete mods, and mods the SMAPI compatibility list marks broken.
- Mod pages show installed files, requirements and known problems as reported by Mortar. Collection pages have an Open in Mortar button.
- The toolbar badge and popup list the mods in your profile that have updates, checked every 30 minutes.

The add-on only adds its buttons and marks for games Mortar manages (Stardew Valley today). It never downloads anything itself and never opens Nexus pages on its own. It only works on https://www.nexusmods.com and needs the Mortar desktop app (https://github.com/Rethunk-AI/mortar) on the same computer. If Mortar is not installed, its button and filter section say "Mortar isn't installed" and how to connect, and nothing is clicked for you; if it is installed but closed they say "Mortar isn't running".

## Permissions (shown at install and justified in review notes)

- Native messaging (`nativeMessaging`): the only channel to the Mortar desktop app (`tech.rethunk.mortar`). Carries download links out and installed-mod/update information back.
- `scripting`: injects the content scripts into Nexus tabs that were already open when the add-on is installed or updated.
- `storage`: the user's highlight/hide/off choice, the three per-game listing filters, and the cached last update check.
- `alarms`: the 30-minute update check.
- Access to `https://www.nexusmods.com/*`: read Nexus pages to mark mods, follow the Download link in Nexus's "Download mod file" dialog, and relay Mod Manager Download links.

## Data collection

No data is collected or transmitted to the developers or any third party. The add-on makes no network requests of its own; its only external communication is native messaging to the Mortar app on the user's computer.

The manifest declares `browser_specific_settings.gecko.data_collection_permissions` as `{ "required": ["none"] }`, which AMO requires for new extensions (https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent). The submission form needs no further answer.

## Notes for reviewers

- No remote code, no minification, no build step: the zip holds the source files as in `browser-extension/` (tests excluded).
- To test: install the Mortar desktop app from https://github.com/Rethunk-AI/mortar (the app registers the native messaging host), then open a Stardew Valley mod page on nexusmods.com. Without the app the popup shows "Mortar isn't installed. Install Mortar and open it once to connect this browser.", its Open Mortar button is hidden, and the page button and filter section show the same hint. The add-on clicks the download dialog's Download link only when the app is installed and its extension connection is on.
- Source: https://github.com/Rethunk-AI/mortar/tree/main/browser-extension

## Screenshots

Same shot list as the Chrome listing (items 1 to 4). AMO accepts PNG/JPEG/GIF; 1280x800 is fine; no fixed size is enforced, keep 16:10.
