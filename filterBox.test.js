import { expect, test } from 'bun:test'
import './mortarUi.js'
import './plural.js'
import './filterBox.js'

test('Gray out and Hide read as checked; Hide cannot be changed from the box', () => {
  const rows = globalThis.mortarFilterBoxRows({ markInstalled: 'hide', markObsolete: 'off' }, [
    { row: 'installed', label: 'In profile', count: 3 },
    { row: 'deprecated', label: 'Deprecated', count: 2, disabled: true, title: 'no' },
  ])
  expect(rows[0]).toMatchObject({ checked: true, disabled: true, count: '(3 hidden)' })
  expect(rows[1]).toMatchObject({ checked: false, disabled: true, title: 'no', count: '(2)' })
  expect(
    globalThis.mortarFilterBoxRows({ markInstalled: 'gray' }, [
      { row: 'installed', label: 'x' },
    ])[0],
  ).toMatchObject({ checked: true, disabled: false, count: '' })
})

test('a checkbox writes Gray out or Off', () => {
  expect(globalThis.mortarFilterValue(true)).toBe('gray')
  expect(globalThis.mortarFilterValue(false)).toBe('off')
})
