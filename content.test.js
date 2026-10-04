import { expect, test } from 'bun:test'
import './plural.js'
import './modPanel.js'
import './hideInProfile.js'
import './listingMarks.js'
import './content.js'

const contentPatcher = 1915
const threeHidden = 3
const tileModID = 7

test('collection tiles use the same /game/mods/id links as listings', () => {
  expect(globalThis.mortarNexusModID(`/stardewvalley/mods/${contentPatcher}`)).toBe(contentPatcher)
  expect(globalThis.mortarNexusModID(`/stardewvalley/mods/${contentPatcher}/files`)).toBe(
    contentPatcher,
  )
  expect(globalThis.mortarNexusModID('/games/stardewvalley/collections/vanilla')).toBeUndefined()
})

test('collection pages are listings for installed-mod markers', () => {
  expect(globalThis.mortarIsNexusModListing('/games/stardewvalley/collections/vanilla')).toBe(true)
  expect(globalThis.mortarIsNexusModListing('/stardewvalley/mods')).toBe(true)
  expect(globalThis.mortarIsNexusModListing('/games/stardewvalley/mods')).toBe(true)
  expect(globalThis.mortarIsNexusModListing('/games/stardewvalley/mods/')).toBe(true)
  expect(globalThis.mortarIsNexusModListing(`/stardewvalley/mods/${contentPatcher}`)).toBe(false)
})

test('hide-in-profile filter stays off when Mortar is disconnected or no profile is open', () => {
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
  expect(globalThis.mortarHideInProfileStorageKey('stardewvalley')).toBe(
    'hideModsInProfile:stardewvalley',
  )
  const disconnected = globalThis.mortarInstalledListingState(
    { connected: false, nativeMessagingError: true },
    true,
  )
  expect(disconnected.connected).toBe(false)
  expect(disconnected.profileOpen).toBe(false)
  const open = globalThis.mortarInstalledListingState(
    { protocol: 1, connected: true, profile: 'Main' },
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
  expect([...tile.names].sort()).toEqual(['gray', 'in'])
  apply({})
  expect([...tile.names]).toEqual(['in'])
  expect(tile.children[0].textContent).toBe('In profile')
  apply({ updates: new Set([tileModID]) })
  expect(tile.children[0].textContent).toBe('Update available')
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
})

test('supported games come from the host reply, Stardew until one arrives', () => {
  expect(globalThis.mortarSupportedGames(undefined)).toEqual(['stardewvalley'])
  expect(globalThis.mortarSupportedGames({ games: [] })).toEqual(['stardewvalley'])
  expect(globalThis.mortarSupportedGames({ games: ['skyrim'] })).toEqual(['skyrim'])
})

// Mortar's Problems check marks the same words (internal/problems authorStatusWord in Rethunk-Tech/mortar).
test('obsolete words match Mortar', () => {
  expect(globalThis.mortarObsoleteWord.source).toBe('\\b(obsolete|deprecated|depreciated)\\b')
})
