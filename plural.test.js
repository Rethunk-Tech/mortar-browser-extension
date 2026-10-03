import { expect, test } from 'bun:test'
import './plural.js'

test('installed reply status matches popup connection cases', () => {
  expect(globalThis.mortarInstalledReplyStatus({ nativeMessagingError: true }, false)).toBe(
    "Mortar's browser helper is not installed",
  )
  expect(globalThis.mortarInstalledReplyStatus({ connected: false, modIds: [] }, false)).toBe(
    'Open a profile in Mortar',
  )
  expect(globalThis.mortarInstalledReplyStatus({ modIds: [] }, false)).toBe(
    'Open Mortar on a profile',
  )
  expect(globalThis.mortarInstalledReplyStatus({ connected: true, modIds: [1] }, false)).toBe('')
  expect(globalThis.mortarInstalledReplyStatus({ connected: true }, false)).toBe(
    'Mortar could not read this profile',
  )
})
