const host = 'tech.rethunk.mortar'

// A failed delivery rejects, which the browser lists on the extension's errors page; the page's own nxm launch
// still runs, so nothing is lost that would have arrived without the extension. The tab closes only after Mortar
// took the link.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (typeof msg?.link !== 'string' || !msg.link.startsWith('nxm://')) {
    return
  }
  chrome.runtime.sendNativeMessage(host, { link: msg.link }).then((reply) => {
    if (msg.close === true && reply?.ok === true && sender.tab?.id !== undefined) {
      chrome.tabs.remove(sender.tab.id)
    }
  })
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'installed' || typeof msg.game !== 'string') {
    return
  }
  chrome.runtime.sendNativeMessage(host, { type: 'installed', game: msg.game }, (reply) => {
    if (chrome.runtime.lastError) {
      sendResponse({ modIds: [], nativeMessagingError: true })
      return
    }
    if (!Array.isArray(reply?.modIds)) {
      sendResponse({ modIds: [] })
      return
    }
    sendResponse({ modIds: reply.modIds })
  })
  return true
})

// Content scripts only reach pages loaded after the extension, so Nexus tabs already open get the script now.
chrome.runtime.onInstalled.addListener(async () => {
  for (const tab of await chrome.tabs.query({ url: 'https://www.nexusmods.com/*' })) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: ['content.js'],
    })
  }
})
