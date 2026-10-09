import { afterAll, beforeEach, expect, test } from 'bun:test'
import './plural.js'
import './updates.js'

const ports = []
let onMessage

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
        postMessage: (message) => port.sent.push(message),
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
    getManifest: () => ({ content_scripts: [{ js: [] }] }),
  },
  alarms: { onAlarm: listeners(), create: () => undefined },
  tabs: { onActivated: listeners(), query: async () => [], remove: () => undefined },
  action: { setBadgeText: () => undefined, setBadgeBackgroundColor: () => undefined },
  storage: { session: { set: async () => undefined } },
  scripting: { executeScript: () => undefined },
}

await import('./background.js')

// Runs the router the way the browser does and resolves with what the page would be answered.
const route = (msg, sender = {}) =>
  new Promise((resolve) => {
    const handled = onMessage(msg, sender, resolve)
    if (handled !== true) {
      resolve('dropped')
    }
  })

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
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

test('messages with a wrong source or missing fields are dropped', async () => {
  const bad = [
    { type: 'installedPackages', source: 'nexus', sourceGameKey: 'g' },
    { type: 'installed', source: 'thunderstore', sourceGameKey: 'g' },
    { type: 'mod', source: 'nexus' },
    { type: 'installPackage', source: 'thunderstore', sourceGameKey: 'g' },
    { type: 'installPackage', source: 'thunderstore', sourceGameKey: 'g', package: 7 },
    { type: 'unknown' },
    undefined,
  ]
  for (const msg of bad) {
    expect(await route(msg)).toBe('dropped')
  }
  expect(ports).toHaveLength(0)
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
