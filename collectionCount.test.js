import { expect, test } from 'bun:test'
import './collectionCount.js'

const contentPatcher = 1915
const gmcm = 2400
const farmTypeManager = 1215
const extra = 2403

test('omits the in-profile line when there are no tiles', () => {
  expect(globalThis.mortarCollectionInProfileLine([], new Set([contentPatcher]), 'Main')).toBe('')
})

test('counts collection tiles against the installed id set', () => {
  expect(
    globalThis.mortarCollectionInProfileLine(
      [contentPatcher, gmcm, farmTypeManager],
      new Set([contentPatcher, farmTypeManager, extra]),
      'Main',
    ),
  ).toBe('2 of 3 mods already in Main')
})
