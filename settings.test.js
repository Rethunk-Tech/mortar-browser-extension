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
