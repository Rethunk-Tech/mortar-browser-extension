import { expect, test } from 'bun:test'
import fc from 'fast-check'
import './plural.js'

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

test('mortarSkipSourceLabel never throws and always returns a string', () => {
  fc.assert(
    fc.property(fc.anything(), (source) => {
      const label = globalThis.mortarSkipSourceLabel(source)
      return typeof label === 'string'
    }),
  )
})

test('mortarSkipSourceLabel does not throw when toString is not callable', () => {
  expect(globalThis.mortarSkipSourceLabel({ toString: 0 })).toBe('')
})

test('mortarSkipSourceLabel maps known sources case-insensitively', () => {
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
})

test('mortarSkipSourceLabel returns an unknown source string unchanged', () => {
  fc.assert(
    fc.property(fc.string(), (s) => {
      const source = `not-a-source:${s}`
      return globalThis.mortarSkipSourceLabel(source) === source
    }),
  )
})

test('mortarProtocolMismatch never throws and returns a known verdict', () => {
  fc.assert(
    fc.property(fc.anything(), (reply) =>
      mismatchVerdicts.has(globalThis.mortarProtocolMismatch(reply)),
    ),
  )
})

test('mortarProtocolMismatch prefers Mortar protocolError over the numeric protocol', () => {
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
})

test('mortarFallbackProtocol never throws and stays in range or zero', () => {
  fc.assert(
    fc.property(fc.anything(), fc.integer(), (reply, sent) => {
      const offered = globalThis.mortarFallbackProtocol(reply, sent)
      return offered === 0 || (Number.isInteger(offered) && offered >= 3 && offered < sent)
    }),
  )
})

test('mortarFallbackProtocol is zero unless Mortar offers a still-spoken older protocol', () => {
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
})
