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
