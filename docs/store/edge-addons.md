# Microsoft Edge Add-ons listing

The maintainer submits this by hand in Partner Center (<https://partner.microsoft.com/dashboard/microsoftedge/public/login>). Nothing here is automated. Field names and limits come from Microsoft's doc <https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension> (page dated 2026-05-05).

## Package

Upload `mortar-browser-extension-chrome-web-store.zip` from the release (the same zip as the Chrome Web Store; Edge installs Chromium extensions). Name and description come from `manifest.json` and are read-only in Partner Center; change them by re-uploading a package. Version 0.4.0 declares the six host permissions below.

## Availability and properties

- Visibility: Public. Markets: all.
- Category: required; pick the closest Tools or Productivity entry the form offers. The docs do not list the category names.
- Website (must be your own site, not the Edge listing): <https://mortar.rethunk.tech/extension/>
- Support contact detail: <https://github.com/Rethunk-Tech/mortar-browser-extension/issues>
- Mature content: no.

## Privacy page

- Single purpose: Hand mod installs from Nexus Mods, Thunderstore, CurseForge, the Vintage Story Mod DB, Paradox Mods and Modrinth to the Mortar desktop mod manager, and show on those sites which mods Mortar already has.
- Permission justifications: one box per permission, text in `chrome-web-store.md` ("Permission justifications"): `nativeMessaging`, `scripting`, `storage`, `alarms` and each of the six hosts.
- Remote code: No, I am not using remote code. (Manifest V3.)
- Data usage: the same answers as the Chrome Web Store. Website content is read in the page and passed to Mortar on the same computer; nothing else is collected. Tick all three certifications.
- Privacy policy URL: <https://mortar.rethunk.tech/extension/#privacy> (text in `chrome-web-store.md`).

## Store listing (en-US)

- Extension name: Mortar (from the manifest).
- Short description (from the manifest `description`; the docs state no limit, and Chrome caps it at 132 characters, which `scripts.test.js` checks): Sends installs from Nexus, Thunderstore, CurseForge, Mod DB, Paradox Mods and Modrinth to Mortar and marks mods you already have.
- Description (250 to 10,000 characters): paste the "Long description" from `chrome-web-store.md`.
- Extension logo: 1:1, 300x300 recommended, 128x128 minimum; export the Mortar mark on the sand-on-dark background.
- Small promotional tile (optional): 440x280.
- Large promotional tile (optional): 1400x560, PNG.
- Screenshots (optional, up to 6): 640x480 or 1280x800. Use the five frames listed in `chrome-web-store.md` (1280x800).
- YouTube video URL: none.
- Search terms (up to 7 terms of 30 characters, 21 words in all): mod manager, nexus mods, thunderstore, curseforge, modrinth, game mods, mortar

## Notes for certification

Mortar is a free desktop app and is required for any visible effect. Install it from <https://github.com/Rethunk-Tech/mortar>, open it once, open a profile for a game it lists, then visit a mod page on one of the six sites. Without Mortar the toolbar popup says "Mortar isn't installed" and the sites look as they always do. This is an update that adds Paradox Mods and Modrinth support (two new host permissions), shows updates from every source in the popup, and redesigns the popup and options page.
