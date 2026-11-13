import { expect, test } from 'bun:test'
import { file } from 'bun'
import './mortarUi.js'
import './plural.js'
import './settings.js'
import './listingMarks.js'
import './filterBox.js'
import './projectSites.js'
import './projectPages.js'

const { paradox, modrinth } = globalThis.mortarMarketSites
const canonicalLink = /<link rel="canonical" href="([^"]+)"/
const listingCount = 3
// Longer than projectPages.js's repaint debounce, so an in-place navigation has repainted.
const afterRepaintMs = 400
const fixture = (name) => file(new URL(`./testdata/${name}`, import.meta.url)).text()

test('Modrinth listing cards are keyed by the slug in their /mod/ link', async () => {
  const html = await fixture('modrinth-listing.html')
  const hrefs = [...html.matchAll(/<a href="(\/mod\/[^"]+)"/g)].map((m) => m[1])
  expect(hrefs.map((href) => globalThis.mortarMarketLinkKey(modrinth, href))).toEqual([
    'fabric-api',
    'sodium',
    'iris',
  ])
  expect(html.match(/class="smart-clickable smart-clickable--has-clickable"/g)).toHaveLength(
    listingCount,
  )
  expect(globalThis.mortarMarketLinkKey(modrinth, '/user/JZA4dW8o')).toBeUndefined()
  expect(globalThis.mortarMarketLinkKey(modrinth, 'https://modrinth.com/mod/Sodium/versions')).toBe(
    'sodium',
  )
})

test('a Modrinth mod page is told by its path, and the canonical link gives the project id', async () => {
  const html = await fixture('modrinth-mod.html')
  const [, canonical] = canonicalLink.exec(html)
  expect(globalThis.mortarMarketPage(modrinth, '/mod/sodium', canonical)).toEqual({
    project: 'AANobbMI',
    keys: ['sodium', 'aanobbmi'],
  })
  expect(globalThis.mortarMarketPage(modrinth, '/mod/sodium')).toEqual({
    project: 'sodium',
    keys: ['sodium'],
  })
  expect(globalThis.mortarMarketPage(modrinth, '/mods', canonical)).toBeUndefined()
  expect(globalThis.mortarMarketPage(modrinth, '/modpack/x')).toBeUndefined()
})

test('Paradox Mods pages and links are told by the numeric id; the shell holds no markup to read', async () => {
  const shell = await fixture('paradox-shell.html')
  expect(shell).toContain('<div id="app"></div>')
  const [, canonical] = canonicalLink.exec(shell)
  expect(globalThis.mortarMarketPage(paradox, new URL(canonical).pathname, canonical)).toEqual({
    project: '90641',
    keys: ['90641'],
  })
  expect(
    globalThis.mortarMarketLinkKey(paradox, 'https://mods.paradoxplaza.com/mods/123/Windows'),
  ).toBe('123')
  expect(globalThis.mortarMarketLinkKey(paradox, '/games/cities_skylines_2')).toBeUndefined()
  expect(globalThis.mortarMarketPage(paradox, '/mods/abc/Windows')).toBeUndefined()
})

test('profile projects answer to ids and Modrinth slugs', () => {
  const wanted = globalThis.mortarProjectKeys(modrinth, [
    { id: 'AANobbMI', name: 'Sodium', slug: 'sodium' },
  ])
  expect(wanted.has('sodium') && wanted.has('aanobbmi')).toBe(true)
})

test('the page card uses the same states as Thunderstore pages', () => {
  const overlay = globalThis.mortarMarketOverlay
  const ready = { protocol: 4, state: 'ready', connected: true }
  expect(overlay(ready, undefined, { managed: true, inProfile: false })).toEqual({
    text: 'Mortar',
    button: true,
  })
  expect(overlay(ready, undefined, { managed: true, inProfile: true })).toEqual({
    text: 'In Mortar profile',
    button: false,
  })
  expect(overlay(ready, undefined, { managed: false, inProfile: false })).toBeUndefined()
  for (const [reply, text] of [
    [{ protocol: 4, state: 'notRunning' }, "Mortar isn't running"],
    [{ protocol: 4, state: 'noProfile' }, 'Open a profile in Mortar'],
    [{ protocol: 4, state: 'off' }, 'Browser extension connection is off in Mortar'],
  ]) {
    expect(overlay(reply, undefined, { managed: true, inProfile: false })).toEqual({
      text,
      button: false,
    })
  }
  expect(overlay(undefined, new Error('x'), { managed: true }).text).toBe(
    globalThis.mortarInstallHint,
  )
})

test('installProject asks for the page project and reports Sent to Mortar', () => {
  expect(globalThis.mortarMarketInstallRequest(paradox, 'cities_skylines_2', '90641')).toEqual({
    type: 'installProject',
    source: 'paradox',
    sourceGameKey: 'cities_skylines_2',
    project: '90641',
  })
  expect(globalThis.mortarMarketResultText({ protocol: 4, state: 'ready', ok: true })).toBe(
    'Sent to Mortar',
  )
  expect(globalThis.mortarMarketResultText({ protocol: 4, state: 'ready', error: 'x' })).toBe(
    "Mortar couldn't install this mod",
  )
})

test('a Modrinth mod page draws an install card that asks installProject for the page shown now', async () => {
  const byId = new Map()
  const asked = []
  const buttons = []
  const node = () => {
    const listeners = {}
    const childs = []
    const n = {
      style: { cssText: '', setProperty: () => undefined },
      classList: { contains: () => false },
      className: '',
      textContent: '',
      children: childs,
      isConnected: false,
      append: (...x) => childs.push(...x),
      addEventListener: (t, fn) => {
        if (!listeners[t]) {
          listeners[t] = []
        }
        listeners[t].push(fn)
      },
      setAttribute: () => undefined,
      attachShadow: () => ({ append: (...x) => childs.push(...x) }),
      querySelector: () => childs[0],
      querySelectorAll: () => [],
      closest: () => null,
      remove() {
        byId.delete(n.id)
      },
      click() {
        for (const fn of listeners.click ?? []) {
          fn({ isTrusted: true })
        }
      },
    }
    Object.defineProperty(n, 'id', {
      get() {
        return n._id
      },
      set(v) {
        n._id = v
        byId.set(v, n)
      },
    })
    return n
  }
  const body = node()
  const document = {
    body,
    documentElement: node(),
    getElementById: (id) => byId.get(id),
    createElement: (tag) => {
      const n = node()
      if (tag === 'button') {
        buttons.push(n)
      }
      return n
    },
    importNode: (x) => x,
    querySelector: (sel) =>
      sel === 'link[rel="canonical"]' ? { href: 'https://modrinth.com/project/AANobbMI' } : null,
    querySelectorAll: () => [],
  }
  body.append = (el) => {
    el.isConnected = true
    byId.set(el.id, el)
  }
  globalThis.document = document
  globalThis.location = {
    host: 'modrinth.com',
    pathname: '/mod/sodium',
    href: 'https://modrinth.com/mod/sodium',
  }
  let observed
  const mutationObserver = function mutationObserver(callback) {
    observed = callback
  }
  mutationObserver.prototype.observe = () => undefined
  mutationObserver.prototype.disconnect = () => undefined
  globalThis.MutationObserver = mutationObserver
  const parseDocument = function parseDocument() {
    // constructable stub
  }
  parseDocument.prototype.parseFromString = () => ({ documentElement: node() })
  globalThis.DOMParser = parseDocument
  const previousChrome = globalThis.chrome
  globalThis.chrome = {
    runtime: {
      sendMessage: (msg) => {
        asked.push(msg)
        return Promise.resolve({
          protocol: 4,
          state: 'ready',
          connected: true,
          games: [{ sources: { modrinth: 'minecraft' } }],
          projects: [],
          ok: true,
        })
      },
    },
    storage: {
      sync: { get: (defaults) => Promise.resolve(defaults) },
      onChanged: { addListener: () => undefined },
    },
  }
  try {
    globalThis.mortarMarketWatch = false
    await import('./projectPages.js?card')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(document.getElementById('mortar-market')).toBeDefined()
    expect(buttons.length).toBeGreaterThan(0)
    buttons[0].click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(asked.some((m) => m.type === 'installProject' && m.project === 'AANobbMI')).toBe(true)
    // Modrinth navigates in place: a leftover canonical still names Sodium, but Install must send Iris.
    globalThis.location.pathname = '/mod/iris'
    observed([{ addedNodes: [node()], removedNodes: [] }])
    await new Promise((resolve) => setTimeout(resolve, afterRepaintMs))
    asked.length = 0
    buttons.at(-1).click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(asked.filter((m) => m.type === 'installProject').map((m) => m.project)).toEqual(['iris'])
  } finally {
    globalThis.chrome = previousChrome
  }
})
