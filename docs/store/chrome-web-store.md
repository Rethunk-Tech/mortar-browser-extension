# Chrome Web Store listing

## Listing fields

- Name: Mortar
- Category: Tools (Chrome has no games category for extensions)
- Language: English
- Homepage URL: <https://mortar.rethunk.tech/extension/>
- Support URL: <https://github.com/Rethunk-Tech/mortar-browser-extension/issues>
- Privacy policy URL: <https://mortar.rethunk.tech/extension/#privacy>

## Short description (132 characters max)

Sends installs from Nexus, Thunderstore, CurseForge, Mod DB, Paradox Mods and Modrinth to Mortar and marks mods you already have.

## Long description

Mortar is a desktop mod manager for PC games. This extension connects the browser to it on Nexus Mods, Thunderstore, CurseForge, the Vintage Story Mod DB, Paradox Mods and Modrinth.

- Relays Mod Manager Download clicks to Mortar so nxm:// links are not dropped when many tabs fire at once. When Mortar is installed and the connection is on, the extension clicks Nexus's "Download mod file" dialog so the link reaches Mortar. Mortar shows the file's requirements.
- Marks mods and files already in the open profile. Options: Off, Gray out or Hide for in-profile, obsolete, and broken-for-this-game-version; Off or Show badge for updates.
- Listing sidebar checkboxes switch those rows between Gray out and Off only (Hide is options-only).
- Mod pages show installed files, requirements and known problems from Mortar. Collection pages have Open in Mortar.
- thunderstore.io package pages mark an installed package and offer Install in Mortar; while Mortar is ready, the page's own install button reads "Install with Mortar" and sends the package to Mortar instead. Community listings mark packages already in the open profile, and a filter box grays out or hides them and deprecated packages.
- curseforge.com and mods.vintagestory.at mark mods already in the open profile and hand the Install button (`curseforge://install`, `vintagestorymodinstall://`) to Mortar.
- mods.paradoxplaza.com (Cities: Skylines II) and modrinth.com mark mods already in the open profile and add an Install in Mortar button on a mod page. Listings get the same gray out or hide filter box.
- Toolbar badge and popup show the open profile's updates from every source Mortar manages, each row linking to the mod's page and naming its site, checked every 30 minutes. The popup and options page use Mortar's colors and the bundled Atkinson Hyperlegible Next font.

UI only on the games Mortar lists, on the six sites above. The extension never downloads anything or opens pages itself.

Needs [Mortar](https://github.com/Rethunk-Tech/mortar). Without it: popup/options say "Mortar isn't installed"; Nexus stays as Nexus drew it; Thunderstore package pages hint and do not install. Installed but not running: "Mortar isn't running". No profile: "Open a profile in Mortar". Connection off in Mortar: Nexus draws nothing extra; Thunderstore says the connection is off. Each of the six sites has its own switch on the options page (all on by default).

## Single purpose

Hand mod installs from Nexus Mods, Thunderstore, CurseForge, the Vintage Story Mod DB, Paradox Mods and Modrinth to the Mortar desktop mod manager, and show on those sites which mods Mortar already has.

## Permission justifications

- `nativeMessaging`: only channel to Mortar (`tech.rethunk.mortar` on this machine). Carries download links and asks which mods are installed or have updates.
- `scripting`: when the extension is installed or updated, injects its content scripts into tabs of the six sites that were already open (content scripts alone only reach pages loaded afterwards).
- `storage`: `chrome.storage.sync` options keys in `settings.js`. `chrome.storage.session` holds the last update check (`updatesReply`, `updatesError`).
- `alarms`: update check every 30 minutes for the toolbar badge.
- Host `https://www.nexusmods.com/*`: read mod ids and download links; follow the dialog Download link; relay Mod Manager Download; inject into already-open Nexus tabs.
- Host `https://thunderstore.io/*`: read community, namespace and package name from listing and package pages, ask Thunderstore's package API whether a package is deprecated; inject into already-open Thunderstore tabs.
- Hosts `https://www.curseforge.com/*` and `https://mods.vintagestory.at/*`: read mod links and names on listing and mod pages, and the Install button's link; inject into already-open tabs.
- Hosts `https://mods.paradoxplaza.com/*` and `https://modrinth.com/*`: read the mod ids or slugs in the address of listing links and of the open mod page (Modrinth also its canonical link) to mark mods the profile has and to name the project Install in Mortar installs; inject into already-open tabs. Reads nothing else. No other site.

Remote code: none.

## Store ID prerequisite

Item id `hboeppdoecbglcmfojappgehkbecdfbi` is in Mortar's `storeChromeIDs` (`internal/nativehost/nativehost.go`). Upload `mortar-browser-extension-chrome-web-store.zip` from the release (built without `key`). Reviewers: install Mortar, open a listed game; the dialog Download click runs only when Mortar is installed and the connection is on.

## Host permission justification (one field in the dashboard)

The content scripts read mod pages and listings on Nexus Mods (mod and file ids, download links), Thunderstore (community, namespace and package names), CurseForge (project ids, mod names and the Install button's curseforge:// link), the Vintage Story Mod DB (mod ids and the Install button's link), Paradox Mods (mod ids in links) and Modrinth (project slugs and ids in links), to mark mods the open Mortar profile has and to hand those links to Mortar. On Nexus they also follow the Download link in the "Download mod file" dialog. Thunderstore's own package API is asked whether a package is deprecated. No other site is accessed.

## Data use disclosures (Privacy practices tab)

- Website content: the ids, names and install links above, read in the page and passed to Mortar on the same computer.
- Not collected: PII, health, financial, authentication, location, web history, user activity, or personal communications. The background checks whether the active tab is a Nexus mod page to refresh updates; the address is not stored or sent.

Certify all three: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used for creditworthiness or lending.

## Privacy policy text

Mortar's browser extension reads Nexus Mods, Thunderstore, CurseForge, Vintage Story Mod DB, Paradox Mods and Modrinth pages to mark mods and pass their install links to the Mortar app on this computer via native messaging. The only data exchanged is Nexus mod/file ids and nxm:// links, Thunderstore package names, CurseForge project ids, mod names and curseforge:// links, Mod DB mod ids and install links, and Paradox Mods and Modrinth project ids, going to Mortar, and installed-mod and update information coming back. It runs only on <https://www.nexusmods.com>, Thunderstore community pages (`https://thunderstore.io/c/*`), <https://www.curseforge.com>, <https://mods.vintagestory.at>, <https://mods.paradoxplaza.com> and <https://modrinth.com>. No network requests of its own, no server, analytics or telemetry, nothing to the developers or any third party. Site switches, listing marks and the update-badge choice stay in the browser's synced extension storage. Uninstalling removes them.

## Screenshots (1280x800 preferred, or 640x400; PNG or JPEG, no alpha, up to 5)

1. Nexus mod page with the Mortar panel and Mod Manager Download: "Downloads go straight to Mortar".
2. Listing with installed mods highlighted and the Mortar filter box: "Mods you already have are marked".
3. Modrinth or Paradox Mods mod page with the Install in Mortar card: "Install from more sites".
4. Redesigned toolbar popup with updates from several sources, each row showing its site, and the connected status.
5. Redesigned options page with the six site switches.

Also: small promo 440x280 (required; names Mortar, not one site, in the new sand-on-dark look), marquee 1400x560 (optional). Capture on a throwaway profile; no personal account names.
