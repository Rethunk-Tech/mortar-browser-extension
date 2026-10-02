import { expect, test } from 'bun:test'
import './fileLabels.js'

test('file labels list every profile on a file with the open profile first', () => {
  const groups = globalThis.mortarFileLabelGroups({
    open: { profile: 'Default', fileId: 111, version: '2.0.0' },
    others: [
      { profile: 'Co-op', fileId: 222, version: '1.0.0' },
      { profile: 'Shared', fileId: 111, version: '2.0.0' },
      { profile: 'Hidden-copy', fileId: 0 },
    ],
  })
  expect(groups).toEqual([
    {
      fileId: 111,
      version: '2.0.0',
      names: [
        { name: 'Default', active: true },
        { name: 'Shared', active: false },
      ],
    },
    {
      fileId: 222,
      version: '1.0.0',
      names: [{ name: 'Co-op', active: false }],
    },
  ])
})
