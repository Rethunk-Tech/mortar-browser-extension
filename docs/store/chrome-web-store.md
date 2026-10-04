# Chrome Web Store listing

Copy for the Mortar extension (`browser-extension/`, Manifest V3). Every claim below was checked against `browser-extension/manifest.json`, `background.js`, `content.js`, `modPanel.js`, `popup.js` and `hideInProfile.js`.

## Listing fields

- Name: Mortar
- Category: Productivity (Chrome has no games-tools category; Productivity fits a companion to a desktop app)
- Language: English
- Homepage URL: https://github.com/Rethunk-AI/mortar
- Support URL: https://github.com/Rethunk-AI/mortar/issues
- Privacy policy URL: required by Chrome because the extension handles page content. Host the "Privacy policy text" below at a stable URL (for example the rendered copy of this section in the repository) and enter it.

## Short description (132 characters max)

Sends Nexus Mods Mod Manager Download clicks to the Mortar desktop mod manager and marks mods you already have.

## Long description

Mortar is a desktop mod manager for Stardew Valley. This extension connects your browser to it while you browse Nexus Mods.

- Mod Manager Download buttons are relayed to Mortar. Open as many mod tabs as you like and click away; every click arrives, instead of the browser handing the nxm:// links to the desktop one at a time and dropping some.
- Mods and files already in your open Mortar profile are marked on Nexus pages, so you can tell what you have. Choose highlight, hide or off in the toolbar popup.
- Mod pages show which files are installed, requirements and known problems for the mod, as reported by Mortar.
- The toolbar badge and popup show how many of your profile's mods have updates, checked every 30 minutes.

The extension never downloads anything itself and never opens Nexus pages on its own. Downloads start only from Nexus's own Mod Manager Download button.

It needs the Mortar desktop app (https://github.com/Rethunk-AI/mortar). Without Mortar running, pages are left untouched and the popup says Mortar is not running.

## Single purpose

Relay Nexus Mods "Mod Manager Download" clicks to the Mortar desktop mod manager and show, on Nexus Mods pages, which mods Mortar already has.

## Permission justifications

- `nativeMessaging`: the only channel to the Mortar desktop app (native host `tech.rethunk.mortar`, on the user's own machine). It carries download links to Mortar and asks it which mods are installed and which have updates.
- `scripting`: when the extension is installed or updated, injects its content scripts into Nexus Mods tabs that were already open (content scripts alone only reach pages loaded afterwards).
- `storage`: keeps the user's choice (highlight, hide or off) and per-game "hide mods in my profile" filter in local storage, and keeps the last update check in session storage so the popup and badge render without a new request.
- `alarms`: schedules the update check every 30 minutes so the toolbar badge stays current.
- Host permission `https://www.nexusmods.com/*`: the content scripts must read Nexus mod and listing pages (mod ids, download links) to mark mods and to intercept Mod Manager Download clicks. No other site is accessed.

Remote code: none. All code ships in the package.

## Data use disclosures (Privacy practices tab)

Data types the extension handles:
- Website content: Nexus Mods page content (mod ids, file ids, nxm:// download links) is read in the page so it can be marked and relayed.
- Web history: the background script checks whether the active tab's URL contains nexusmods.com to refresh the update check; the URL is not stored or sent.
- Not collected: personally identifiable information, health, financial, authentication, location, user activity (keystrokes, mouse), or personal communications.

Certify all three: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used for creditworthiness or lending.

## Privacy policy text

Mortar's browser extension reads Nexus Mods pages in your browser to mark mods and to pass Mod Manager Download links to the Mortar desktop app installed on your own computer, using the browser's native messaging. The only data exchanged is Nexus mod ids, file ids and nxm:// links going to Mortar, and installed-mod and update information coming back. It runs only on https://www.nexusmods.com. The extension makes no network requests of its own, has no server, analytics or telemetry, and sends nothing to the developers or any third party. Your display choice and filter settings are stored in your browser's extension storage and never leave it. Uninstalling the extension removes them.

## Screenshots (1280x800 preferred, or 640x400; PNG or JPEG, no alpha, up to 5)

1. Nexus mod page with the Mortar panel showing installed files and the Mod Manager Download button: caption "Downloads go straight to Mortar".
2. A Nexus listing page with installed mods highlighted: "Mods you already have are marked".
3. Same listing with mode set to hide: "Or hide them".
4. Toolbar popup open with the update list and the connected status line.
5. Toolbar with the updates badge next to the Mortar app window in the same shot (1280x800).

Also: small promo tile 440x280 (required), marquee 1400x560 (optional). Capture against a throwaway profile; avoid showing personal account names.
