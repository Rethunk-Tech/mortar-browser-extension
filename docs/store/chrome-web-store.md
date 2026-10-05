# Chrome Web Store listing

Copy for the Mortar extension (Manifest V3). Every claim below was checked against `manifest.json`, `background.js`, `content.js`, `modPanel.js`, `popup.js` and `hideInProfile.js`.

## Listing fields

- Name: Mortar
- Category: Productivity (Chrome has no games-tools category; Productivity fits a companion to a desktop app)
- Language: English
- Homepage URL: https://mortar.rethunk.tech/extension/
- Support URL: https://github.com/Rethunk-Tech/mortar-browser-extension/issues
- Privacy policy URL: https://mortar.rethunk.tech/extension/#privacy (the "Privacy policy text" below, as published there).

## Short description (132 characters max)

Sends Nexus Mods downloads and Thunderstore installs to the Mortar desktop mod manager and marks mods you already have.

## Long description

Mortar is a desktop mod manager for PC games. This extension connects your browser to it while you browse Nexus Mods and Thunderstore.

- Mod Manager Download buttons are relayed to Mortar. Open as many mod tabs as you like and click away; every click arrives, instead of the browser handing the nxm:// links to the desktop one at a time and dropping some. Nexus first shows a "Download mod file" dialog listing the file's requirements; when Mortar is installed and the connection is on, the extension clicks that dialog's own Download link for you so the link reaches Mortar. Mortar shows the requirements itself.
- Mods and files already in your open Mortar profile are marked on Nexus pages, so you can tell what you have. Choose highlight, hide or off in the toolbar popup.
- A Mortar section in the filter sidebar of mod listings has three filters that gray out mods already in your profile, mods marked obsolete, and mods the SMAPI compatibility list marks broken.
- Mod pages show which files are installed, requirements and known problems for the mod, as reported by Mortar. Collection pages have an Open in Mortar button.
- On thunderstore.io package pages, a package already in your open Mortar profile is marked, and an Install in Mortar button sends the package to Mortar. This works on package pages only, not on Thunderstore listings.
- The toolbar badge and popup show how many of your profile's mods have updates, checked every 30 minutes.

The extension only adds its buttons and marks on Nexus Mods and Thunderstore pages for games Mortar manages: Stardew Valley, with more games coming. It never downloads anything itself and never opens Nexus pages on its own. Downloads start only from Nexus's own Mod Manager Download button.

It needs the Mortar desktop app (https://github.com/Rethunk-Tech/mortar). If Mortar is not installed, the Mortar button and filter section say "Mortar isn't installed" and how to connect, and the popup says the same; nothing is clicked for you. If Mortar is installed but not running, they say "Mortar isn't running"; if no profile is open, "Open a profile in Mortar"; if the connection is switched off in Mortar's settings, nothing is drawn on pages.

## Single purpose

Relay Nexus Mods "Mod Manager Download" clicks and Thunderstore package installs to the Mortar desktop mod manager and show, on Nexus Mods and Thunderstore package pages, which mods Mortar already has.

## Permission justifications

- `nativeMessaging`: the only channel to the Mortar desktop app (native host `tech.rethunk.mortar`, on the user's own machine). It carries download links to Mortar and asks it which mods are installed and which have updates.
- `scripting`: when the extension is installed or updated, injects its content scripts into Nexus Mods tabs that were already open (content scripts alone only reach pages loaded afterwards).
- `storage`: keeps the user's choice (highlight, hide or off) and the three per-game listing filters (in my profile, obsolete, broken) in local storage, and keeps the last update check in session storage so the popup and badge render without a new request.
- `alarms`: schedules the update check every 30 minutes so the toolbar badge stays current.
- Host permission `https://www.nexusmods.com/*`: the content scripts must read Nexus mod and listing pages (mod ids, download links) to mark mods, to follow the Download link in Nexus's "Download mod file" dialog, and to relay Mod Manager Download links.
- Content script match `https://thunderstore.io/c/*/p/*`: reads the community, namespace and package name from a Thunderstore package page's address to mark a package already in the profile and to add the Install in Mortar button. It reads nothing else and makes no requests. No other site is accessed.

Remote code: none. All code ships in the package.

## Notes for reviewers

- Install the Mortar desktop app from https://github.com/Rethunk-Tech/mortar; it registers the native messaging host. Open a Stardew Valley mod page on nexusmods.com; a Thunderstore package page only shows Mortar's button for a game Mortar manages, which today is Stardew Valley.
- Without the app the popup says "Mortar isn't installed. Install Mortar and open it once to connect this browser." and the Open Mortar button is hidden. With the app installed but closed it says "Mortar isn't running".
- The extension clicks the "Download mod file" dialog's Download link only when Mortar is installed and its extension connection is on.

## Store ID prerequisite

The store item id is `hboeppdoecbglcmfojappgehkbecdfbi`. Mortar's native host manifest allows only the extension's origins, so this id is in `storeChromeIDs` in Mortar's [`internal/nativehost/nativehost.go`](https://github.com/Rethunk-Tech/mortar/blob/main/internal/nativehost/nativehost.go). Upload `mortar-browser-extension-chrome-web-store.zip` from each release, which `.github/workflows/release.yml` builds without `key` (the store signs with its own key).

## Data use disclosures (Privacy practices tab)

Data types the extension handles:
- Website content: Nexus Mods page content (mod ids, file ids, nxm:// download links) and Thunderstore package page addresses (community, namespace, package name) is read in the page so it can be marked and relayed.
- Web history: the background script checks whether the active tab's URL contains nexusmods.com to refresh the update check; the URL is not stored or sent.
- Not collected: personally identifiable information, health, financial, authentication, location, user activity (keystrokes, mouse), or personal communications.

Certify all three: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used for creditworthiness or lending.

## Privacy policy text

Mortar's browser extension reads Nexus Mods pages in your browser to mark mods and to pass Mod Manager Download links to the Mortar desktop app installed on your own computer, using the browser's native messaging. The only data exchanged is Nexus mod ids, file ids and nxm:// links, and Thunderstore package names, going to Mortar, and installed-mod and update information coming back. It runs only on https://www.nexusmods.com and on Thunderstore package pages (https://thunderstore.io/c/*/p/*). The extension makes no network requests of its own, has no server, analytics or telemetry, and sends nothing to the developers or any third party. Your display choice and filter settings are stored in your browser's extension storage and never leave it. Uninstalling the extension removes them.

## Screenshots (1280x800 preferred, or 640x400; PNG or JPEG, no alpha, up to 5)

1. Nexus mod page with the Mortar panel showing installed files and the Mod Manager Download button: caption "Downloads go straight to Mortar".
2. A Nexus listing page with installed mods highlighted: "Mods you already have are marked".
3. Same listing with mode set to hide: "Or hide them".
4. Toolbar popup open with the update list and the connected status line.
5. Toolbar with the updates badge next to the Mortar app window in the same shot (1280x800).

Also: small promo tile 440x280 (required), marquee 1400x560 (optional). Capture against a throwaway profile; avoid showing personal account names.
