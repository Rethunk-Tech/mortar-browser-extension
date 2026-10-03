import { describe, expect, test } from 'bun:test'
import './menu.js'

const sections = (...args) => globalThis.mortarBuildSections(...args)
const labels = (data) => sections(data).map((section) => section.label)
const dot = (data) => globalThis.mortarStatusDot(data)

describe('mortarBuildSections', () => {
  test('omits every section when disconnected or collection', () => {
    expect(sections({ connected: false, kind: 'mod', profileName: 'Main' })).toEqual([])
    expect(
      sections({
        connected: true,
        kind: 'collection',
        profileName: 'Main',
        installed: true,
        inProfile: true,
      }),
    ).toEqual([])
  })

  test('shows This mod, Updates, Other profiles, Required by, and Problems only with content', () => {
    const empty = {
      connected: true,
      kind: 'mod',
      profileName: '',
      installed: false,
      inProfile: false,
    }
    expect(labels(empty)).toEqual([])

    const full = {
      connected: true,
      kind: 'mod',
      profileName: 'Main',
      installed: true,
      inProfile: true,
      version: '1.2.3',
      pinned: true,
      skipVersion: '1.0.0',
      skipSources: [],
      nexusNewer: true,
      updateCount: 2,
      alsoIn: [{ profile: 'Co-op', version: '1.1.0' }],
      requiredBy: ['Pathoschild.ContentPatcher'],
      requiredByNames: ['Content Patcher'],
      problems: [{ text: 'Missing dependency' }, { text: 'Broken' }],
    }
    expect(labels(full)).toEqual([
      'This mod',
      'Updates',
      'Other profiles',
      'Required by',
      'Problems',
    ])
    const byLabel = Object.fromEntries(
      sections(full).map((section) => [section.label, section.lines.map((line) => line.text)]),
    )
    expect(byLabel['This mod']).toContain('In Main: version 1.2.3')
    expect(byLabel['This mod']).toContain('Pinned in Mortar (this version stays)')
    expect(byLabel.Updates).toEqual([
      'Nexus has a newer version',
      'Update available in 2 of your profiles',
    ])
    expect(byLabel['Other profiles']).toEqual(['Co-op (version 1.1.0)'])
    expect(byLabel['Required by'][0]).toContain('Required by')
    expect(byLabel['Required by']).toContain('Content Patcher')
    expect(byLabel.Problems).toEqual(['Missing dependency', 'Broken'])
  })

  test('Problems uses the empty-profile copy when there are none', () => {
    const model = sections({
      connected: true,
      kind: 'mod',
      profileName: 'Main',
      installed: true,
      inProfile: true,
      version: '1.0.0',
      problems: [],
    })
    expect(model.find((section) => section.label === 'Problems').lines[0].text).toBe(
      'No problems in Main',
    )
  })
})

describe('mortarStatusDot', () => {
  test('none when disconnected, not in profile, or collection', () => {
    expect(dot({ connected: false, inProfile: true, installed: true })).toBeNull()
    expect(
      dot({ connected: true, kind: 'collection', inProfile: true, installed: true }),
    ).toBeNull()
    expect(dot({ connected: true, kind: 'mod', inProfile: false, installed: false })).toBeNull()
  })

  test('red for problems, sand for updates, green when installed and fine', () => {
    expect(
      dot({
        connected: true,
        kind: 'mod',
        inProfile: true,
        installed: true,
        hasProblems: true,
        updateAvailable: true,
      }),
    ).toBe('red')
    expect(
      dot({
        connected: true,
        kind: 'mod',
        inProfile: true,
        installed: true,
        hasProblems: false,
        updateAvailable: true,
      }),
    ).toBe('sand')
    expect(
      dot({
        connected: true,
        kind: 'mod',
        inProfile: true,
        installed: true,
        hasProblems: false,
        updateAvailable: false,
      }),
    ).toBe('green')
  })
})

describe('mortarMenuModData collection vs mod', () => {
  test('collection variant has no sections and no status dot', () => {
    const data = { connected: true, kind: 'collection' }
    expect(sections(data)).toEqual([])
    expect(dot(data)).toBeNull()
  })

  test('disconnected mod data has no sections and no status dot', () => {
    const data = globalThis.mortarMenuModData(undefined, [], '', [])
    expect(data.connected).toBe(false)
    expect(sections(data)).toEqual([])
    expect(dot(data)).toBeNull()
  })
})
