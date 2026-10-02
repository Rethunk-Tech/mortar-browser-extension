// Nexus shows the Mod Manager Download link as an nxm:// anchor ("Start download manually") inside the download
// widget's open shadow root. Chromium launches at most one external protocol per user gesture, so in a burst of tabs
// most of the page's own launches are blocked; handing the link to Mortar through native messaging avoids that gate.
// Mutation observers, not a timer, find the link: background tabs throttle timers to as little as once a minute.
// The background script also injects this file into Nexus tabs that were open before the extension loaded, so a
// tab can run it twice; the flag keeps one copy.
if (!globalThis.mortarNxmWatch) {
  globalThis.mortarNxmWatch = true
  const sent = new Set()
  const watched = new WeakSet()

  const scan = (root) => {
    for (const a of root.querySelectorAll('a[href^="nxm://"]')) {
      if (!sent.has(a.href)) {
        sent.add(a.href)
        chrome.runtime.sendMessage({ link: a.href })
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
