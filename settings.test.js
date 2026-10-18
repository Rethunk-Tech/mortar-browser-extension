import { expect, test } from 'bun:test'
import './settings.js'

test('unreadable or missing settings mean their defaults', () => {
  expect(globalThis.mortarNormalizeSettings(undefined)).toEqual(globalThis.mortarSettingDefaults)
  expect(
    globalThis.mortarNormalizeSettings({
      markBroken: 'sparkle',
      siteNexus: 'yes',
      markUpdate: 'off',
    }),
  ).toEqual({ ...globalThis.mortarSettingDefaults, markUpdate: 'off' })
})

test('the installed row maps to the listing mode', () => {
  const mode = (markInstalled) => globalThis.mortarInstalledMode({ markInstalled })
  expect(mode('off')).toBe('off')
  expect(mode('hide')).toBe('hide')
  expect(mode('gray')).toBe('highlight')
})

test('a site checkbox starts work on enable and stops it on disable', async () => {
  const events = []
  const listeners = []
  const previous = globalThis.chrome
  globalThis.chrome = {
    runtime: {},
    storage: {
      onChanged: { addListener: (fn) => listeners.push(fn) },
      sync: {
        get: (_defaults, cb) => cb({ ...globalThis.mortarSettingDefaults, siteNexus: false }),
      },
    },
  }
  try {
    globalThis.mortarWhenSiteEnabled(
      'siteNexus',
      () => events.push('start'),
      () => events.push('stop'),
    )
    await Promise.resolve()
    expect(events).toEqual([])
    for (const fn of listeners) {
      fn({ siteNexus: { newValue: true } }, 'sync')
    }
    expect(events).toEqual(['start'])
    for (const fn of listeners) {
      fn({ siteNexus: { newValue: false } }, 'sync')
    }
    expect(events).toEqual(['start', 'stop'])
  } finally {
    globalThis.chrome = previous
  }
})
