importScripts('updates.js')

const host = 'tech.rethunk.mortar'

const applyUpdatesBadge = (reply, error) => {
  const view = globalThis.mortarUpdatesBadge(reply, error)
  chrome.action.setBadgeText({ text: view.text })
  chrome.action.setBadgeBackgroundColor({ color: view.background })
  if (typeof chrome.action.setBadgeTextColor === 'function') {
    chrome.action.setBadgeTextColor({ color: view.color })
  }
  chrome.storage.session.set({
    updatesReply: error ? null : reply,
    updatesError: Boolean(error),
  })
}

const refreshUpdates = () => {
  chrome.runtime.sendNativeMessage(host, { type: 'updates', game: 'stardewvalley' }, (reply) => {
    applyUpdatesBadge(reply, chrome.runtime.lastError)
  })
}

chrome.alarms.create('updates', { periodInMinutes: 30 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updates') {
    refreshUpdates()
  }
})
chrome.tabs.onActivated.addListener((info) => {
  chrome.tabs.get(info.tabId, (tab) => {
    const url = tab?.url
    if (typeof url === 'string' && url.includes('nexusmods.com')) {
      refreshUpdates()
    }
  })
})
refreshUpdates()

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
    (msg?.type !== 'installed' &&
      msg?.type !== 'mod' &&
      msg?.type !== 'modProblems' &&
      msg?.type !== 'requirements') ||
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
  } else if (msg.type === 'requirements') {
    emptyReply = { requirements: [] }
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
        accent: reply?.accent,
      })
      return
    }
    if (msg.type === 'modProblems') {
      sendResponse({
        problems: Array.isArray(reply?.problems) ? reply.problems : [],
        accent: reply?.accent,
      })
      return
    }
    if (msg.type === 'requirements') {
      sendResponse({
        requirements: Array.isArray(reply?.requirements) ? reply.requirements : [],
        accent: reply?.accent,
      })
      return
    }
    sendResponse({
      open: reply?.open ?? null,
      others: Array.isArray(reply?.others) ? reply.others : [],
      accent: reply?.accent,
    })
  })
  return true
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'checkNow') {
    return
  }
  chrome.runtime.sendNativeMessage(host, { type: 'updates', game: 'stardewvalley' }, (reply) => {
    applyUpdatesBadge(reply, chrome.runtime.lastError)
    sendResponse({
      updates: reply?.updates,
      profile: reply?.profile,
      accent: reply?.accent,
      nativeMessagingError: Boolean(chrome.runtime.lastError),
    })
  })
  return true
})

// Content scripts only reach pages loaded after the extension, so Nexus tabs already open get the script now.
chrome.runtime.onInstalled.addListener(async () => {
  for (const tab of await chrome.tabs.query({ url: 'https://www.nexusmods.com/*' })) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: [
        'plural.js',
        'fileLabels.js',
        'modPanel.js',
        'collectionCount.js',
        'menu.js',
        'menuRequirements.js',
        'content.js',
      ],
    })
  }
})
