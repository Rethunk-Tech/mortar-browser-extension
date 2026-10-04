import { expect, test } from 'bun:test'
import './modPanel.js'
import './hideInProfile.js'
import './content.js'

const contentPatcher = 1915
const threeHidden = 3

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
    title: 'Mortar is not connected',
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
    title: 'No profile is open',
  })
  expect(
    globalThis.mortarHideInProfileControl({
      connected: true,
      profileOpen: true,
      enabled: true,
    }),
  ).toEqual({ disabled: false, hide: true, title: '' })
  expect(globalThis.mortarListingTileHidden(true, true)).toBe(true)
  expect(globalThis.mortarListingTileHidden(true, false)).toBe(false)
  expect(globalThis.mortarListingTileHidden(false, true)).toBe(false)
  expect(globalThis.mortarHiddenModsCountLabel(threeHidden)).toBe('(3 hidden)')
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
    { connected: true, profile: 'Main' },
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
