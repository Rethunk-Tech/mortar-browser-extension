import { expect, test } from 'bun:test'
import './plural.js'
import './updates.js'

test('updates reply becomes badge text, colour, and popup rows', () => {
  const counted = globalThis.mortarUpdatesBadge(
    {
      protocol: 1,
      accent: '#aabbcc',
      profile: 'Default',
      updates: [
        { modId: 1915, name: 'SMAPI', installed: '4.0.0', latest: '4.1.0' },
        { modId: 10, name: 'Other', installed: '1.0.0' },
      ],
    },
    false,
  )
  expect(counted).toEqual({
    text: '2',
    background: '#aabbcc',
    color: '#1b1a17',
    profile: 'Default',
    status: 'ok',
    state: 'noProfile',
    rows: [
      {
        modId: 1915,
        name: 'SMAPI',
        installed: '4.0.0',
        latest: '4.1.0',
        href: 'https://www.nexusmods.com/stardewvalley/mods/1915?tab=files',
        text: 'SMAPI 4.0.0 → 4.1.0',
      },
      {
        modId: 10,
        name: 'Other',
        installed: '1.0.0',
        latest: '',
        href: 'https://www.nexusmods.com/stardewvalley/mods/10?tab=files',
        text: 'Other (newer file)',
      },
    ],
  })

  const empty = globalThis.mortarUpdatesBadge(
    { protocol: 1, accent: '#111111', profile: 'Co-op', updates: [] },
    false,
  )
  expect(empty.text).toBe('')
  expect(empty.rows).toEqual([])
  expect(empty.status).toBe('ok')
  expect(empty.background).toBe('#111111')

  const missingAccent = globalThis.mortarUpdatesBadge(
    { protocol: 1, updates: [{ modId: 1, name: 'A', installed: '1', latest: '2' }] },
    false,
  )
  expect(missingAccent.background).toBe('#D6B17A')
  expect(missingAccent.text).toBe('1')

  const unreachable = globalThis.mortarUpdatesBadge(undefined, true)
  expect(unreachable).toEqual({
    text: '',
    background: '#D6B17A',
    color: '#1b1a17',
    rows: [],
    profile: '',
    status: 'unreachable',
    state: 'missing',
  })
})

test('update rows print only the versions that are known', () => {
  const rows = globalThis
    .mortarUpdatesBadge(
      {
        protocol: 1,
        state: 'ready',
        updates: [
          { modId: 1, name: 'A', installed: '', latest: '2.0' },
          { modId: 2, name: 'B', installed: '1.0', latest: '' },
        ],
      },
      false,
    )
    .rows.map((row) => row.text)
  expect(rows).toEqual(['A → 2.0', 'B (newer file)'])
})
