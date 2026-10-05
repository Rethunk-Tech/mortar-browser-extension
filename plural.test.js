import { expect, test } from 'bun:test'
import './plural.js'
import './updates.js'

test('installed reply status follows the host state', () => {
  const status = globalThis.mortarInstalledReplyStatus
  expect(status({ nativeMessagingError: true }, false)).toBe("Mortar isn't installed")
  expect(status({ protocol: 2, state: 'notRunning', connected: false, modIds: [] })).toBe(
    "Mortar isn't running",
  )
  expect(status({ protocol: 2, state: 'noProfile', connected: false, modIds: [] })).toBe(
    'Open a profile in Mortar',
  )
  expect(status({ protocol: 2, state: 'off', modIds: [] })).toBe(
    'Browser extension connection is off in Mortar',
  )
  expect(status({ protocol: 2, modIds: [] }, false)).toBe('Open a profile in Mortar')
  expect(status({ protocol: 2, state: 'ready', connected: true, modIds: [1] }, false)).toBe('')
  expect(status({ protocol: 2, connected: true }, false)).toBe('Mortar could not read this profile')
})

test('collection link result never shows a raw host error', () => {
  const text = globalThis.mortarLinkResultText
  expect(text({ protocol: 2, ok: true })).toBe('Sent to Mortar')
  expect(text({ protocol: 2, error: 'not an nxm or collection link: "x"' })).toBe(
    "Mortar couldn't open this collection",
  )
  expect(text(undefined, 'Specified native messaging host not found.')).toBe(
    globalThis.mortarInstallHint,
  )
  expect(text({ nativeMessagingError: true })).toBe(globalThis.mortarInstallHint)
})

test('a protocol mismatch names the side to update', () => {
  const state = globalThis.mortarConnectionState
  expect(state({ protocol: 2, state: 'ready', connected: true })).toBe('ready')
  expect(state({ state: 'ready', connected: true })).toBe('mortarOld')
  expect(state({ protocol: 1, state: 'ready', connected: true })).toBe('mortarOld')
  expect(state({ protocol: 3, state: 'ready', connected: true })).toBe('extensionOld')
  expect(state({ protocol: 2, protocolError: 'extensionTooOld' })).toBe('extensionOld')
  expect(state({ protocol: 2, protocolError: 'extensionTooNew' })).toBe('mortarOld')
  expect(globalThis.mortarInstalledReplyStatus({ protocol: 1, modIds: [] })).toBe(
    'Update Mortar: it is too old for this browser extension',
  )
  expect(globalThis.mortarLinkResultText({ protocol: 3, ok: true })).toBe(
    'Update the browser extension: it is too old for this Mortar',
  )
  expect(globalThis.mortarUpdatesBadge({ protocol: 3, updates: [] }).state).toBe('extensionOld')
})
