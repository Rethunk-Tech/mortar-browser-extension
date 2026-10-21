import { expect, test } from 'bun:test'
import { file } from 'bun'
import './plural.js'
import './settings.js'
import './listingMarks.js'
import './projectSites.js'
import './projectPages.js'

const { paradox, modrinth } = globalThis.mortarMarketSites
const canonicalLink = /<link rel="canonical" href="([^"]+)"/
const listingCount = 3
const fixture = (name) => file(new URL(`./testdata/${name}`, import.meta.url)).text()

test('Modrinth listing cards are keyed by the slug in their /mod/ link', async () => {
  const html = await fixture('modrinth-listing.html')
  const hrefs = [...html.matchAll(/<a href="(\/mod\/[^"]+)"/g)].map((m) => m[1])
  expect(hrefs.map((href) => globalThis.mortarMarketLinkKey(modrinth, href))).toEqual([
    'fabric-api',
    'sodium',
    'iris',
  ])
  expect(html.match(/class="smart-clickable smart-clickable--has-clickable"/g)).toHaveLength(
    listingCount,
  )
  expect(globalThis.mortarMarketLinkKey(modrinth, '/user/JZA4dW8o')).toBeUndefined()
  expect(globalThis.mortarMarketLinkKey(modrinth, 'https://modrinth.com/mod/Sodium/versions')).toBe(
    'sodium',
  )
})

test('a Modrinth mod page is told by its path, and the canonical link gives the project id', async () => {
  const html = await fixture('modrinth-mod.html')
  const [, canonical] = canonicalLink.exec(html)
  expect(globalThis.mortarMarketPage(modrinth, '/mod/sodium', canonical)).toEqual({
    project: 'AANobbMI',
    keys: ['sodium', 'aanobbmi'],
  })
  expect(globalThis.mortarMarketPage(modrinth, '/mod/sodium')).toEqual({
    project: 'sodium',
    keys: ['sodium'],
  })
  expect(globalThis.mortarMarketPage(modrinth, '/mods', canonical)).toBeUndefined()
  expect(globalThis.mortarMarketPage(modrinth, '/modpack/x')).toBeUndefined()
})

test('Paradox Mods pages and links are told by the numeric id; the shell holds no markup to read', async () => {
  const shell = await fixture('paradox-shell.html')
  expect(shell).toContain('<div id="app"></div>')
  const [, canonical] = canonicalLink.exec(shell)
  expect(globalThis.mortarMarketPage(paradox, new URL(canonical).pathname, canonical)).toEqual({
    project: '90641',
    keys: ['90641'],
  })
  expect(
    globalThis.mortarMarketLinkKey(paradox, 'https://mods.paradoxplaza.com/mods/123/Windows'),
  ).toBe('123')
  expect(globalThis.mortarMarketLinkKey(paradox, '/games/cities_skylines_2')).toBeUndefined()
  expect(globalThis.mortarMarketPage(paradox, '/mods/abc/Windows')).toBeUndefined()
})

test('profile projects answer to ids and Modrinth slugs', () => {
  const wanted = globalThis.mortarProjectKeys(modrinth, [
    { id: 'AANobbMI', name: 'Sodium', slug: 'sodium' },
  ])
  expect(wanted.has('sodium') && wanted.has('aanobbmi')).toBe(true)
})

test('the page card uses the same states as Thunderstore pages', () => {
  const overlay = globalThis.mortarMarketOverlay
  const ready = { protocol: 4, state: 'ready', connected: true }
  expect(overlay(ready, undefined, { managed: true, inProfile: false })).toEqual({
    text: 'Mortar',
    button: true,
  })
  expect(overlay(ready, undefined, { managed: true, inProfile: true })).toEqual({
    text: 'In Mortar profile',
    button: false,
  })
  expect(overlay(ready, undefined, { managed: false, inProfile: false })).toBeUndefined()
  for (const [reply, text] of [
    [{ protocol: 4, state: 'notRunning' }, "Mortar isn't running"],
    [{ protocol: 4, state: 'noProfile' }, 'Open a profile in Mortar'],
    [{ protocol: 4, state: 'off' }, 'Browser extension connection is off in Mortar'],
  ]) {
    expect(overlay(reply, undefined, { managed: true, inProfile: false })).toEqual({
      text,
      button: false,
    })
  }
  expect(overlay(undefined, new Error('x'), { managed: true }).text).toBe(
    globalThis.mortarInstallHint,
  )
})

test('installProject asks for the page project and reports Sent to Mortar', () => {
  expect(globalThis.mortarMarketInstallRequest(paradox, 'cities_skylines_2', '90641')).toEqual({
    type: 'installProject',
    source: 'paradox',
    sourceGameKey: 'cities_skylines_2',
    project: '90641',
  })
  expect(globalThis.mortarMarketResultText({ protocol: 4, state: 'ready', ok: true })).toBe(
    'Sent to Mortar',
  )
  expect(globalThis.mortarMarketResultText({ protocol: 4, state: 'ready', error: 'x' })).toBe(
    "Mortar couldn't install this mod",
  )
})
