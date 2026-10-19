import { expect, test } from 'bun:test'
import './plural.js'
import './settings.js'
import './listingMarks.js'
import './projectSites.js'

const { curseforge, vsmoddb } = globalThis.mortarProjectSites
const link = (href, textContent = '') => ({ href, textContent })

test('CurseForge tiles are keyed by the slug in the link, then the name', () => {
  const keys = curseforge.listingKeys
  expect(
    keys(link('https://www.curseforge.com/sims4/create-a-sim/Aurum-Heels', ' Aurum  Heels ')),
  ).toEqual(['aurum-heels', 'aurum heels'])
  expect(keys(link('https://www.curseforge.com/sims4/create-a-sim/aurum-heels', ''))).toEqual([
    'aurum-heels',
  ])
  expect(keys(link('https://www.curseforge.com/sims4/create-a-sim', 'Create a Sim'))).toEqual([])
  expect(
    keys(link('https://www.curseforge.com/sims4/create-a-sim/aurum-heels/install/9', 'x')),
  ).toEqual([])
})

test('CurseForge mod pages offer the Project ID from the dt, the slug and the title', () => {
  const dt = (text, value) => ({ textContent: text, nextElementSibling: { textContent: value } })
  const doc = {
    querySelectorAll: () => [dt('Created', 'Jan 1'), dt(' Project ID ', ' 1165113 ')],
    querySelector: () => ({ textContent: 'Cool Mod' }),
  }
  expect(curseforge.pageKeys(doc, '/sims4/create-a-sim/Cool-Mod')).toEqual([
    '1165113',
    'cool-mod',
    'cool mod',
  ])
  expect(curseforge.pageKeys(doc, '/sims4/create-a-sim')).toEqual([])
})

test('CurseForge Install is the /install/ page, whose HTML holds the curseforge link', async () => {
  const anchor = curseforge.installAnchor
  const origin = 'https://www.curseforge.com'
  const install = `${origin}/sims4/create-a-sim/aurum-heels/install/9132615`
  expect(anchor(install, origin)).toBe(install)
  expect(anchor(`${origin}/sims4/create-a-sim/aurum-heels`, origin)).toBeUndefined()
  expect(anchor('https://evil.test/x/install/1', origin)).toBeUndefined()
  const html = '<a href="curseforge://install?addonId=1&amp;fileId=9132615">go</a>'
  expect(await curseforge.resolveLink(install, () => Promise.resolve(html))).toBe(
    'curseforge://install?addonId=1&fileId=9132615',
  )
  expect(
    await curseforge.resolveLink(install, () => Promise.resolve('<p>none</p>')),
  ).toBeUndefined()
})

test('Mod DB tiles and pages are keyed by asset id or alias', () => {
  expect(vsmoddb.listingKeys(link('https://mods.vintagestory.at/show/mod/42'))).toEqual(['42'])
  expect(vsmoddb.listingKeys(link('https://mods.vintagestory.at/HorseCartCompat'))).toEqual([
    'horsecartcompat',
  ])
  expect(vsmoddb.listingKeys(link('https://mods.vintagestory.at/list/mod'))).toEqual([])
  const doc = (canonical) => ({
    querySelector: () => (canonical ? { href: canonical } : null),
  })
  expect(vsmoddb.pageKeys(doc(), '/show/mod/42')).toEqual(['42'])
  expect(vsmoddb.pageKeys(doc('https://mods.vintagestory.at/show/mod/7'), '/vspt')).toEqual([
    'vspt',
    '7',
  ])
})

test('Mod DB Install is the vintagestorymodinstall anchor', () => {
  const install = 'vintagestorymodinstall://carryon@1.0.0'
  expect(vsmoddb.installAnchor(install)).toBe(install)
  expect(vsmoddb.installAnchor('https://mods.vintagestory.at/x')).toBeUndefined()
})

test('profile projects answer to ids, slugs and aliases, and on CurseForge to names', () => {
  const projects = [{ id: '306', name: 'Cool Mod', slug: 'Cool-Mod' }]
  expect([...globalThis.mortarProjectKeys(curseforge, projects)]).toEqual([
    '306',
    'cool-mod',
    'cool mod',
  ])
  expect([...globalThis.mortarProjectKeys(vsmoddb, projects)]).toEqual(['306', 'cool-mod'])
  expect(globalThis.mortarProjectKeys(vsmoddb, undefined).size).toBe(0)
})

test('only the site own Install anchor is picked up', () => {
  const origin = 'https://www.curseforge.com'
  const target = (href) => ({ closest: () => ({ href }) })
  const install = `${origin}/sims4/c/s/install/5`
  expect(globalThis.mortarProjectInstallAnchor(curseforge, target(install), origin)).toBe(install)
  expect(globalThis.mortarProjectInstallAnchor(vsmoddb, target(install), origin)).toBeUndefined()
  expect(
    globalThis.mortarProjectInstallAnchor(curseforge, { closest: () => null }, origin),
  ).toBeUndefined()
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
