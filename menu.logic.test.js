import { expect, test } from 'bun:test'

await import('./plural.js')
await import('./menu.js')

const restore = (keys) => {
  const prev = Object.fromEntries(keys.map((k) => [k, globalThis[k]]))
  return () => {
    for (const k of keys) {
      globalThis[k] = prev[k]
    }
  }
}

const fire = (node, type, event) => {
  for (const fn of node.listeners[type] || []) {
    fn(event)
  }
}

const evt = () => ({
  preventDefault: () => undefined,
  stopPropagation: () => undefined,
})

const el = (tag = 'div') => {
  const node = {
    tagName: tag,
    children: [],
    listeners: {},
    className: '',
    textContent: '',
    attrs: {},
    disabled: false,
    tabIndex: 0,
    left: 0,
    classList: {
      toggle(name, on) {
        const parts = node.className.split(' ').filter(Boolean)
        node.className = (on ? [...parts, name] : parts.filter((p) => p !== name)).join(' ')
      },
    },
    append(...c) {
      node.children.push(...c)
    },
    setAttribute(k, v) {
      node.attrs[k] = v
    },
    addEventListener(type, fn) {
      const list = node.listeners[type]
      if (list) {
        list.push(fn)
      } else {
        node.listeners[type] = [fn]
      }
    },
    getBoundingClientRect() {
      return { left: node.left }
    },
    focus(opts) {
      node.focused = opts || true
    },
    querySelectorAll() {
      const out = []
      const walk = (n) => {
        if (n.tagName === 'button' || (n.tagName === 'a' && n.attrs?.href)) {
          out.push(n)
        }
        for (const c of n.children || []) {
          walk(c)
        }
      }
      walk(node)
      return out
    },
  }
  return node
}

const attachHost = () => {
  const host = el('div')
  host.attachShadow = () => {
    const shadow = el('shadow')
    shadow.replaceChildren = (...nodes) => {
      shadow.children = nodes
    }
    return shadow
  }
  return host
}

const wrapOf = (host) => globalThis.mortarMenuShadow(host).children[1]
const btnOf = (host) => wrapOf(host).children[0]
const menuOf = (host) => wrapOf(host).children[1]

const withMenuDom = (fn) => {
  const documentListeners = {}
  const undo = restore([
    'document',
    'window',
    'mortarIfTrusted',
    'mortarUiFollowAccent',
    'mortarUiMark',
    'mortarInstallHint',
    'mortarStateText',
    'mortarRequirementLines',
  ])
  globalThis.mortarIfTrusted = (_event, run) => run()
  globalThis.mortarUiFollowAccent = () => undefined
  globalThis.mortarUiMark = (doc) => doc.createElement('i')
  globalThis.mortarInstallHint = 'install Mortar'
  globalThis.mortarStateText = (s) => `state:${s}`
  globalThis.mortarRequirementLines = () => []
  globalThis.window = { innerWidth: 100 }
  globalThis.document = {
    createElement: (tag) => el(tag),
    createTextNode: (text) => ({ text }),
    addEventListener(type, listener, cap) {
      documentListeners[`${type}:${cap}`] = listener
    },
    removeEventListener(type, _listener, cap) {
      documentListeners[`${type}:${cap}`] = undefined
    },
  }
  try {
    fn(documentListeners)
  } finally {
    undo()
  }
}

test('mortarStatusDot is null until an installed connected mod, then red/amber/green', () => {
  expect(globalThis.mortarStatusDot()).toBeNull()
  expect(
    globalThis.mortarStatusDot({ connected: true, kind: 'collection', installed: true }),
  ).toBeNull()
  expect(globalThis.mortarStatusDot({ connected: true, kind: 'mod' })).toBeNull()
  expect(
    globalThis.mortarStatusDot({
      connected: true,
      kind: 'mod',
      installed: true,
      hasProblems: true,
    }),
  ).toBe('red')
  expect(
    globalThis.mortarStatusDot({
      connected: true,
      kind: 'mod',
      installed: true,
      updateAvailable: true,
    }),
  ).toBe('amber')
  expect(globalThis.mortarStatusDot({ connected: true, kind: 'mod', installed: true })).toBe(
    'green',
  )
})

test('mortarMenuLabel names the dot; missing problems count as zero', () => {
  expect(globalThis.mortarMenuLabel({}, 'red')).toBe('Mortar: 0 problems')
  expect(globalThis.mortarMenuLabel({ problems: ['a'] }, 'red')).toBe('Mortar: 1 problem')
  expect(globalThis.mortarMenuLabel({}, 'amber')).toBe('Mortar: update available')
  expect(globalThis.mortarMenuLabel({ profileName: 'Main' }, 'green')).toBe('Mortar: in Main')
  expect(globalThis.mortarMenuLabel({}, null)).toBe('Mortar')
})

test('mortarBuildSections is empty when disconnected or a collection', () => {
  expect(globalThis.mortarBuildSections()).toEqual([])
  expect(globalThis.mortarBuildSections({ connected: false, kind: 'mod' })).toEqual([])
  expect(globalThis.mortarBuildSections({ connected: true, kind: 'collection' })).toEqual([])
})

test('mortarBuildSections covers this-mod, updates, other profiles, required-by, and problems', () => {
  const undo = restore(['mortarRequirementLines'])
  globalThis.mortarRequirementLines = () => [
    { text: 'needs Fabric', href: 'https://e.g/x', title: 'req' },
  ]
  const sections = globalThis.mortarBuildSections({
    connected: true,
    kind: 'mod',
    profileName: 'Main',
    installed: true,
    version: '1.2',
    pinned: true,
    pinReason: '  keep  ',
    skipVersion: '1.3',
    skipSources: ['nexus'],
    nexusNewer: true,
    updateCount: 2,
    alsoIn: [{ profile: 'Alt', version: '1.1' }, { profile: 'Old' }],
    requiredByNames: ['A', 'B'],
    requiredBy: [1, 2, 3],
    problems: ['one', { text: 'two' }, 'three', 'four', 'five', 'six'],
  })
  const byLabel = Object.fromEntries(sections.map((s) => [s.label, s.lines.map((l) => l.text)]))
  expect(byLabel['This mod'][0]).toBe('Version 1.2 in this profile')
  expect(byLabel['This mod']).toContain('Pinned: keep')
  expect(byLabel.Updates).toEqual([
    'Nexus has a newer version',
    'Update available in 2 of your profiles',
  ])
  expect(byLabel['Other profiles']).toEqual(['Alt (version 1.1)', 'Old'])
  expect(byLabel['Required by'][0]).toBe('3 mods in this profile')
  expect(byLabel.Requirements).toEqual(['needs Fabric'])
  expect(byLabel.Problems.at(-1)).toBe('+1 more — open Mortar to see them')
  undo()
})

test('mortarBuildSections uses nullish fallbacks for skip sources, requiredBy ids, and empty problems', () => {
  const undo = restore(['mortarRequirementLines', 'mortarSkipSourceLabel'])
  globalThis.mortarRequirementLines = () => []
  globalThis.mortarSkipSourceLabel = undefined
  const fallback = globalThis.mortarBuildSections({
    connected: true,
    kind: 'mod',
    profileName: 'Main',
    installed: false,
    pinned: true,
    pinReason: 12,
    skipSources: ['raw'],
    alsoIn: [],
    requiredBy: [7],
    problems: null,
  })
  const byLabel = Object.fromEntries(fallback.map((s) => [s.label, s.lines.map((l) => l.text)]))
  expect(byLabel['This mod']).toContain('Not in this profile')
  expect(byLabel['This mod']).toContain('Pinned at this version')
  expect(byLabel['This mod']).toContain('Skipped source: raw')
  expect(byLabel['Required by']).toEqual(['1 mod in this profile', '7'])
  expect(byLabel.Problems).toEqual(['No problems'])
  expect(
    globalThis
      .mortarBuildSections({ connected: true, kind: 'mod', nexusNewer: true })
      .map((s) => s.label),
  ).toEqual(['Updates'])
  expect(
    globalThis
      .mortarBuildSections({ connected: true, kind: 'mod', profileName: 'Main' })
      .map((s) => s.label),
  ).toEqual(['This mod', 'Problems'])
  undo()
})

test('mortarMenuModData is disconnected without a ready open profile', () => {
  expect(globalThis.mortarMenuModData()).toEqual({ connected: false, kind: 'mod', state: 'ready' })
  expect(globalThis.mortarMenuModData({ state: 'missing' })).toEqual({
    connected: false,
    kind: 'mod',
    state: 'missing',
  })
})

test('mortarMenuModData counts owned updates and coerces missing lists', () => {
  const undo = restore(['mortarNewerVersion'])
  globalThis.mortarNewerVersion = (page, installed) => page === '2' && installed === '1'
  const data = globalThis.mortarMenuModData(
    {
      open: {
        profile: 'Main',
        version: '1',
        pinned: 1,
        requiredBy: 'nope',
        requiredByNames: 'nope',
      },
      others: [{ profile: 'Alt', version: '1', updateAvailable: true }, { profile: 'Skip' }, null],
      problems: 'nope',
    },
    '2',
  )
  expect(data.updateCount).toBe(2)
  expect(data.nexusNewer).toBe(true)
  expect(data.requiredBy).toEqual([])
  expect(data.problems).toEqual([])
  globalThis.mortarNewerVersion = undefined
  const noNewer = globalThis.mortarMenuModData({ open: { version: '1' } }, '9')
  expect(noNewer.nexusNewer).toBe(false)
  expect(noNewer.profileName).toBe('')
  undo()
})

test('mortarAttachMenu paints menus, traps focus, and closes on outside pointer', () => {
  withMenuDom((documentListeners) => {
    const missing = attachHost()
    const missingApi = globalThis.mortarAttachMenu(missing, { connected: false, state: 'missing' })
    expect(menuOf(missing).children.some((c) => c.className === 'disconnected')).toBe(true)
    let trapped = false
    fire(menuOf(missing), 'keydown', {
      key: 'Tab',
      preventDefault() {
        trapped = true
      },
    })
    expect(trapped).toBe(true)
    missingApi.setStatus()
    missingApi.setBusy(true)

    const opened = []
    const collection = attachHost()
    const colApi = globalThis.mortarAttachMenu(
      collection,
      { connected: true, kind: 'collection', profileName: 'Main' },
      { onOpen: () => opened.push(true) },
    )
    const footer = menuOf(collection).children.find((c) => c.className === 'footer')
    fire(
      footer.children.find((c) => c.className === 'open-btn'),
      'click',
      evt(),
    )
    colApi.setStatus('working')
    expect(opened).toEqual([true])

    globalThis.mortarRequirementLines = () => [
      { text: 'needs Fabric', href: 'https://e.g/x', title: 'req' },
    ]
    const linked = attachHost()
    globalThis.mortarAttachMenu(linked, {
      connected: true,
      kind: 'mod',
      profileName: 'Main',
      installed: true,
      hasProblems: true,
      problems: ['boom'],
    })
    const linkRow = menuOf(linked)
      .children.filter((c) => c.className === 'section')
      .flatMap((c) => c.children)
      .find((c) => c.children?.[0]?.attrs?.href)
    expect(linkRow.title).toBe('req')

    const host = attachHost()
    globalThis.mortarAttachMenu(host, { connected: true, kind: 'mod', profileName: 'Main' })
    const reused = globalThis.mortarAttachMenu(host, { connected: false, state: 'offline' })
    const btn = btnOf(host)
    const menu = menuOf(host)
    btn.left = 80
    fire(btn, 'click', evt())
    expect(menu.className.includes('right')).toBe(true)
    fire(menu, 'keydown', { key: 'Escape', ...evt() })
    fire(btn, 'click', evt())
    fire(menu, 'keydown', { key: 'x', ...evt() })
    const shadow = globalThis.mortarMenuShadow(host)
    const items = menu.querySelectorAll()
    shadow.activeElement = items.at(-1)
    fire(menu, 'keydown', { key: 'Tab', shiftKey: false, ...evt() })
    expect(items[0].focused).toBe(true)
    shadow.activeElement = items[0]
    fire(menu, 'keydown', { key: 'Tab', shiftKey: true, ...evt() })
    shadow.activeElement = menu
    fire(menu, 'keydown', { key: 'Tab', shiftKey: true, ...evt() })
    documentListeners['pointerdown:true']({ composedPath: () => [] })
    fire(btn, 'click', evt())
    documentListeners['pointerdown:true']({})
    reused.close()
    reused.disconnect()
  })
})
