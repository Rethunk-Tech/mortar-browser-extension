import { expect, test } from 'bun:test'

await import('./projectSites.js')

const { curseforge, vsmoddb } = globalThis.mortarProjectSites

const restore = (keys) => {
  const prev = Object.fromEntries(keys.map((k) => [k, globalThis[k]]))
  return () => {
    for (const k of keys) {
      globalThis[k] = prev[k]
    }
  }
}

const watchKeys = [
  'document',
  'location',
  'chrome',
  'fetch',
  'mortarAsk',
  'mortarReadSettings',
  'mortarSetAccent',
  'mortarConnectionState',
  'mortarInstalledMode',
  'mortarSimpleListingClasses',
  'mortarCollectInstalledTiles',
  'mortarEnsureSimpleListingStyle',
  'mortarClearUnlistedMarks',
  'mortarApplyListingHideMarks',
  'mortarShowFilterBox',
  'mortarFilterBoxRows',
  'mortarStateText',
  'mortarHostResultText',
  'mortarCornerCard',
  'mortarRemoveFilterBox',
  'mortarWhenSiteEnabled',
  'mortarProjectWatch',
]

const clickEvt = () => ({
  preventDefault: () => undefined,
  stopImmediatePropagation: () => undefined,
})

const profileAsk = (msg) => {
  if (msg?.type === 'installedProjects' && msg.sourceGameKey === '') {
    return { reply: { games: [{ sources: { curseforge: 'mc' } }], accent: '#f00' } }
  }
  if (msg?.link) {
    return { reply: { ok: true } }
  }
  return { reply: { projects: [{ id: 'jei' }] } }
}

const startWatch = () => {
  const assigned = []
  const storage = []
  const cards = new Map()
  const docListeners = {}
  const ctx = {
    mode: 'highlight',
    state: 'ready',
    askImpl: profileAsk,
    fetchImpl: () => ({ ok: false, text: () => '' }),
    assigned,
    storage,
    enable: undefined,
    disable: undefined,
    resolvePaint: undefined,
    docListeners,
  }
  globalThis.document = {
    getElementById: (id) => cards.get(id) || null,
    querySelectorAll: () => [],
    querySelector: (sel) => (sel === 'h1' ? { textContent: 'Just Enough Items' } : null),
    addEventListener(type, fn, cap) {
      docListeners[`${type}:${cap}`] = fn
    },
    createElement: (tag) => ({
      tag,
      className: '',
      textContent: '',
      append: () => undefined,
    }),
  }
  globalThis.location = {
    host: 'www.curseforge.com',
    origin: 'https://www.curseforge.com',
    pathname: '/minecraft/mc-mods/jei/',
    assign: (href) => assigned.push(href),
  }
  globalThis.chrome = {
    storage: {
      onChanged: {
        addListener(fn) {
          storage.push(fn)
          throw new Error('no live storage')
        },
      },
    },
  }
  globalThis.fetch = (...args) => ctx.fetchImpl(...args)
  globalThis.mortarAsk = (msg) => ctx.askImpl(msg)
  globalThis.mortarReadSettings = () => ({})
  globalThis.mortarSetAccent = () => undefined
  globalThis.mortarConnectionState = (_reply, error) => (error ? 'error' : ctx.state)
  globalThis.mortarInstalledMode = () => ctx.mode
  globalThis.mortarSimpleListingClasses = { gray: 'g', hide: 'h' }
  globalThis.mortarCollectInstalledTiles = () => new Map([['tile', 1]])
  globalThis.mortarEnsureSimpleListingStyle = () => undefined
  globalThis.mortarClearUnlistedMarks = () => undefined
  globalThis.mortarApplyListingHideMarks = () => undefined
  globalThis.mortarShowFilterBox = () => ctx.resolvePaint?.()
  globalThis.mortarFilterBoxRows = (_settings, rows) => rows
  globalThis.mortarStateText = (s) => `state:${s}`
  globalThis.mortarHostResultText = (_reply, error) => (error ? String(error) : 'host')
  globalThis.mortarCornerCard = (_doc, opts, fill) => {
    const card = {
      id: opts.id,
      remove() {
        cards.delete(opts.id)
      },
      append: () => undefined,
    }
    cards.set(opts.id, card)
    fill(card)
  }
  globalThis.mortarRemoveFilterBox = () => undefined
  globalThis.mortarWhenSiteEnabled = (_key, on, off) => {
    ctx.enable = on
    ctx.disable = off
  }
  globalThis.mortarProjectWatch = false
  return ctx
}

test('curseforge listing and page keys, install anchors, and resolved curseforge:// links', async () => {
  const link = {
    href: 'https://www.curseforge.com/minecraft/mc-mods/jei',
    textContent: 'Just Enough Items',
  }
  expect(curseforge.listingKeys(link)).toEqual(['jei', 'just enough items'])
  expect(
    curseforge.listingKeys({ href: 'https://www.curseforge.com/not/a/mod/page/extra' }),
  ).toEqual([])
  expect(curseforge.listingKeys({ href: 'not-a-url' })).toEqual([])

  const dt = {
    textContent: 'Project ID',
    nextElementSibling: { textContent: ' 238222 ' },
  }
  const doc = {
    querySelectorAll: () => [dt],
    querySelector: () => ({ textContent: 'Just Enough Items' }),
  }
  expect(curseforge.pageKeys(doc, '/minecraft/mc-mods/JEI/')).toEqual([
    '238222',
    'jei',
    'just enough items',
  ])
  expect(curseforge.pageKeys(doc, '/minecraft/mc-mods/')).toEqual([])

  const origin = 'https://www.curseforge.com'
  const install = `${origin}/minecraft/mc-mods/jei/install/99`
  expect(curseforge.installAnchor(install, origin)).toBe(install)
  expect(curseforge.installAnchor(install, 'https://other.example')).toBeUndefined()
  expect(curseforge.installAnchor(`${origin}/minecraft/mc-mods/jei`, origin)).toBeUndefined()

  const html =
    'noise curseforge://install?fileId=1&amp;game=1 curseforge://install?fileId=99&amp;game=1'
  await expect(curseforge.resolveLink(install, () => html)).resolves.toBe(
    'curseforge://install?fileId=99&game=1',
  )
  await expect(curseforge.resolveLink(`${origin}/mods/jei`, () => html)).resolves.toBeUndefined()
  await expect(curseforge.resolveLink(install, () => 'none')).resolves.toBeUndefined()
})

test('vsmoddb keys from asset id or alias, install protocol, and passthrough resolve', async () => {
  expect(vsmoddb.listingKeys({ href: 'https://mods.vintagestory.at/show/mod/42' })).toEqual(['42'])
  expect(vsmoddb.listingKeys({ href: 'https://mods.vintagestory.at/Cool_Mod' })).toEqual([
    'cool_mod',
  ])
  expect(vsmoddb.listingKeys({ href: 'https://mods.vintagestory.at/a/b' })).toEqual([])

  const doc = {
    querySelector: () => ({ href: 'https://mods.vintagestory.at/show/mod/42' }),
  }
  expect(vsmoddb.pageKeys(doc, '/Cool_Mod')).toEqual(['cool_mod', '42'])
  expect(vsmoddb.pageKeys({ querySelector: () => null }, '/Cool_Mod')).toEqual(['cool_mod'])

  expect(vsmoddb.installAnchor('VintageStoryModInstall://pack')).toBe(
    'VintageStoryModInstall://pack',
  )
  expect(vsmoddb.installAnchor('https://mods.vintagestory.at/x')).toBeUndefined()
  await expect(vsmoddb.resolveLink('VintageStoryModInstall://pack')).resolves.toBe(
    'VintageStoryModInstall://pack',
  )
})

test('project keys, game keys, install-anchor lookup, and overlay copy', () => {
  const undo = restore(['mortarConnectionState', 'mortarHostResultText'])
  expect([
    ...globalThis.mortarProjectKeys(curseforge, [
      { id: 1, slug: 'Jei', name: 'Just Enough Items' },
    ]),
  ]).toEqual(['1', 'jei', 'just enough items'])
  expect([...globalThis.mortarProjectKeys(vsmoddb, { id: 1 })]).toEqual([])
  expect(
    [...globalThis.mortarProjectKeys(vsmoddb, [undefined, { id: 2, slug: '' }])].sort((a, b) =>
      a.localeCompare(b),
    ),
  ).toEqual(['2', 'undefined'])

  expect(globalThis.mortarProjectGameKeys(undefined, 'curseforge')).toEqual([])
  expect(
    globalThis.mortarProjectGameKeys(
      {
        games: [
          { sources: { curseforge: 'mc' } },
          { sources: { curseforge: '' } },
          { sources: { vsmoddb: 'vs' } },
          {},
        ],
      },
      'curseforge',
    ),
  ).toEqual(['mc'])

  const origin = 'https://www.curseforge.com'
  const href = `${origin}/minecraft/mc-mods/jei/install/99`
  expect(
    globalThis.mortarProjectInstallAnchor(curseforge, { closest: () => ({ href }) }, origin),
  ).toBe(href)
  expect(globalThis.mortarProjectInstallAnchor(curseforge, {}, origin)).toBeUndefined()
  expect(
    globalThis.mortarProjectInstallAnchor(curseforge, { closest: () => ({ href: 1 }) }, origin),
  ).toBeUndefined()

  globalThis.mortarConnectionState = (_reply, error) => (error ? 'error' : 'ready')
  globalThis.mortarHostResultText = (_reply, error) => String(error)
  expect(globalThis.mortarProjectOverlay({}, 'down', true)).toBe('down')
  expect(globalThis.mortarProjectOverlay({}, undefined, true)).toBe('In Mortar profile')
  expect(globalThis.mortarProjectOverlay({}, undefined, false)).toBeUndefined()
  undo()
})

test('project site watch paints listings, overlay, clicks, and disable', async () => {
  const undo = restore(watchKeys)
  const ctx = startWatch()
  const waitPaint = () => {
    const done = new Promise((r) => {
      ctx.resolvePaint = r
    })
    ctx.enable()
    return done
  }
  const install = 'https://www.curseforge.com/minecraft/mc-mods/jei/install/99'
  try {
    await import('./projectSites.js?watch=1')
    expect(globalThis.mortarProjectWatch).toBe(true)
    const click = ctx.docListeners['click:true']
    click({ target: {}, isTrusted: true, ...clickEvt() })
    await waitPaint()
    ctx.askImpl = () => ({ reply: { games: [] } })
    await waitPaint()
    ctx.askImpl = profileAsk
    ctx.mode = 'hide'
    ctx.storage[0]?.({}, 'sync')
    ctx.storage[0]?.({}, 'local')
    await waitPaint()
    ctx.mode = 'off'
    await waitPaint()
    ctx.state = 'error'
    await waitPaint()
    click({ target: { closest: () => ({ href: install }) }, isTrusted: false, ...clickEvt() })
    click({ target: { closest: () => ({ href: install }) }, isTrusted: true, ...clickEvt() })
    await new Promise((r) => setTimeout(r, 0))
    expect(ctx.assigned.length).toBeGreaterThan(0)
    ctx.askImpl = (msg) => (msg?.link ? { error: true } : { reply: { games: [] } })
    ctx.fetchImpl = () => ({ ok: true, text: () => 'curseforge://install?fileId=99' })
    click({ target: { closest: () => ({ href: install }) }, isTrusted: true, ...clickEvt() })
    await new Promise((r) => setTimeout(r, 0))
    ctx.askImpl = (msg) => {
      if (msg?.link) {
        throw new Error('host down')
      }
      return { reply: { games: [] } }
    }
    click({ target: { closest: () => ({ href: install }) }, isTrusted: true, ...clickEvt() })
    await new Promise((r) => setTimeout(r, 0))
    ctx.disable()
    expect(globalThis.document.getElementById('mortar-project')).toBeNull()
  } finally {
    undo()
  }
})
