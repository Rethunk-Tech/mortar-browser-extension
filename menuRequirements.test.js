import { expect, test } from 'bun:test'
import './menuRequirements.js'

test('omits the requirements section when there are none', () => {
  expect(globalThis.mortarRequirementLines({})).toEqual([])
  expect(globalThis.mortarRequirementLines({ requirements: [] })).toEqual([])
})

test('lists missing requirements first, with Nexus links, then present count', () => {
  expect(
    globalThis.mortarRequirementLines({
      requirements: [
        { name: 'Content Patcher', modId: 1915, present: true },
        { name: 'GMCM', modId: 2400, present: false },
        { name: 'SMAPI', external: true },
      ],
    }),
  ).toEqual([
    {
      text: 'Needs GMCM',
      problem: true,
      href: 'https://www.nexusmods.com/stardewvalley/mods/2400',
    },
    { text: 'Needs SMAPI', problem: true },
    { text: '1 requirement in this profile' },
  ])
})
