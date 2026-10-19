import { expect, test } from 'bun:test'
import './plural.js'
import './settings.js'
import './listingMarks.js'
import './thunderstore.js'

test('package pages are read, other pages are not', () => {
  expect(globalThis.mortarThunderstorePage('/c/lethal-company/p/Alice/MoreCompany/')).toEqual({
    key: 'lethal-company',
    namespace: 'Alice',
    name: 'MoreCompany',
  })
  expect(
    globalThis.mortarThunderstorePage('/c/lethal-company/p/Alice/MoreCompany/v/2.0.0/')?.name,
  ).toBe('MoreCompany')
  expect(globalThis.mortarThunderstorePage('/c/lethal-company/')).toBeUndefined()
  expect(globalThis.mortarThunderstoreListing('/c/lethal-company/')).toEqual({
    key: 'lethal-company',
  })
  expect(globalThis.mortarThunderstoreListing('/c/lethal-company')).toEqual({
    key: 'lethal-company',
  })
  expect(
    globalThis.mortarThunderstoreListing('/c/lethal-company/p/Alice/MoreCompany/'),
  ).toBeUndefined()
})

test('listing package ids match installedPackages case-insensitively', () => {
  const id = globalThis.mortarThunderstorePackageId
  expect(
    id('https://thunderstore.io/c/lethal-company/p/Alice/MoreCompany/', 'lethal-company'),
  ).toBe('alice-morecompany')
  expect(id('/c/lethal-company/p/Alice/MoreCompany/', 'lethal-company')).toBe('alice-morecompany')
  expect(id('/c/lethal-company/p/Alice/MoreCompany/', 'risk-of-rain-2')).toBeUndefined()
  expect(id('/c/lethal-company/', 'lethal-company')).toBeUndefined()
})

test('install result never shows a raw host error', () => {
  const text = globalThis.mortarThunderstoreResultText
  expect(text({ protocol: 3, ok: true })).toBe('Sent to Mortar')
  expect(text({ protocol: 3, error: 'package not in catalog: "x"' })).toBe(
    "Mortar couldn't install this package",
  )
  expect(text(undefined, 'Specified native messaging host not found.')).toBe(
    globalThis.mortarInstallHint,
  )
  expect(text({ nativeMessagingError: true })).toBe(globalThis.mortarInstallHint)
  expect(text({ protocol: 3, state: 'notRunning' })).toBe("Mortar isn't running")
  expect(text({ protocol: 3, state: 'noProfile' })).toBe('Open a profile in Mortar')
})

test('a disconnected package page still names the connection problem', () => {
  const overlay = globalThis.mortarThunderstoreOverlay
  const page = { key: 'lethal-company', namespace: 'Alice', name: 'MoreCompany' }
  expect(overlay(undefined, 'no host', page)).toEqual({
    text: globalThis.mortarInstallHint,
    button: false,
  })
  expect(overlay({ protocol: 3, state: 'notRunning' }, undefined, page)).toEqual({
    text: "Mortar isn't running",
    button: false,
  })
  expect(overlay({ protocol: 3, state: 'ready', games: [], packages: [] }, undefined, page)).toBe(
    undefined,
  )
  const managed = {
    protocol: 3,
    state: 'ready',
    games: [{ sources: { thunderstore: 'lethal-company' } }],
    packages: [],
  }
  expect(overlay(managed, undefined, page)).toEqual({ text: 'Mortar', button: true })
  expect(overlay({ ...managed, packages: ['Alice-MoreCompany'] }, undefined, page)).toEqual({
    text: 'In Mortar profile',
    button: false,
  })
  expect(overlay(managed, undefined, undefined)).toBe(undefined)
})

test('only managed communities with a package in the profile are marked', () => {
  const page = { key: 'lethal-company', namespace: 'Alice', name: 'MoreCompany' }
  const reply = {
    games: [{ id: 'lethal-company', sources: { thunderstore: 'lethal-company' } }],
    packages: ['alice-morecompany'],
  }
  expect(globalThis.mortarThunderstoreManaged(reply, 'lethal-company')).toBe(true)
  expect(globalThis.mortarThunderstoreManaged(reply, 'risk-of-rain-2')).toBe(false)
  expect(globalThis.mortarThunderstoreManaged({ games: [] }, 'lethal-company')).toBe(false)
  expect(globalThis.mortarThunderstoreInstalled(reply, page)).toBe(true)
  expect(globalThis.mortarThunderstoreInstalled({ packages: [] }, page)).toBe(false)
  expect(globalThis.mortarThunderstoreRequest('installPackage', page)).toEqual({
    type: 'installPackage',
    source: 'thunderstore',
    sourceGameKey: 'lethal-company',
    package: 'Alice-MoreCompany',
  })
})

test('a managed listing marks installed packages; unmanaged and Off do not', () => {
  const names = new Set()
  const children = []
  const tile = {
    names,
    classList: {
      toggle: (name, on) => (on ? names.add(name) : names.delete(name)),
      remove: (...list) => {
        for (const name of list) {
          names.delete(name)
        }
      },
    },
    querySelector: () => children[0],
    prepend: (node) => children.unshift(node),
  }
  const link = { href: '/c/lethal-company/p/Alice/MoreCompany/', closest: () => tile }
  const root = {
    querySelectorAll: (sel) => {
      if (sel.includes('/p/')) {
        return [link]
      }
      return names.size > 0 ? [tile] : []
    },
    getElementById: () => undefined,
    createElement: () => ({ textContent: '', classList: { toggle: () => undefined } }),
    documentElement: { append: () => undefined },
  }
  const listing = { key: 'lethal-company' }
  const reply = {
    protocol: 3,
    state: 'ready',
    connected: true,
    games: [{ sources: { thunderstore: 'lethal-company' } }],
    packages: ['Alice-MoreCompany'],
  }
  const paint = (settings, host = reply) =>
    globalThis.mortarPaintThunderstoreListingMarks({
      document: root,
      listing,
      reply: host,
      settings,
    })
  paint({ markInstalled: 'gray' })
  expect([...names].sort()).toEqual(['mortar-hidden-mod', 'mortar-installed-mod'])
  paint({ markInstalled: 'hide' })
  expect([...names]).toEqual(['mortar-removed-mod'])
  paint({ markInstalled: 'off' })
  expect([...names]).toEqual([])
  paint({ markInstalled: 'gray' }, { ...reply, games: [{ sources: { thunderstore: 'other' } }] })
  expect([...names]).toEqual([])
})

test('a package is deprecated when its API record says so, and asked once', async () => {
  const asked = []
  const fetchJson = (path) => {
    asked.push(path)
    if (path.includes('/Broken/')) {
      return Promise.reject(new Error('offline'))
    }
    return Promise.resolve({ is_deprecated: path.includes('/Gone/') })
  }
  const check = (name) =>
    globalThis.mortarThunderstoreDeprecated(fetchJson, { namespace: 'Alice', name })
  expect(await check('Gone')).toBe(true)
  expect(await check('Gone')).toBe(true)
  expect(await check('Fine')).toBe(false)
  expect(await check('Broken')).toBe(false)
  expect(asked).toEqual([
    '/api/experimental/package/Alice/Gone/',
    '/api/experimental/package/Alice/Fine/',
    '/api/experimental/package/Alice/Broken/',
  ])
})

test('Gray out dims deprecated tiles, Hide removes them, Off clears them', async () => {
  const classes = globalThis.mortarDeprecatedClasses
  const names = new Set()
  const tile = {
    classList: { toggle: (name, on) => (on ? names.add(name) : names.delete(name)) },
  }
  const link = { href: '/c/lethal-company/p/Alice/Old/', closest: () => tile }
  const document = { querySelectorAll: () => [link] }
  const listing = { key: 'lethal-company' }
  const fetchJson = () => Promise.resolve({ is_deprecated: true })
  const paint = (markObsolete) =>
    globalThis.mortarPaintThunderstoreDeprecated({
      document,
      listing,
      settings: { markObsolete },
      fetchJson,
    })
  expect(await paint('gray')).toBe(1)
  expect([...names]).toEqual([classes.dim])
  expect(await paint('hide')).toBe(1)
  expect([...names]).toEqual([classes.removed])
  expect(await paint('off')).toBe(0)
  expect(names.size).toBe(0)
})
