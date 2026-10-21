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
      pending.push({ resolve, reject })
      port.postMessage({ ...message, protocol: globalThis.mortarProtocol })
      armIdle()
    } catch (error) {
      pending.pop()
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
    reply = await globalThis.mortarAskUpdates(send)
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

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updates') {
    refreshUpdates()
  }
})
const pageHost = (url, names) => {
  if (typeof url !== 'string') {
    return false
  }
  try {
    const { hostname } = new URL(url)
    return names.some((name) => hostname === name || hostname.endsWith(`.${name}`))
  } catch {
    return false
  }
}
const isNexusPage = (url) => pageHost(url, ['nexusmods.com'])
const isThunderstorePage = (url) => pageHost(url, ['thunderstore.io'])
const isCurseForgePage = (url) => pageHost(url, ['curseforge.com'])
const isVsModDbPage = (url) => pageHost(url, ['mods.vintagestory.at'])
const isLinkSender = (sender) =>
  isNexusPage(sender?.tab?.url) || isThunderstorePage(sender?.tab?.url)

// Each site's own Install button link goes to Mortar from that site's tabs only.
const siteInstallLinks = [
  [isCurseForgePage, 'curseforge://install'],
  [isVsModDbPage, 'vintagestorymodinstall://'],
]
const isSiteInstallLink = (sender, link) =>
  siteInstallLinks.some(([onSite, prefix]) => onSite(sender?.tab?.url) && link.startsWith(prefix))

const isNexusHttpsLink = (link) => {
  try {
    const parsed = new URL(link)
    return parsed.protocol === 'https:' && parsed.hostname === 'www.nexusmods.com'
  } catch {
    return false
  }
}

const isAllowedLink = (link) =>
  typeof link === 'string' && (link.startsWith('nxm://') || isNexusHttpsLink(link))

const nxmModPath = /^\/mods\/(\d+)(?:\/|$)/

const nxmMod = (link) => {
  try {
    const parsed = new URL(link)
    const match = parsed.pathname.match(nxmModPath)
    if (parsed.protocol !== 'nxm:' || !match) {
      return
    }
    return { game: parsed.hostname, modId: match[1] }
  } catch {
    return
  }
}

const sameModDownloadTab = (sender, link) => {
  const tabUrl = sender?.tab?.url
  const parsed = nxmMod(link)
  if (!(parsed && isNexusPage(tabUrl))) {
    return false
  }
  try {
    const parts = new URL(tabUrl).pathname.split('/').filter(Boolean)
    const game = parts[0] === 'games' ? parts[1] : parts[0]
    const modsAt = parts[0] === 'games' ? 2 : 1
    return parts[modsAt] === 'mods' && parts[modsAt + 1] === parsed.modId && game === parsed.game
  } catch {
    return false
  }
}
chrome.tabs.onActivated.addListener((info) => {
  chrome.tabs.get(info.tabId, (tab) => {
    if (isNexusPage(tab?.url)) {
      refreshUpdates()
    }
  })
})

// The alarm and first check are set up when the browser or extension starts, not on every service-worker wake.
const startUpdates = () => {
  chrome.alarms.create('updates', { periodInMinutes: 30 })
  refreshUpdates()
}
chrome.runtime.onStartup.addListener(startUpdates)

// The tab closes only after Mortar took the link; a failed delivery leaves the page's own nxm launch to run, so
// nothing is lost that would have arrived without the extension.
const relayLink = (msg, sender, sendResponse) => {
  send({ link: msg.link }).then(
    (reply) => {
      if (
        msg.close === true &&
        reply?.ok === true &&
        sender.tab?.id !== undefined &&
        sameModDownloadTab(sender, msg.link)
      ) {
        chrome.tabs.remove(sender.tab.id)
      }
      sendResponse(reply)
    },
    (error) => sendResponse(failure(error)),
  )
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (typeof msg?.link === 'string') {
    if (
      !((isLinkSender(sender) && isAllowedLink(msg.link)) || isSiteInstallLink(sender, msg.link))
    ) {
      return
    }
    relayLink(msg, sender, sendResponse)
    return true
  }
  if (msg?.type === 'checkNow') {
    checkUpdates()
      .then(sendResponse)
      .catch((error) => sendResponse(failure(error)))
    return true
  }
  if (
    (msg?.type === 'installedPackages' || msg?.type === 'installPackage') &&
    msg.source === 'thunderstore' &&
    typeof msg.sourceGameKey === 'string' &&
    (msg.type !== 'installPackage' || typeof msg.package === 'string')
  ) {
    send({
      type: msg.type,
      source: msg.source,
      sourceGameKey: msg.sourceGameKey,
      ...(msg.type === 'installPackage' ? { package: msg.package } : {}),
    }).then(sendResponse, (error) => sendResponse(failure(error)))
    return true
  }
  if (
    msg?.type === 'installedProjects' &&
    ['curseforge', 'vsmoddb', 'paradox', 'modrinth'].includes(msg.source) &&
    typeof msg.sourceGameKey === 'string'
  ) {
    send({ type: msg.type, source: msg.source, sourceGameKey: msg.sourceGameKey }).then(
      sendResponse,
      (error) => sendResponse(failure(error)),
    )
    return true
  }
  if (
    msg?.type === 'installProject' &&
    (msg.source === 'paradox' || msg.source === 'modrinth') &&
    typeof msg.sourceGameKey === 'string' &&
    typeof msg.project === 'string'
  ) {
    send({
      type: msg.type,
      source: msg.source,
      sourceGameKey: msg.sourceGameKey,
      project: msg.project,
    }).then(sendResponse, (error) => sendResponse(failure(error)))
    return true
  }
  if (
    (msg?.type === 'installed' || msg?.type === 'mod') &&
    msg.source === 'nexus' &&
    typeof msg.sourceGameKey === 'string' &&
    (msg.type === 'installed' || (Number.isInteger(msg.modId) && msg.modId > 0))
  ) {
    send({
      type: msg.type,
      source: msg.source,
      sourceGameKey: msg.sourceGameKey,
      ...(msg.type === 'mod' ? { modId: msg.modId } : {}),
    }).then(sendResponse, (error) => sendResponse(failure(error)))
    return true
  }
})

// Content scripts only reach pages loaded after the extension, so already-open tabs get the matching list now.
const injectOpenTabs = async (url, files) => {
  for (const tab of await chrome.tabs.query({ url })) {
    if (typeof tab.id !== 'number') {
      continue
    }
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files,
    })
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  startUpdates()
  const scripts = chrome.runtime.getManifest().content_scripts
  await injectOpenTabs('https://www.nexusmods.com/*', scripts[0].js)
  await injectOpenTabs('https://thunderstore.io/c/*', scripts[1].js)
  await injectOpenTabs('https://www.curseforge.com/*', scripts[2].js)
  await injectOpenTabs('https://mods.vintagestory.at/*', scripts[3].js)
  await injectOpenTabs('https://mods.paradoxplaza.com/*', scripts[4].js)
  await injectOpenTabs('https://modrinth.com/*', scripts[5].js)
})
