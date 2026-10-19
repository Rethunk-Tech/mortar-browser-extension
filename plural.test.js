import { expect, test } from 'bun:test'
import './plural.js'
import './updates.js'

test('installed reply status follows the host state', () => {
  const status = globalThis.mortarInstalledReplyStatus
  expect(status({ nativeMessagingError: true }, false)).toBe("Mortar isn't installed")
  expect(status({ protocol: 3, state: 'notRunning', connected: false, modIds: [] })).toBe(
    "Mortar isn't running",
  )
  expect(status({ protocol: 3, state: 'noProfile', connected: false, modIds: [] })).toBe(
    'Open a profile in Mortar',
  )
  expect(status({ protocol: 3, state: 'off', modIds: [] })).toBe(
    'Browser extension connection is off in Mortar',
  )
  expect(status({ protocol: 3, modIds: [] }, false)).toBe('Open a profile in Mortar')
  expect(status({ protocol: 3, state: 'ready', connected: true, modIds: [1] }, false)).toBe('')
  expect(status({ protocol: 3, connected: true }, false)).toBe('Mortar could not read this profile')
})

test('only a trusted user gesture runs Mortar UI actions', () => {
  const ran = []
  globalThis.mortarIfTrusted({ isTrusted: false }, () => ran.push('no'))
  globalThis.mortarIfTrusted({}, () => ran.push('no'))
  globalThis.mortarIfTrusted({ isTrusted: true }, () => ran.push('yes'))
  expect(ran).toEqual(['yes'])
})

test('a failed nxm send can be retried', () => {
  expect(globalThis.mortarNxmKeepSent({ ok: true })).toBe(true)
  expect(globalThis.mortarNxmKeepSent({ nativeMessagingError: true })).toBe(false)
  expect(globalThis.mortarNxmKeepSent({ ok: true }, { message: 'disconnected' })).toBe(false)
})

test('collection link result never shows a raw host error', () => {
  const text = globalThis.mortarLinkResultText
  expect(text({ protocol: 3, ok: true })).toBe('Sent to Mortar')
  expect(text({ protocol: 3, error: 'not an nxm or collection link: "x"' })).toBe(
    "Mortar couldn't open this collection",
  )
  expect(text(undefined, 'Specified native messaging host not found.')).toBe(
    globalThis.mortarInstallHint,
  )
  expect(text({ nativeMessagingError: true })).toBe(globalThis.mortarInstallHint)
  expect(text({ protocol: 3, state: 'notRunning' })).toBe("Mortar isn't running")
  expect(text({ protocol: 3, state: 'off' })).toBe('Browser extension connection is off in Mortar')
})

test('skipped sources use the same names as the rest of the UI', () => {
  const label = globalThis.mortarSkipSourceLabel
  expect(label('github')).toBe('GitHub')
  expect(label('nexus')).toBe('Nexus Mods')
  expect(label('thunderstore')).toBe('Thunderstore')
  expect(label('Thunderstore')).toBe('Thunderstore')
  expect(label('other')).toBe('other')
})

test('AskEachGame picks the first ready game reply, else the first, else the probe', async () => {
  const nexus = (domain) => ({ sources: { nexus: domain } })
  const two = [nexus('stardewvalley'), nexus('skyrimspecialedition')]
  const probeEmpty = { protocol: 3, state: 'noProfile', games: [] }
  const probeTwo = { protocol: 3, state: 'noProfile', games: two }
  const notReady = { protocol: 3, state: 'noProfile', games: two }
  const ready = { protocol: 3, state: 'ready', connected: true, games: two }
  for (const { replies, games, primary } of [
    { replies: { '': probeEmpty }, games: [], primary: probeEmpty },
    {
      replies: { '': probeTwo, stardewvalley: notReady, skyrimspecialedition: ready },
      games: ['stardewvalley', 'skyrimspecialedition'],
      primary: ready,
    },
    {
      replies: { '': probeTwo, stardewvalley: notReady, skyrimspecialedition: notReady },
      games: ['stardewvalley', 'skyrimspecialedition'],
      primary: notReady,
    },
  ]) {
    const got = await globalThis.mortarAskEachGame(async (game) => replies[game])
    expect(got.games).toEqual(games)
    expect(got.primary).toBe(primary)
  }
})

test('popup ready copy names Nexus and Thunderstore counts separately', () => {
  const line = globalThis.mortarPopupReadyStatus
  expect(line({ modIds: [1, 2], profile: 'Main' })).toBe(
    'Connected to Mortar · 2 Nexus mods in Main',
  )
  expect(line({ modIds: [1], profile: 'Main', packages: [] })).toBe(
    'Connected to Mortar · 1 Nexus mod in Main',
  )
  expect(line({ modIds: [], profile: 'Main', packages: ['A-B'] })).toBe(
    'Connected to Mortar · 1 Thunderstore package in Main',
  )
  expect(line({ modIds: [1], profile: 'Main', packages: ['A-B', 'C-D'] })).toBe(
    'Connected to Mortar · 1 Nexus mod and 2 Thunderstore packages in Main',
  )
  expect(line({ modIds: [], packages: [] })).toBe(
    'Connected to Mortar · the open profile has no mods',
  )
})

test('Thunderstore communities come from sources.thunderstore, not Nexus domains', () => {
  expect(globalThis.mortarThunderstoreCommunities(undefined)).toEqual([])
  expect(
    globalThis.mortarThunderstoreCommunities({
      games: [
        { sources: { nexus: 'stardewvalley', thunderstore: 'stardewvalley' } },
        { sources: { nexus: 'skyrimspecialedition', thunderstore: '' } },
        { sources: { thunderstore: 'lethal-company' } },
        { sources: { nexus: 'only-nexus' } },
      ],
    }),
  ).toEqual(['stardewvalley', 'lethal-company'])
})

test('popup status uses lastError only when the painted reply is not ready', () => {
  const sendFail = { message: 'Could not establish connection' }
  const ready = {
    protocol: 3,
    state: 'ready',
    connected: true,
    profile: 'Main',
    modIds: [1],
  }
  const mixed = globalThis.mortarPopupStatusInput([ready], ready, sendFail)
  expect(mixed.lastError).toBeUndefined()
  expect(globalThis.mortarInstalledReplyStatus(mixed.reply, mixed.lastError)).toBe('')
  expect(mixed.reply.modIds).toEqual([1])
  const missing = globalThis.mortarPopupStatusInput([], undefined, sendFail)
  expect(missing.lastError).toBe(sendFail)
  expect(globalThis.mortarInstalledReplyStatus(missing.reply, missing.lastError)).toBe(
    "Mortar isn't installed",
  )
})

test('a protocol mismatch names the side to update', () => {
  const state = globalThis.mortarConnectionState
  expect(state({ protocol: 3, state: 'ready', connected: true })).toBe('ready')
  expect(state({ state: 'ready', connected: true })).toBe('mortarOld')
  expect(state({ protocol: 2, state: 'ready', connected: true })).toBe('mortarOld')
  expect(state({ protocol: 4, state: 'ready', connected: true })).toBe('extensionOld')
  expect(state({ protocol: 2, protocolError: 'extensionTooOld' })).toBe('extensionOld')
  expect(state({ protocol: 2, protocolError: 'extensionTooNew' })).toBe('mortarOld')
  expect(globalThis.mortarInstalledReplyStatus({ protocol: 2, modIds: [] })).toBe(
    'Update Mortar: it is too old for this browser extension',
  )
  expect(globalThis.mortarLinkResultText({ protocol: 4, ok: true })).toBe(
    'Update the browser extension: it is too old for this Mortar',
  )
  expect(globalThis.mortarUpdatesBadge({ protocol: 4, updates: [] }).state).toBe('extensionOld')
})
