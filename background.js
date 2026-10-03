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
  if (typeof msg?.link !== 'string' || !msg.link.startsWith('https://')) {
    return
  }
  chrome.runtime.sendNativeMessage(host, { link: msg.link }, (reply) => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: String(chrome.runtime.lastError.message) })
      return
    }
    sendResponse(reply ?? { ok: true })
  })
  return true
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (
    (msg?.type !== 'installed' && msg?.type !== 'mod' && msg?.type !== 'modProblems') ||
    typeof msg.game !== 'string'
  ) {
    return
  }
  const request =
    msg.type === 'installed'
      ? { type: 'installed', game: msg.game }
      : { type: msg.type, game: msg.game, modId: msg.modId }
  let emptyReply
  if (msg.type === 'installed') {
    emptyReply = { modIds: [] }
  } else if (msg.type === 'mod') {
    emptyReply = { open: null, others: [] }
  } else {
    emptyReply = { problems: [] }
  }
  chrome.runtime.sendNativeMessage(host, request, (reply) => {
    if (chrome.runtime.lastError) {
      sendResponse({
        ...emptyReply,
        nativeMessagingError: true,
      })
      return
    }
    if (msg.type === 'installed') {
      sendResponse({
        modIds: Array.isArray(reply?.modIds) ? reply.modIds : [],
        connected: reply?.connected === true,
      })
      return
    }
    if (msg.type === 'modProblems') {
      sendResponse({ problems: Array.isArray(reply?.problems) ? reply.problems : [] })
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
      files: ['fileLabels.js', 'modPanel.js', 'content.js'],
    })
  }
})
