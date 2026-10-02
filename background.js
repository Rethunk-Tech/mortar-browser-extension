const host = 'tech.rethunk.mortar'

// A failed delivery rejects, which the browser lists on the extension's errors page; the page's own nxm launch
// still runs, so nothing is lost that would have arrived without the extension.
chrome.runtime.onMessage.addListener((msg) => {
  if (typeof msg?.link === 'string' && msg.link.startsWith('nxm://')) {
    chrome.runtime.sendNativeMessage(host, { link: msg.link })
  }
})
