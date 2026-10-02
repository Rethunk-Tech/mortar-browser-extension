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
  if ((msg?.type !== 'installed' && msg?.type !== 'mod') || typeof msg.game !== 'string') {
    return
  }
  const request =
    msg.type === 'mod'
      ? { type: 'mod', game: msg.game, modId: msg.modId }
      : { type: 'installed', game: msg.game }
  chrome.runtime.sendNativeMessage(host, request, (reply) => {
    if (chrome.runtime.lastError) {
      sendResponse({
        ...(msg.type === 'installed' ? { modIds: [] } : { open: null, others: [] }),
        nativeMessagingError: true,
      })
      return
    }
    if (msg.type === 'installed') {
      sendResponse({ modIds: Array.isArray(reply?.modIds) ? reply.modIds : [] })
      return
    }
    sendResponse({
      open: reply?.open ?? null,
      others: Array.isArray(reply?.others) ? reply.others : [],
    })
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
