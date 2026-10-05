import { expect, test } from 'bun:test'
import './plural.js'
import './thunderstore.js'

test('package pages are read, other pages are not', () => {
  expect(globalThis.mortarThunderstorePage('/c/lethal-company/p/Alice/MoreCompany/')).toEqual({
    key: 'lethal-company',
    namespace: 'Alice',
    name: 'MoreCompany',
  })
  expect(
    globalThis.mortarThunderstorePage('/c/lethal-company/p/Alice/MoreCompany/v/2.0.0/')?.name,
  ).toBe('MoreCompany')
  expect(globalThis.mortarThunderstorePage('/c/lethal-company/')).toBeUndefined()
})

test('only managed communities with a package in the profile are marked', () => {
  const page = { key: 'lethal-company', namespace: 'Alice', name: 'MoreCompany' }
  const reply = {
    games: [{ id: 'lethal-company', sources: { thunderstore: 'lethal-company' } }],
    packages: ['alice-morecompany'],
  }
  expect(globalThis.mortarThunderstoreManaged(reply, 'lethal-company')).toBe(true)
  expect(globalThis.mortarThunderstoreManaged(reply, 'risk-of-rain-2')).toBe(false)
  expect(globalThis.mortarThunderstoreManaged({ games: [] }, 'lethal-company')).toBe(false)
  expect(globalThis.mortarThunderstoreInstalled(reply, page)).toBe(true)
  expect(globalThis.mortarThunderstoreInstalled({ packages: [] }, page)).toBe(false)
  expect(globalThis.mortarThunderstoreRequest('installPackage', page)).toEqual({
    type: 'installPackage',
    source: 'thunderstore',
    sourceGameKey: 'lethal-company',
    package: 'Alice-MoreCompany',
  })
})
