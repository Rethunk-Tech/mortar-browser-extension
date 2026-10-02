// Nexus shows the Mod Manager Download link as an nxm:// anchor ("Start download manually") inside the download
// widget's open shadow root. Chromium launches at most one external protocol per user gesture, so in a burst of tabs
// most of the page's own launches are blocked; handing the link to Mortar through native messaging avoids that gate.
// Mutation observers, not a timer, find the link: background tabs throttle timers to as little as once a minute.
// The background script also injects this file into Nexus tabs that were open before the extension loaded, so a
// tab can run it twice; the flag keeps one copy.
if (!globalThis.mortarNxmWatch) {
  globalThis.mortarNxmWatch = true
  const sent = new Set()
  const skipped = new Set()
  const watched = new WeakSet()

  // A tab opened just for this download is closed once Mortar has the link: at most two history entries, all of
  // them this mod's own page (its description and its files tab). A tab with any other history stays open. Only
  // the Navigation API lists entries with their addresses; without it nothing is closed.
  const trailingSlash = /\/$/
  const modPath = location.pathname.match(/^\/[^/]+\/mods\/\d+/)?.[0]
  const throwaway = () => {
    const entries = globalThis.navigation?.entries?.()
    if (!(modPath && entries) || history.length > 2 || entries.length !== history.length) {
      return false
    }
    return entries.every((e) => {
      const u = new URL(e.url)
      return u.origin === location.origin && u.pathname.replace(trailingSlash, '') === modPath
    })
  }

  // A copy left in an open tab when the extension is reloaded or removed loses chrome.runtime; the new copy takes
  // over, so the old one stays quiet.
  const scan = (root) => {
    if (!chrome.runtime?.id) {
      return
    }
    // Mod manager download first opens a "Download mod file" dialog listing the file's requirements. Mortar
    // resolves those itself, so the dialog's Download link (the one carrying nmm=1) is followed straight away.
    for (const a of root.querySelectorAll(
      '[role="dialog"] a.nxm-button-flamework[href*="nmm=1"]',
    )) {
      if (!skipped.has(a.href)) {
        skipped.add(a.href)
        a.click()
      }
    }
    for (const a of root.querySelectorAll('a[href^="nxm://"]')) {
      if (!sent.has(a.href)) {
        sent.add(a.href)
        chrome.runtime.sendMessage({ link: a.href, close: throwaway() })
      }
    }
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        watch(el.shadowRoot)
      }
    }
  }

  const watch = (root) => {
    if (watched.has(root)) {
      return
    }
    watched.add(root)
    new MutationObserver(() => scan(root)).observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['href'],
    })
    scan(root)
  }

  watch(document)
}
