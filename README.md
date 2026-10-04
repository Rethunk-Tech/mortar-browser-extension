# Mortar browser extension

A Chrome/Edge/Firefox extension (Manifest V3) for [Mortar](https://github.com/Rethunk-Tech/mortar), the desktop mod manager. On https://www.nexusmods.com it hands Mod Manager Download clicks to Mortar, marks the mods the open Mortar profile already has, flags broken and obsolete mods, and shows available updates in its popup.

## Requirements

The Mortar desktop app must be installed on the same computer and opened once: it registers the native messaging host `tech.rethunk.mortar` that the extension talks to. Without it the extension says "Mortar isn't installed" and changes nothing on the page.

## Install

Each release at https://github.com/Rethunk-Tech/mortar-browser-extension/releases/latest carries:

- `mortar-browser-extension.xpi`: Firefox. Open the file in Firefox to install the signed add-on.
- `mortar-browser-extension.zip`: Chrome, Edge or another Chromium browser. Unzip it, open `chrome://extensions`, turn on Developer mode and choose **Load unpacked** on the unzipped folder.
- `mortar-browser-extension-chrome-web-store.zip`: the same files without the manifest `key`, for the Chrome Web Store upload.

## Protocol

The extension and Mortar exchange JSON messages over native messaging. Every message the extension sends carries `protocol` (this extension's protocol number), and every Mortar reply carries Mortar's own `protocol`. Each side accepts a range of the other's numbers:

- Mortar refuses a message whose protocol is outside its range and replies `protocolError: "extensionTooOld"` or `"extensionTooNew"`; its Settings › Downloads connection row says the extension is too old or too new for this Mortar.
- The extension checks Mortar's `protocol` against its own range (a reply without one counts as 0) and shows "Update Mortar" or "Update the browser extension" in its popup and on Nexus pages.

Both sides speak protocol 1 and accept 1..1. A change to a message's shape bumps the number on both sides.

## Develop

```sh
bun install
bun run gate     # biome + bun test
bun run webext   # web-ext lint
bun run build    # dist/mortar-browser-extension.zip
```

Load the repo folder unpacked in Chrome, or with `about:debugging` in Firefox, to try a change. The manifest `key` pins the unpacked Chromium id that Mortar's native host allows.

## License

AGPL-3.0, see [LICENSE](LICENSE).
