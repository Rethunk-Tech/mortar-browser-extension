import { expect, test } from 'bun:test'
import './plural.js'
import './settings.js'
import './listingMarks.js'
import './projectSites.js'

const { curseforge, vsmoddb } = globalThis.mortarProjectSites
const link = (href, textContent = '') => ({ href, textContent })

test('CurseForge listing tiles are keyed by the mod name, other links are not', () => {
  const key = curseforge.listingKey
  expect(key(link('https://www.curseforge.com/stardewvalley/mods/smapi', '  Cool   Mod '))).toBe(
    'cool mod',
  )
  expect(key(link('https://www.curseforge.com/stardewvalley/mods/smapi', ''))).toBeUndefined()
  expect(key(link('https://www.curseforge.com/stardewvalley/mods', 'Mods'))).toBeUndefined()
})

test('CurseForge mod pages offer the project id and the title', () => {
  const doc = {
    querySelectorAll: () => [
      { children: [], textContent: ' Project ID ', nextElementSibling: { textContent: ' 306 ' } },
    ],
    querySelector: () => ({ textContent: 'Cool Mod' }),
  }
  expect(curseforge.pageKeys(doc, '/stardewvalley/mods/cool-mod')).toEqual(['306', 'cool mod'])
  expect(curseforge.pageKeys(doc, '/stardewvalley/mods')).toEqual([])
})

test('Mod DB tiles and pages are keyed by asset id', () => {
  expect(vsmoddb.listingKey(link('https://mods.vintagestory.at/show/mod/42'))).toBe('42')
  expect(vsmoddb.listingKey(link('https://mods.vintagestory.at/carryon'))).toBeUndefined()
  const doc = (canonical) => ({
    querySelector: () => (canonical ? { href: canonical } : null),
  })
  expect(vsmoddb.pageKeys(doc(), '/show/mod/42')).toEqual(['42'])
  expect(vsmoddb.pageKeys(doc('https://mods.vintagestory.at/show/mod/7'), '/carryon')).toEqual([
    '7',
  ])
  expect(vsmoddb.pageKeys(doc(), '/carryon')).toEqual([])
})

test('profile projects answer to ids, and on CurseForge to names', () => {
  const projects = [{ id: '306', name: 'Cool Mod' }]
  expect([...globalThis.mortarProjectKeys(curseforge, projects)]).toEqual(['306', 'cool mod'])
  expect([...globalThis.mortarProjectKeys(vsmoddb, projects)]).toEqual(['306'])
  expect(globalThis.mortarProjectKeys(vsmoddb, undefined).size).toBe(0)
})

test('only the site own Install link is picked up', () => {
  const target = (href) => ({ closest: () => ({ href }) })
  const cf = 'curseforge://install?addonId=1&fileId=2'
  expect(globalThis.mortarProjectInstallLink(curseforge, target(cf))).toBe(cf)
  expect(globalThis.mortarProjectInstallLink(vsmoddb, target(cf))).toBeUndefined()
  expect(
    globalThis.mortarProjectInstallLink(vsmoddb, target('vintagestorymodinstall://carryon@1.0.0')),
  ).toBe('vintagestorymodinstall://carryon@1.0.0')
  expect(globalThis.mortarProjectInstallLink(curseforge, { closest: () => null })).toBeUndefined()
})

test('game keys come from the host games list', () => {
  const reply = { games: [{ sources: { curseforge: '4643' } }, { sources: { vsmoddb: 'vs' } }, {}] }
  expect(globalThis.mortarProjectGameKeys(reply, 'curseforge')).toEqual(['4643'])
  expect(globalThis.mortarProjectGameKeys(undefined, 'curseforge')).toEqual([])
})

test('the overlay names a connection problem or the profile, else nothing', () => {
  const ok = { protocol: 3, state: 'ready', connected: true }
  expect(globalThis.mortarProjectOverlay(ok, undefined, true)).toBe('In Mortar profile')
  expect(globalThis.mortarProjectOverlay(ok, undefined, false)).toBeUndefined()
  expect(
    globalThis.mortarProjectOverlay({ protocol: 3, state: 'notRunning' }, undefined, true),
  ).toBe("Mortar isn't running")
})
