import { afterAll, beforeEach, expect, test } from 'bun:test'
import './plural.js'
import './updates.js'

const ports = []
const injected = []
const removed = []
let onMessage
let postHook
let queryTabs = []
const nexusSender = { tab: { id: 1, url: 'https://www.nexusmods.com/game/mods/1' } }

const listeners = () => {
  const fns = []
  return { fns, addListener: (fn) => fns.push(fn) }
}

globalThis.chrome = {
  runtime: {
    connectNative: () => {
      const port = {
        sent: [],
        onMessage: listeners(),
        onDisconnect: listeners(),
        postMessage: (message) => {
          port.sent.push(message)
          postHook?.(port)
        },
        disconnect: () => undefined,
      }
      ports.push(port)
      return port
    },
    onMessage: {
      addListener: (fn) => {
        onMessage = fn
      },
    },
    onStartup: listeners(),
    onInstalled: listeners(),
    getManifest: () => ({
      content_scripts: [{ js: ['nexus.js'] }, { js: ['thunderstore.js'] }],
    }),
  },
  alarms: { onAlarm: listeners(), create: () => undefined },
  tabs: {
    onActivated: listeners(),
    query: async ({ url }) =>
      queryTabs.filter((tab) => {
        if (!tab.url) {
          return false
        }
        if (url.includes('nexusmods.com')) {
          return tab.url.includes('nexusmods.com')
        }
        return tab.url.includes('thunderstore.io/c/')
      }),
    remove: (id) => removed.push(id),
  },
  action: { setBadgeText: () => undefined, setBadgeBackgroundColor: () => undefined },
  storage: { session: { set: async () => undefined } },
  scripting: { executeScript: (opts) => injected.push(opts) },
}

await import('./background.js')

// Runs the router the way the browser does and resolves with what the page would be answered.
const route = (msg, sender = nexusSender) =>
  new Promise((resolve) => {
    const handled = onMessage(msg, sender, resolve)
    if (handled !== true) {
      resolve('dropped')
    }
  })

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  postHook = undefined
  queryTabs = []
  injected.length = 0
  removed.length = 0
  for (const port of ports.splice(0)) {
    for (const fn of port.onDisconnect.fns) {
      fn()
    }
  }
})

test('replies pair with requests first in, first out, and every message carries protocol', async () => {
  const first = route({ link: 'nxm://game/mods/1/files/2' })
  const second = route({ link: 'https://www.nexusmods.com/x' })
  await settle()
  const [port] = ports
  expect(port.sent.map((m) => m.protocol)).toEqual([2, 2])
  expect(port.sent.map((m) => m.link)).toEqual([
    'nxm://game/mods/1/files/2',
    'https://www.nexusmods.com/x',
  ])
  for (const fn of port.onMessage.fns) {
    fn({ ok: true, n: 1 })
    fn({ ok: true, n: 2 })
  }
  expect([(await first).n, (await second).n]).toEqual([1, 2])
})

test('a disconnect during postMessage still settles the waiter', async () => {
  postHook = (port) => {
    for (const fn of port.onDisconnect.fns) {
      fn()
    }
  }
  const reply = await Promise.race([
    route({ link: 'nxm://during' }),
    new Promise((resolve) => setTimeout(() => resolve('hung'), 0)),
  ])
  expect(reply.nativeMessagingError).toBe(true)
  expect(reply).not.toBe('hung')
})

test('a rejected update check still answers the popup', async () => {
  const previous = chrome.storage.session.set
  chrome.storage.session.set = () => Promise.reject(new Error('session closed'))
  try {
    const reply = route({ type: 'checkNow' })
    await settle()
    for (const fn of ports[0].onDisconnect.fns) {
      fn()
    }
    expect((await reply).nativeMessagingError).toBe(true)
  } finally {
    chrome.storage.session.set = previous
  }
})

test('a disconnect rejects every pending request', async () => {
  const a = route({ link: 'nxm://a' })
  const b = route({ link: 'nxm://b' })
  await settle()
  for (const fn of ports[0].onDisconnect.fns) {
    fn()
  }
  for (const reply of [await a, await b]) {
    expect(reply.nativeMessagingError).toBe(true)
    expect(reply.error).toContain('disconnected')
  }
})

test('links that are neither nxm:// nor https:// are dropped', async () => {
  for (const link of ['javascript:alert(1)', 'file:///etc/passwd', 'http://x', 'ftp://x']) {
    expect(await route({ link })).toBe('dropped')
  }
  expect(ports).toHaveLength(0)
})

test('link messages are dropped unless the tab and URL are ours', async () => {
  const nxm = 'nxm://game/mods/1/files/2'
  const nexusHttps = 'https://www.nexusmods.com/game/mods/1'
  const cases = [
    [{ link: nxm }, { tab: { url: 'https://evil.test/game/mods/1' } }],
    [{ link: nxm }, {}],
    [{ link: 'https://evil.test/x' }, nexusSender],
    [{ link: 'https://nexusmods.com/x' }, nexusSender],
    [{ link: 'https://www.nexusmods.com.evil.test/x' }, nexusSender],
  ]
  for (const [msg, sender] of cases) {
    expect(await route(msg, sender)).toBe('dropped')
  }
  expect(ports).toHaveLength(0)

  const fromThunderstore = route(
    { link: nxm },
    { tab: { url: 'https://thunderstore.io/c/lethal-company/p/A/B/' } },
  )
  const fromNexusHttps = route({ link: nexusHttps }, nexusSender)
  await settle()
  expect(ports[0].sent.map((m) => m.link)).toEqual([nxm, nexusHttps])
  for (const fn of ports[0].onMessage.fns) {
    fn({ ok: true })
    fn({ ok: true })
  }
  expect([(await fromThunderstore).ok, (await fromNexusHttps).ok]).toEqual([true, true])
})

test('close is ignored unless the sender tab is the same Nexus mod', async () => {
  const link = 'nxm://game/mods/1/files/2'
  const otherMod = route(
    { link, close: true },
    { tab: { id: 4, url: 'https://www.nexusmods.com/other/mods/9' } },
  )
  await settle()
  for (const fn of ports[0].onMessage.fns) {
    fn({ ok: true })
  }
  await otherMod
  expect(removed).toEqual([])

  const sameMod = route({ link, close: true }, nexusSender)
  await settle()
  for (const fn of ports[0].onMessage.fns) {
    fn({ ok: true })
  }
  await sameMod
  expect(removed).toEqual([1])
})

test('messages with a wrong source or missing fields are dropped', async () => {
  const bad = [
    { type: 'installedPackages', source: 'nexus', sourceGameKey: 'g' },
    { type: 'installed', source: 'thunderstore', sourceGameKey: 'g' },
    { type: 'mod', source: 'nexus' },
    { type: 'installPackage', source: 'thunderstore', sourceGameKey: 'g' },
    { type: 'installPackage', source: 'thunderstore', sourceGameKey: 'g', package: 7 },
    { type: 'mod', source: 'nexus', sourceGameKey: 'g', modId: '1' },
    { type: 'mod', source: 'nexus', sourceGameKey: 'g', modId: 0 },
    { type: 'unknown' },
    undefined,
  ]
  for (const msg of bad) {
    expect(await route(msg)).toBe('dropped')
  }
  expect(ports).toHaveLength(0)
})

test('an installed request does not forward a spoofed modId', async () => {
  const reply = route({
    type: 'installed',
    source: 'nexus',
    sourceGameKey: 'g',
    modId: 999,
  })
  await settle()
  expect(ports[0].sent[0]).toEqual({
    type: 'installed',
    source: 'nexus',
    sourceGameKey: 'g',
    protocol: 2,
  })
  for (const fn of ports[0].onMessage.fns) {
    fn({ ok: true })
  }
  expect(await reply).toEqual({ ok: true })
})

test('onInstalled injects Nexus and Thunderstore tabs that have an id', async () => {
  queryTabs = [
    { id: 3, url: 'https://www.nexusmods.com/stardewvalley' },
    { url: 'https://www.nexusmods.com/x' },
    { id: 8, url: 'https://thunderstore.io/c/lethal-company/p/A/B/' },
    { id: 9, url: 'https://thunderstore.io/' },
    { id: 10, url: 'https://thunderstore.io/c/lethal-company/' },
  ]
  await chrome.runtime.onInstalled.fns[0]()
  expect(injected).toEqual([
    { target: { tabId: 3, allFrames: false }, files: ['nexus.js'] },
    { target: { tabId: 8, allFrames: false }, files: ['thunderstore.js'] },
    { target: { tabId: 10, allFrames: false }, files: ['thunderstore.js'] },
  ])
})

test('an installPackage with a string package is forwarded as sent', async () => {
  const reply = route({
    type: 'installPackage',
    source: 'thunderstore',
    sourceGameKey: 'g',
    package: 'Owner-Pkg',
    extra: 'not forwarded',
  })
  await settle()
  expect(ports[0].sent[0]).toEqual({
    type: 'installPackage',
    source: 'thunderstore',
    sourceGameKey: 'g',
    package: 'Owner-Pkg',
    protocol: 2,
  })
  for (const fn of ports[0].onMessage.fns) {
    fn({ ok: true })
  }
  expect(await reply).toEqual({ ok: true })
})

// Other test files run in this process and treat a global `chrome` as "inside the extension".
afterAll(() => {
  globalThis.chrome = undefined
})
