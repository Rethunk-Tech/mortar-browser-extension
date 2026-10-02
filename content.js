// Nexus shows the Mod Manager Download link as an nxm:// anchor ("Start download manually") inside the download
// widget's open shadow root. Chromium launches at most one external protocol per user gesture, so in a burst of tabs
// most of the page's own launches are blocked; handing the link to Mortar through native messaging avoids that gate.
const scanEveryMs = 1000
const sent = new Set()

function scan(root) {
  for (const a of root.querySelectorAll('a[href^="nxm://"]')) {
    if (!sent.has(a.href)) {
      sent.add(a.href)
      chrome.runtime.sendMessage({ link: a.href })
    }
  }
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) {
      scan(el.shadowRoot)
    }
  }
}

setInterval(() => scan(document), scanEveryMs)
