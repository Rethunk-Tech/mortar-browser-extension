if (typeof importScripts === 'function') {
  importScripts('plural.js', 'updates.js')
}

const host = 'tech.rethunk.mortar'
// One native port serves every request: Mortar answers in order, so replies pair with requests first in, first out.
// An idle port is closed so Mortar does not stay resident in the background.
const portIdleMs = 60_000
const pending = []
let port
let idleTimer

const armIdle = () => {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    if (pending.length > 0) {
      armIdle()
      return
    }
    port?.disconnect()
    port = undefined
  }, portIdleMs)
}

const connect = () => {
  const next = chrome.runtime.connectNative(host)
  next.onMessage.addListener((reply) => {
    pending.shift()?.resolve(reply)
    armIdle()
  })
  next.onDisconnect.addListener(() => {
    if (port !== next) {
      return
    }
    const reason = new Error(
      next.error?.message ?? chrome.runtime.lastError?.message ?? 'native host disconnected',
    )
    port = undefined
    for (const waiter of pending.splice(0)) {
      waiter.reject(reason)
    }
  })
  port = next
}

const send = (message) =>
  new Promise((resolve, reject) => {
    try {
      if (!port) {
        connect()
      }
      port.postMessage(message)
      pending.push({ resolve, reject })
      armIdle()
    } catch (error) {
      reject(error)
    }
  })

const failure = (error) => ({
  nativeMessagingError: true,
  error: String(error?.message ?? error),
})

const applyUpdatesBadge = (reply, error) => {
  const view = globalThis.mortarUpdatesBadge(reply, error)
  chrome.action.setBadgeText({ text: view.text })
  chrome.action.setBadgeBackgroundColor({ color: view.background })
  if (typeof chrome.action.setBadgeTextColor === 'function') {
    chrome.action.setBadgeTextColor({ color: view.color })
  }
}

// The stored reply is what the popup paints; it is written before the caller is answered so a repaint never reads
// the previous check.
const checkUpdates = async () => {
  let reply
  let error
  try {
    reply = await send({ type: 'updates', game: 'stardewvalley' })
  } catch (caught) {
    error = caught
  }
  applyUpdatesBadge(reply, error)
  const stored = { updatesReply: error ? null : reply, updatesError: Boolean(error) }
  await chrome.storage.session.set(stored)
  return stored
}

const refreshUpdates = () => {
  checkUpdates().catch(() => false)
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

// The tab closes only after Mortar took the link; a failed delivery leaves the page's own nxm launch to run, so
// nothing is lost that would have arrived without the extension.
const relayLink = (msg, sender, sendResponse) => {
  send({ link: msg.link }).then(
    (reply) => {
      if (msg.close === true && reply?.ok === true && sender.tab?.id !== undefined) {
        chrome.tabs.remove(sender.tab.id)
      }
      sendResponse(reply)
    },
    (error) => sendResponse(failure(error)),
  )
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (typeof msg?.link === 'string') {
    if (!(msg.link.startsWith('nxm://') || msg.link.startsWith('https://'))) {
      return
    }
    relayLink(msg, sender, sendResponse)
    return true
  }
  if (msg?.type === 'checkNow') {
    checkUpdates()
      .then(sendResponse)
      .catch(() => false)
    return true
  }
  if ((msg?.type === 'installed' || msg?.type === 'mod') && typeof msg.game === 'string') {
    send({ type: msg.type, game: msg.game, modId: msg.modId }).then(sendResponse, (error) =>
      sendResponse(failure(error)),
    )
    return true
  }
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
        'hideInProfile.js',
        'listingMarks.js',
        'content.js',
      ],
    })
  }
})
