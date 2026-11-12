import { expect, test } from 'bun:test'
import fc from 'fast-check'
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

test('popup ready copy names the open profile and no partial count', () => {
  const line = globalThis.mortarPopupReadyStatus
  expect(line({ modIds: [], packages: [], profile: 'Main' })).toBe(
    'Connected to Mortar · Main is open',
  )
  expect(line({ modIds: [1, 2] })).toBe('Connected to Mortar')
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

test('popup status uses the send error only when the painted reply is not ready', () => {
  const sendFail = { message: 'Could not establish connection' }
  const ready = {
    protocol: 3,
    state: 'ready',
    connected: true,
    profile: 'Main',
    modIds: [1],
  }
  const mixed = globalThis.mortarPopupStatusInput([ready], ready, sendFail)
  expect(mixed.error).toBeUndefined()
  expect(globalThis.mortarInstalledReplyStatus(mixed.reply, mixed.error)).toBe('')
  expect(mixed.reply.modIds).toEqual([1])
  const missing = globalThis.mortarPopupStatusInput([], undefined, sendFail)
  expect(missing.error).toBe(sendFail)
  expect(globalThis.mortarInstalledReplyStatus(missing.reply, missing.error)).toBe(
    "Mortar isn't installed",
  )
})

test('a protocol mismatch names the side to update', () => {
  const state = globalThis.mortarConnectionState
  expect(state({ protocol: 3, state: 'ready', connected: true })).toBe('ready')
  expect(state({ state: 'ready', connected: true })).toBe('mortarOld')
  expect(state({ protocol: 2, state: 'ready', connected: true })).toBe('mortarOld')
  expect(state({ protocol: 4, state: 'ready', connected: true })).toBe('ready')
  expect(state({ protocol: 5, state: 'ready', connected: true })).toBe('extensionOld')
  expect(state({ protocol: 2, protocolError: 'extensionTooOld' })).toBe('extensionOld')
  expect(state({ protocol: 2, protocolError: 'extensionTooNew' })).toBe('mortarOld')
  expect(globalThis.mortarInstalledReplyStatus({ protocol: 2, modIds: [] })).toBe(
    'Update Mortar: it is too old for this browser extension',
  )
  expect(globalThis.mortarLinkResultText({ protocol: 5, ok: true })).toBe(
    'Update the browser extension: it is too old for this Mortar',
  )
  expect(globalThis.mortarUpdatesBadge({ protocol: 5, updates: [] }).state).toBe('extensionOld')
})

const olderProtocol = 3
const currentProtocol = 4
const unspokenProtocol = 2

test('an older Mortar that names a protocol this extension speaks is retried at it', () => {
  const lower = globalThis.mortarFallbackProtocol
  expect(
    lower({ protocolError: 'extensionTooNew', protocol: olderProtocol }, currentProtocol),
  ).toBe(olderProtocol)
  expect(
    lower({ protocolError: 'extensionTooNew', protocol: unspokenProtocol }, currentProtocol),
  ).toBe(0)
  expect(lower({ protocolError: 'extensionTooNew', protocol: olderProtocol }, olderProtocol)).toBe(
    0,
  )
  expect(
    lower({ protocolError: 'extensionTooOld', protocol: olderProtocol }, currentProtocol),
  ).toBe(0)
  expect(lower({ protocol: currentProtocol, ok: true }, currentProtocol)).toBe(0)
})

const sourceNames = {
  github: 'GitHub',
  nexus: 'Nexus Mods',
  thunderstore: 'Thunderstore',
  curseforge: 'CurseForge',
  vsmoddb: 'Mod DB',
  paradox: 'Paradox Mods',
  modrinth: 'Modrinth',
}
const sourceKeys = Object.keys(sourceNames)
const mismatchVerdicts = new Set(['', 'mortarOld', 'extensionOld'])
const mortarProtocolMin = 3

test('mortarSkipSourceLabel never throws and always returns a string', () => {
  expect(() => {
    fc.assert(
      fc.property(fc.anything(), (source) => {
        const label = globalThis.mortarSkipSourceLabel(source)
        return typeof label === 'string'
      }),
    )
  }).not.toThrow()
})

test('mortarSkipSourceLabel does not throw when toString is not callable', () => {
  expect(globalThis.mortarSkipSourceLabel({ toString: 0 })).toBe('')
})

test('mortarSkipSourceLabel maps known sources case-insensitively', () => {
  expect(() => {
    fc.assert(
      fc.property(
        fc.constantFrom(...sourceKeys),
        fc.array(fc.constantFrom('upper', 'lower'), { minLength: 1, maxLength: 12 }),
        (key, cases) => {
          const input = [...key]
            .map((ch, i) =>
              cases[i % cases.length] === 'upper' ? ch.toUpperCase() : ch.toLowerCase(),
            )
            .join('')
          return globalThis.mortarSkipSourceLabel(input) === sourceNames[key]
        },
      ),
    )
  }).not.toThrow()
})

test('mortarSkipSourceLabel returns an unknown source string unchanged', () => {
  expect(() => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const source = `not-a-source:${s}`
        return globalThis.mortarSkipSourceLabel(source) === source
      }),
    )
  }).not.toThrow()
})

test('mortarProtocolMismatch never throws and returns a known verdict', () => {
  expect(() => {
    fc.assert(
      fc.property(fc.anything(), (reply) =>
        mismatchVerdicts.has(globalThis.mortarProtocolMismatch(reply)),
      ),
    )
  }).not.toThrow()
})

test('mortarProtocolMismatch prefers Mortar protocolError over the numeric protocol', () => {
  expect(() => {
    fc.assert(
      fc.property(fc.anything(), (protocol) => {
        const tooOld = globalThis.mortarProtocolMismatch({
          protocol,
          protocolError: 'extensionTooOld',
        })
        const tooNew = globalThis.mortarProtocolMismatch({
          protocol,
          protocolError: 'extensionTooNew',
        })
        return tooOld === 'extensionOld' && tooNew === 'mortarOld'
      }),
    )
  }).not.toThrow()
})

test('mortarFallbackProtocol never throws and stays in range or zero', () => {
  expect(() => {
    fc.assert(
      fc.property(fc.anything(), fc.integer(), (reply, sent) => {
        const offered = globalThis.mortarFallbackProtocol(reply, sent)
        return (
          offered === 0 ||
          (Number.isInteger(offered) && offered >= mortarProtocolMin && offered < sent)
        )
      }),
    )
  }).not.toThrow()
})

test('mortarFallbackProtocol is zero unless Mortar offers a still-spoken older protocol', () => {
  expect(() => {
    fc.assert(
      fc.property(fc.anything(), fc.integer(), (reply, sent) => {
        const offered = globalThis.mortarFallbackProtocol(reply, sent)
        if (offered === 0) {
          return true
        }
        return (
          reply?.protocolError === 'extensionTooNew' &&
          reply?.protocol === offered &&
          Number.isInteger(offered)
        )
      }),
    )
  }).not.toThrow()
})
