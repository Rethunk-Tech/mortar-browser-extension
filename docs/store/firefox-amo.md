# Firefox Add-ons (AMO) public listing

The maintainer submits this by hand at <https://addons.mozilla.org/developers/>. Nothing here is automated. Field names and limits come from Mozilla's docs: <https://extensionworkshop.com/documentation/publish/submitting-an-add-on/> (submission steps and listing fields), <https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/> (summary, screenshots, icon), <https://extensionworkshop.com/documentation/publish/source-code-submission/> (source upload) and <https://extensionworkshop.com/documentation/publish/add-on-policies/> (listing policies).

## How this differs from today

Today `release.yml` signs an unlisted version of `mortar@rethunk.tech` through the API (`scripts/amo-signed.mjs`) and self-distributes the `.xpi` with `updates.json`. A public listing uses the same add-on id and the same manifest, but a listed submission:

- Choose "On this site" at the distribution step, not "On your own". AMO then signs and publishes the version, and later versions are uploaded from the add-on's AMO page.
- The id `mortar@rethunk.tech` already has unlisted versions; add the listing to that id from the developer hub rather than creating a second add-on. Version 0.4.0 must be a version AMO has not signed yet, and AMO signs each version once.
- Listed versions are updated by AMO. The manifest's `gecko.update_url` points at GitHub; the Extension Workshop says to add `update_url` only for self-distribution, so upload the listed version without it (check the upload validator). Use the unzipped `dist/firefox` after `bun run build`, with `browser_specific_settings.gecko.update_url` removed from its `manifest.json`, zipped. Keep the unlisted channel for the self-distributed `.xpi` only if the maintainer still wants it.
- Source code upload: required only for minified, bundled or generated code. This extension ships plain, hand-written JS with no build step beyond packaging (`scripts/build.sh` zips files and drops `background.service_worker` for Firefox), so answer "no" to "Do you need to submit source code?". If a reviewer asks, point them at the repository tag.
- Data collection: the manifest already declares `data_collection_permissions: { "required": ["none"] }` (Firefox 140+).

## Listing fields

- Name: Mortar
- Summary (250 characters max): Sends installs from Nexus, Thunderstore, CurseForge, Mod DB, Paradox Mods and Modrinth to the Mortar desktop mod manager and marks mods you already have.
- Description: see below. AMO's docs set no numeric limit; keep it concise.
- Firefox categories (up to 2): Download Management, Other
- Firefox for Android categories (up to 2): same. The manifest allows Android from 142.
- Tags: mods, mod manager, nexus mods, thunderstore, curseforge, modrinth, game mods
- Support website: <https://github.com/Rethunk-Tech/mortar-browser-extension/issues>
- Homepage: <https://mortar.rethunk.tech/extension/>
- Support email: the maintainer's choice
- License: the repository's `LICENSE` (check its type before choosing the AMO option)
- Privacy policy: required because data leaves the page to the native app. URL <https://mortar.rethunk.tech/extension/#privacy>; paste the "Privacy policy text" from `chrome-web-store.md`.
- Experimental: no. Requires payment, services or hardware: yes, it needs the free Mortar desktop app installed (say so in the description).
- Icon: AMO loads 32x32 and 64x64, PNG or JPEG. Use `icons/icon-128.png` as the source or export the mark at 64x64.

## Description

Mortar is a desktop mod manager for PC games. This add-on connects Firefox to it on Nexus Mods, Thunderstore, CurseForge, the Vintage Story Mod DB, Paradox Mods and Modrinth. It needs the Mortar app on the same computer, opened once.

- Relays Nexus Mod Manager Download clicks to Mortar so nxm:// links are not dropped when many tabs fire at once.
- Marks mods and files already in the open Mortar profile, and can gray them out or hide them. Mod pages show installed files, requirements and known problems from Mortar.
- Thunderstore, CurseForge, Vintage Story Mod DB, Paradox Mods and Modrinth pages mark mods you have and offer Install in Mortar. On Thunderstore package pages the page's own install button reads "Install with Mortar" while Mortar is ready.
- The toolbar popup lists the open profile's updates from every source, each row naming its site and linking to the mod's page. The toolbar badge counts them, checked every 30 minutes.
- Each site has its own switch on the options page.

What it sends: mod ids, package names, project ids and install links read from the page go to the Mortar app on this computer through native messaging, and installed-mod and update information comes back. No network requests of its own, no server, analytics or telemetry, nothing to the developers or any third party. It never downloads anything or opens pages itself. It runs only on the six sites above.

Without Mortar the popup says "Mortar isn't installed" and the sites look as they always do.

## Permission notes (for the reviewer and the listing)

- `nativeMessaging`: the only channel to Mortar (`tech.rethunk.mortar`).
- `scripting`: injects content scripts into already-open tabs of the six sites when the add-on is installed or updated.
- `storage`: the options and the last update check.
- `alarms`: update check every 30 minutes.
- Hosts: `https://www.nexusmods.com/*`, `https://thunderstore.io/*`, `https://www.curseforge.com/*`, `https://mods.vintagestory.at/*`, `https://mods.paradoxplaza.com/*`, `https://modrinth.com/*`; justifications in `chrome-web-store.md`.

## Notes for reviewers

Install Mortar, open a profile for a game it lists, then visit a mod page on any of the six sites. Without Mortar the only visible change is the popup message. The code is plain JS with no minification or bundling; `bun run build` only zips it. No remote code.

## Screenshots

AMO sets no count; the recommended size is 1280x800 (1.6:1 for other sizes), and one set is shared across locales. Use the five frames listed in `chrome-web-store.md`. AMO has no promo tile.
