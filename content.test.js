import { expect, test } from 'bun:test'
import './mortarUi.js'
import './plural.js'
import './modPanel.js'
import './hideInProfile.js'
import './listingMarks.js'
import './siteToggle.js'
import './content.js'

const contentPatcher = 1915
const threeHidden = 3
const tileModID = 7

test('collection tiles use the same /game/mods/id links as listings', () => {
  expect(globalThis.mortarNexusModID(`/stardewvalley/mods/${contentPatcher}`)).toBe(contentPatcher)
  expect(globalThis.mortarNexusModID(`/stardewvalley/mods/${contentPatcher}/files`)).toBe(
    contentPatcher,
  )
  expect(globalThis.mortarNexusModID(`/games/stardewvalley/mods/${contentPatcher}`)).toBe(
    contentPatcher,
  )
  expect(globalThis.mortarNexusModID('/games/stardewvalley/collections/vanilla')).toBeUndefined()
})

test('a /games/ listing tile on a /games/ mods page is a mod', () => {
  const pagePath = '/games/stardewvalley/mods'
  const href = `/games/stardewvalley/mods/${contentPatcher}`
  const parts = (pathname) => pathname.split('/').filter(Boolean)
  const gameOf = (pathname) =>
    parts(pathname)[0] === 'games' ? parts(pathname)[1] : parts(pathname)[0]
  const pageGame = gameOf(pagePath)
  const tile = { id: 'tile' }
  const link = { href: `https://www.nexusmods.com${href}` }
  const origin = 'https://www.nexusmods.com'
  const tiles = globalThis.mortarCollectInstalledTiles({
    root: { querySelectorAll: () => [link] },
    ids: new Set([contentPatcher]),
    modID: (h) => {
      const url = new URL(h)
      if (url.origin !== origin || gameOf(url.pathname) !== pageGame) {
        return
      }
      return globalThis.mortarNexusModID(url.pathname)
    },
    tileFor: () => tile,
  })
  expect([...tiles.entries()]).toEqual([[tile, contentPatcher]])
})

test('collection pages are listings for installed-mod markers', () => {
  expect(globalThis.mortarIsNexusModListing('/games/stardewvalley/collections/vanilla')).toBe(true)
  expect(globalThis.mortarIsNexusModListing('/stardewvalley/mods')).toBe(true)
  expect(globalThis.mortarIsNexusModListing('/games/stardewvalley/mods')).toBe(true)
  expect(globalThis.mortarIsNexusModListing('/games/stardewvalley/mods/')).toBe(true)
  expect(globalThis.mortarIsNexusModListing(`/stardewvalley/mods/${contentPatcher}`)).toBe(false)
  expect(globalThis.mortarIsNexusModListing('/stardewvalley/search')).toBe(true)
  expect(globalThis.mortarIsNexusModListing('/games/stardewvalley/search')).toBe(true)
})

test('hide-in-profile filter stays off when Mortar is disconnected or no profile is open', () => {
  expect(
    globalThis.mortarHideInProfileControl({
      connected: false,
      profileOpen: false,
      enabled: true,
      status: "Mortar isn't installed",
    }),
  ).toEqual({
    disabled: true,
    hide: false,
    title: "Mortar isn't installed",
  })
  expect(
    globalThis.mortarHideInProfileControl({
      connected: false,
      profileOpen: false,
      enabled: true,
    }),
  ).toEqual({
    disabled: true,
    hide: false,
    title: "Mortar isn't running",
  })
  expect(
    globalThis.mortarHideInProfileControl({
      connected: true,
      profileOpen: false,
      enabled: true,
    }),
  ).toEqual({
    disabled: true,
    hide: false,
    title: 'Open a profile in Mortar',
  })
  expect(
    globalThis.mortarHideInProfileControl({
      connected: true,
      profileOpen: true,
      enabled: true,
    }),
  ).toEqual({ disabled: false, hide: true, title: '' })
  expect(globalThis.mortarHiddenModsCountLabel(threeHidden)).toBe('(3)')
  const disconnected = globalThis.mortarInstalledListingState(
    { connected: false, nativeMessagingError: true },
    true,
  )
  expect(disconnected.connected).toBe(false)
  expect(disconnected.profileOpen).toBe(false)
  const connectedNoProfile = globalThis.mortarInstalledListingState(
    { protocol: 3, connected: true },
    undefined,
  )
  expect(connectedNoProfile.connected).toBe(true)
  expect(connectedNoProfile.profileOpen).toBe(false)
  const open = globalThis.mortarInstalledListingState(
    { protocol: 3, connected: true, profile: 'Main' },
    undefined,
    new Set([contentPatcher]),
  )
  expect(open.connected).toBe(true)
  expect(open.profileOpen).toBe(true)
  expect(open.ids.has(contentPatcher)).toBe(true)
})

test('mortarCollectionURL returns canonical collection links', () => {
  expect(globalThis.mortarCollectionURL('/games/stardewvalley/collections/vanilla')).toBe(
    'https://www.nexusmods.com/games/stardewvalley/collections/vanilla',
  )
  expect(
    globalThis.mortarCollectionURL('/games/stardewvalley/collections/vanilla/revisions/3'),
  ).toBe('https://www.nexusmods.com/games/stardewvalley/collections/vanilla')
  expect(globalThis.mortarCollectionURL(`/stardewvalley/mods/${contentPatcher}`)).toBeUndefined()
})

test('obsolete listing tiles follow Mortar author-marked rule', () => {
  const obsolete = globalThis.mortarObsoleteText
  expect(obsolete('[OBSOLETE] Better Crafting', '')).toBe(true)
  expect(obsolete('Tractor Mod (Deprecated)', 'Buy a tractor.')).toBe(true)
  expect(obsolete('Some Mod', 'Depreciated: use Other Mod instead.')).toBe(true)
  expect(obsolete('Some Mod', 'This mod is obsolete since 1.6.')).toBe(true)
  expect(obsolete('Some Mod', 'Intro text.\nOBSOLETE')).toBe(true)
  expect(obsolete('New Fishing', 'Replaces the obsolete Old Fishing mod.')).toBe(false)
  expect(obsolete('Normal Mod', 'A normal summary.')).toBe(false)
})

test('a second site start does not observe the same root twice', () => {
  let observes = 0
  let disconnects = 0
  const Observer = class {
    observe() {
      observes += 1
    }
    disconnect() {
      disconnects += 1
    }
  }
  const watch = globalThis.mortarCreateSiteWatch(Observer)
  const root = {}
  expect(watch.watch(root, () => undefined, {})).toBe(true)
  expect(watch.watch(root, () => undefined, {})).toBe(false)
  expect(observes).toBe(1)
  watch.stop()
  expect(disconnects).toBe(1)
  expect(watch.watch(root, () => undefined, {})).toBe(true)
  expect(watch.watch(root, () => undefined, {})).toBe(false)
  expect(observes).toBe(2)
})

test('a failed installed lookup is asked again on the next installedIDs()', () => {
  const ttl = 60_000
  const now = Date.now()
  const failed = globalThis.mortarInstalledListingState({ nativeMessagingError: true }, true)
  failed.game = 'stardewvalley'
  expect(failed.at).toBe(0)
  expect(failed.nativeFail).toBe(true)
  expect(globalThis.mortarInstalledCacheHit(failed, 'stardewvalley', now, ttl)).toBe(false)
  const unusable = globalThis.mortarInstalledListingState(
    { protocol: 3, state: 'notRunning', connected: false, modIds: [] },
    undefined,
  )
  unusable.game = 'stardewvalley'
  expect(unusable.at).toBe(0)
  expect(globalThis.mortarInstalledCacheHit(unusable, 'stardewvalley', now, ttl)).toBe(false)
  const ok = globalThis.mortarInstalledListingState(
    { protocol: 3, state: 'ready', connected: true, profile: 'Main', modIds: [1] },
    undefined,
    new Set([1]),
  )
  ok.game = 'stardewvalley'
  expect(ok.at).toBeGreaterThan(0)
  expect(globalThis.mortarInstalledCacheHit(ok, 'stardewvalley', ok.at, ttl)).toBe(true)
})

test('broken ids from the installed reply dim matching tiles', () => {
  const brokenModId = 42
  const state = globalThis.mortarInstalledListingState(
    { connected: false, brokenIds: [brokenModId] },
    undefined,
  )
  expect(state.broken.has(brokenModId)).toBe(true)
  expect(state.nativeFail).toBe(false)
  expect(globalThis.mortarInstalledListingState({ nativeMessagingError: true }).nativeFail).toBe(
    true,
  )
})

test('download dialog follows its own link in either Nexus form, never a requirement', () => {
  const pageMod = 23_374
  const own = (href) =>
    globalThis.mortarIsOwnDialogDownload(new URL(href, 'https://www.nexusmods.com'), pageMod)
  expect(own('/api/files/5596342520200/download?nmm=1')).toBe(true)
  expect(own('/stardewvalley/mods/23374?tab=files&file_id=1&nmm=1')).toBe(true)
  expect(own('/stardewvalley/mods/2400?tab=files&file_id=1&nmm=1')).toBe(false)
})

test('listing marks: Hide removes tiles, gray dims them, Off clears everything', () => {
  const classes = {
    markerClass: 'in',
    hiddenClass: 'gray',
    removedClass: 'gone',
    badgeClass: 'badge',
  }
  const makeTile = () => {
    const names = new Set()
    const children = []
    return {
      names,
      children,
      classList: {
        toggle: (name, on) => (on ? names.add(name) : names.delete(name)),
        add: (name) => names.add(name),
        remove: (...list) => forEach(list, (name) => names.delete(name)),
      },
      querySelector: () => children[0],
      prepend: (node) => children.unshift(node),
    }
  }
  const forEach = (list, fn) => list.forEach(fn)
  const doc = {
    createElement: () => ({ textContent: '', classList: { toggle: () => undefined } }),
  }
  const tile = makeTile()
  const apply = (extra) =>
    globalThis.mortarApplyListingHideMarks({
      document: doc,
      tiles: new Map([[tile, tileModID]]),
      gray: false,
      remove: false,
      updates: new Set(),
      ...classes,
      ...extra,
    })
  apply({ remove: true })
  expect([...tile.names]).toEqual(['gone'])
  apply({ gray: true })
  expect([...tile.names].sort((a, b) => Number(a > b) - Number(a < b))).toEqual(['gray', 'in'])
  apply({})
  expect([...tile.names]).toEqual(['in'])
  expect(tile.children[0].textContent).toBe('In profile')
  apply({ updates: new Set([tileModID]) })
  expect(tile.children[0].textContent).toBe('Update available')
})

test('the Nexus filter sidebar is the filters-panel, else the region around a site checkbox', () => {
  const hideControlId = 'mortar-hide-in-profile'
  const panel = { id: 'filters-panel' }
  const region = { id: 'filters' }
  const ours = { closest: (sel) => (sel === `#${hideControlId}` ? {} : undefined) }
  const site = {
    closest: (sel) => (sel === `#${hideControlId}` ? null : region),
  }
  const root = (filtersPanel, boxes) => ({
    getElementById: (id) => (id === 'filters-panel' ? filtersPanel : null),
    querySelectorAll: () => boxes,
  })
  expect(globalThis.mortarFindNexusFilterSidebar(root(panel, []), hideControlId)).toBe(panel)
  expect(globalThis.mortarFindNexusFilterSidebar(root(null, [ours, site]), hideControlId)).toBe(
    region,
  )
  expect(globalThis.mortarFindNexusFilterSidebar(root(null, [ours]), hideControlId)).toBeUndefined()
})

test('dim marks count matching tiles and Hide removes them instead of dimming', () => {
  const tile = () => {
    const names = new Set()
    return {
      names,
      classList: {
        toggle: (name, on) => (on ? names.add(name) : names.delete(name)),
      },
    }
  }
  const match = tile()
  const other = tile()
  const root = { querySelectorAll: () => [match, other] }
  const dim = (node) => node === match
  expect(globalThis.mortarApplyDimMarks({ root, enabled: true, dimClass: 'dim', dim })).toBe(1)
  expect([...match.names]).toEqual(['dim'])
  expect([...other.names]).toEqual([])
  expect(
    globalThis.mortarApplyDimMarks({
      root,
      enabled: true,
      dimClass: 'dim',
      dim,
      remove: true,
      removedClass: 'gone',
    }),
  ).toBe(1)
  expect([...match.names]).toEqual(['gone'])
  expect(
    globalThis.mortarApplyDimMarks({
      root,
      enabled: false,
      dimClass: 'dim',
      dim: () => true,
    }),
  ).toBe(0)
})

test('only mod tiles are matched for marks', () => {
  const tile = { id: 'tile' }
  const link = { href: 'https://www.nexusmods.com/stardewvalley/mods/5' }
  const stray = { href: 'https://www.nexusmods.com/stardewvalley/mods/5' }
  const root = { querySelectorAll: () => [link, stray] }
  const tiles = globalThis.mortarCollectInstalledTiles({
    root,
    ids: new Set([tileModID]),
    modID: () => tileModID,
    tileFor: (a) => (a === link ? tile : undefined),
  })
  expect([...tiles.entries()]).toEqual([[tile, tileModID]])
  const tsLink = { href: '/c/lethal-company/p/Alice/MoreCompany/' }
  const tsTiles = globalThis.mortarCollectInstalledTiles({
    root: { querySelectorAll: (sel) => (sel.includes('/p/') ? [tsLink] : []) },
    ids: new Set(['alice-morecompany']),
    modID: () => 'alice-morecompany',
    tileFor: () => tile,
    linkSelector: 'a[href*="/p/"]',
  })
  expect([...tsTiles.entries()]).toEqual([[tile, 'alice-morecompany']])
})

test('supported games come from the host reply, none until one arrives', () => {
  expect(globalThis.mortarSupportedGames(undefined)).toEqual([])
  expect(globalThis.mortarSupportedGames({ games: [] })).toEqual([])
  const games = [
    { id: 'stardew', name: 'Stardew Valley', sources: { nexus: 'stardewvalley' } },
    { id: 'skyrim-se', name: 'Skyrim', sources: { nexus: 'skyrimspecialedition', github: 'x' } },
    { id: 'other', name: 'Other', sources: {} },
  ]
  expect(globalThis.mortarSupportedGames({ games })).toEqual([
    'stardewvalley',
    'skyrimspecialedition',
  ])
  expect(globalThis.mortarGameID({ games }, 'skyrimspecialedition')).toBe('skyrim-se')
  expect(globalThis.mortarGameID({ games }, 'nope')).toBeUndefined()
  expect(globalThis.mortarGameRequest('mod', 'stardewvalley', { modId: 3 })).toEqual({
    type: 'mod',
    source: 'nexus',
    sourceGameKey: 'stardewvalley',
    modId: 3,
  })
})

// Mortar's Problems check marks the same words (internal/problems authorStatusWord in Rethunk-Tech/mortar).
test('obsolete words match Mortar', () => {
  expect(globalThis.mortarObsoleteWord.source).toBe('\\b(obsolete|deprecated|depreciated)\\b')
})

test('only an nxm link for the page own mod or collection is sent on sight', () => {
  const sends = (link, path) => globalThis.mortarNxmNamesPage(link, path)
  expect(sends('nxm://stardewvalley/mods/1915/files/2?key=k', '/stardewvalley/mods/1915')).toBe(
    true,
  )
  expect(sends('nxm://stardewvalley/mods/1915/files/2', '/games/stardewvalley/mods/1915/')).toBe(
    true,
  )
  expect(
    sends(
      'nxm://stardewvalley/collections/vanilla/revisions/3',
      '/games/stardewvalley/collections/vanilla',
    ),
  ).toBe(true)
  expect(sends('nxm://stardewvalley/mods/9/files/2', '/stardewvalley/mods/1915')).toBe(false)
  expect(sends('nxm://skyrim/mods/1915/files/2', '/stardewvalley/mods/1915')).toBe(false)
  expect(sends('nxm://stardewvalley/mods/1915/files/2', '/stardewvalley/mods')).toBe(false)
  expect(
    sends(
      'nxm://stardewvalley/collections/other/revisions/1',
      '/games/stardewvalley/collections/vanilla',
    ),
  ).toBe(false)
  expect(
    sends('https://www.nexusmods.com/stardewvalley/mods/1915', '/stardewvalley/mods/1915'),
  ).toBe(false)
})
