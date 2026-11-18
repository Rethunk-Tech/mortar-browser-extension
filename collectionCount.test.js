import { expect, test } from 'bun:test'
import './mortarUi.js'
import './plural.js'
import './modPanel.js'
import './collectionCount.js'

const contentPatcher = 1915
const gmcm = 2400
const farmTypeManager = 1215
const extra = 2403

test('collection page mod ids skip duplicates, off-origin links, and malformed hrefs', () => {
  const hrefs = [
    `/stardewvalley/mods/${contentPatcher}`,
    `https://www.nexusmods.com/stardewvalley/mods/${contentPatcher}/files`,
    `https://other.example/stardewvalley/mods/${gmcm}`,
    `/stardewvalley/mods/${farmTypeManager}`,
    'not a url',
    'http://[',
  ]
  const root = {
    querySelectorAll: () => hrefs.map((href) => ({ getAttribute: () => href })),
  }
  expect(globalThis.mortarCollectionPageModIDs(root, 'https://www.nexusmods.com')).toEqual([
    contentPatcher,
    farmTypeManager,
  ])
})

test('omits the in-profile line when there are no tiles', () => {
  expect(globalThis.mortarCollectionInProfileLine([], new Set([contentPatcher]), 'Main')).toBe('')
})

test('counts collection tiles against the installed id set', () => {
  expect(
    globalThis.mortarCollectionInProfileLine(
      [contentPatcher, gmcm, farmTypeManager],
      new Set([contentPatcher, farmTypeManager, extra]),
      'Main',
    ),
  ).toBe('2 of 3 mods already in Main')
})

test('one mod reads in the singular', () => {
  expect(
    globalThis.mortarCollectionInProfileLine([contentPatcher], new Set([contentPatcher]), 'Main'),
  ).toBe('1 of 1 mod already in Main')
})

test('the in-profile count is created, rewritten when it changes, and removed when disconnected', async () => {
  const rows = []
  const footer = {
    parentNode: {
      insertBefore: (node, before) => {
        expect(before).toBe(footer)
        rows.push(node)
      },
    },
  }
  let footerEl = footer
  const menu = {
    querySelector: (sel) => {
      if (sel === '.footer') {
        return footerEl
      }
      return sel === '.collection-count' ? (rows[0] ?? null) : null
    },
  }
  const shadow = { querySelector: (sel) => (sel === '.menu' ? menu : null) }
  const host = { _mortarMenu: {} }
  const links = [{ getAttribute: () => `/stardewvalley/mods/${contentPatcher}` }]
  const doc = {
    querySelector: (sel) => (sel === '.mortar-collection-panel' ? host : null),
    querySelectorAll: () => links,
    createElement: () => ({
      className: '',
      textContent: '',
      remove() {
        rows.splice(rows.indexOf(this), 1)
      },
    }),
  }
  const prevShadow = globalThis.mortarMenuShadow
  globalThis.mortarMenuShadow = (el) => (el === host ? shadow : undefined)
  const installedIDs = () => Promise.resolve(new Set([contentPatcher]))
  const fill = (cache, ids = installedIDs) =>
    globalThis.mortarFillCollectionInProfile(doc, 'https://www.nexusmods.com', {
      installedIDs: ids,
      installedCache: () => cache,
    })
  try {
    await globalThis.mortarFillCollectionInProfile(
      { querySelector: () => null },
      'https://www.nexusmods.com',
      { installedIDs, installedCache: () => ({ connected: true, profile: 'Main' }) },
    )
    const noMenu = { _mortarMenu: undefined }
    await globalThis.mortarFillCollectionInProfile(
      { querySelector: () => noMenu },
      'https://www.nexusmods.com',
      { installedIDs, installedCache: () => ({ connected: true, profile: 'Main' }) },
    )
    footerEl = null
    await fill({ connected: true, profile: 'Main' })
    footerEl = footer
    await fill({ connected: false, profile: 'Main' })
    expect(rows).toEqual([])

    await fill({ connected: true, profile: 'Main' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual(
      expect.objectContaining({
        className: 'body collection-count',
        textContent: '1 of 1 mod already in Main',
      }),
    )
    const created = rows[0]
    await fill({ connected: true, profile: 'Main' })
    expect(rows[0]).toBe(created)
    await fill({ connected: true, profile: 'Main' }, () => Promise.resolve(new Set()))
    expect(rows[0].textContent).toBe('0 of 1 mod already in Main')
    await fill({ connected: false, profile: 'Main' })
    expect(rows).toEqual([])
  } finally {
    globalThis.mortarMenuShadow = prevShadow
  }
})
