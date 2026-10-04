import { expect, test } from 'bun:test'
import './plural.js'

test('installed reply status follows the host state', () => {
  const status = globalThis.mortarInstalledReplyStatus
  expect(status({ nativeMessagingError: true }, false)).toBe("Mortar isn't installed")
  expect(status({ state: 'notRunning', connected: false, modIds: [] })).toBe("Mortar isn't running")
  expect(status({ state: 'noProfile', connected: false, modIds: [] })).toBe(
    'Open a profile in Mortar',
  )
  expect(status({ state: 'off', modIds: [] })).toBe('Browser extension connection is off in Mortar')
  expect(status({ modIds: [] }, false)).toBe('Open a profile in Mortar')
  expect(status({ state: 'ready', connected: true, modIds: [1] }, false)).toBe('')
  expect(status({ connected: true }, false)).toBe('Mortar could not read this profile')
})

test('collection link result never shows a raw host error', () => {
  const text = globalThis.mortarLinkResultText
  expect(text({ ok: true })).toBe('Sent to Mortar')
  expect(text({ error: 'not an nxm or collection link: "x"' })).toBe(
    "Mortar couldn't open this collection",
  )
  expect(text(undefined, 'Specified native messaging host not found.')).toBe(
    globalThis.mortarInstallHint,
  )
  expect(text({ nativeMessagingError: true })).toBe(globalThis.mortarInstallHint)
})
