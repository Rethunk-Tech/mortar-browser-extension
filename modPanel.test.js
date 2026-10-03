import { expect, test } from 'bun:test'
import './plural.js'
import './modPanel.js'

test('mod panel uses profile version wording and plural required-by counts', () => {
  const one = globalThis.mortarModPanelLines(
    { profile: 'Farm', version: '1.2.3', requiredBy: ['A'] },
    [],
    '1.0.0',
    () => false,
  )
  expect(one[0]).toBe('In Farm: version 1.2.3')
  expect(one[1].text).toBe('Required by 1 mod in Farm')

  const two = globalThis.mortarModPanelLines(
    { profile: 'Farm', version: '1.2.3', requiredBy: ['A', 'B'] },
    [],
    '1.0.0',
    () => false,
  )
  expect(two[1].text).toBe('Required by 2 mods in Farm')
})

test('mod panel counts profiles whose installed version is older than the page', () => {
  const newer = (page, installed) => page === '2.0.0' && installed === '1.0.0'
  const lines = globalThis.mortarModPanelLines(
    { profile: 'Farm', version: '1.0.0' },
    [
      { profile: 'Co-op', version: '1.0.0' },
      { profile: 'Current', version: '2.0.0' },
    ],
    '2.0.0',
    newer,
  )
  expect(lines).toContain('Update available in 2 of your profiles')
})

test('mod panel counts host-marked updates even when the page version is not newer', () => {
  const lines = globalThis.mortarModPanelLines(
    { profile: 'Farm', version: '1.0.0', updateAvailable: true },
    [{ profile: 'Co-op', version: '1.0.0' }],
    '1.0.0',
    () => false,
  )
  expect(lines).toContain('Update available in 1 of your profiles')
})
