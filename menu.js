// The logo's bricks as [x, y, width]; every brick is 11 tall with 2 radius.
const mortarMarkBricks = [
  [6, 12, 24],
  [34, 12, 24],
  [6, 27, 10],
  [20, 27, 24],
  [48, 27, 10],
  [6, 42, 24],
  [34, 42, 24],
]

const mortarMenuMaxProblems = 5

const mortarMenuStyle = `
:host { all: initial; --mortar-accent: #D6B17A; }
.wrap { position: relative; display: inline-block; font: 13px system-ui, sans-serif; }
.btn {
  width: 32px; height: 32px; padding: 0; margin: 0;
  border-radius: 6px; background: rgb(40,40,48);
  border: 1px solid rgba(255,255,255,0.14);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; position: relative; color: var(--mortar-accent);
}
.btn svg { display: block; }
svg rect { fill: var(--mortar-accent); }
.btn.dim { opacity: 0.45; }
.dot {
  position: absolute; top: 2px; right: 2px;
  width: 7px; height: 7px; border-radius: 50%;
  pointer-events: none;
}
.dot.green { background: #0CDF64; }
.dot.amber { background: #F3B416; }
.dot.red { background: #E5484D; }
.menu {
  display: none; position: absolute; top: calc(100% + 6px); left: 0; z-index: 2147483647;
  width: min(320px, calc(100vw - 16px)); box-sizing: border-box;
  background: rgb(40,40,48);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.45);
  padding: 12px;
  color: rgba(255,255,255,0.9);
}
.menu.open { display: block; }
.menu.right { left: auto; right: 0; }
.header {
  display: flex; align-items: center; gap: 8px;
  color: rgba(255,255,255,0.9);
}
.header .title { font-weight: 600; }
.header .profile {
  margin-left: auto; max-width: 140px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: rgba(225,225,230,0.7); font-size: 13px;
}
.section { border-top: 1px solid rgba(255,255,255,0.08); margin-top: 10px; padding-top: 10px; }
.label {
  font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase;
  color: rgba(225,225,230,0.7); margin: 0 0 6px;
}
.body { margin: 0 0 4px; color: rgba(255,255,255,0.9); }
.body:last-child { margin-bottom: 0; }
.body.problem::before {
  content: ''; display: inline-block; width: 6px; height: 6px; margin-right: 6px;
  border-radius: 50%; background: #E5484D; vertical-align: middle;
}
.body a { color: inherit; }
.footer { margin-top: 12px; }
.open-btn {
  width: 100%; height: 32px; border: 0; border-radius: 6px;
  background: var(--mortar-accent); color: #1b1a17;
  font: 13px system-ui, sans-serif; font-weight: 600; cursor: pointer;
}
.open-btn:disabled { cursor: default; opacity: 0.6; }
.status { margin-top: 8px; color: rgba(225,225,230,0.7); }
.disconnected { margin: 8px 0 0; color: rgba(225,225,230,0.7); }
.intro { margin-top: 8px; }
`

const mortarMenuLine = (text, title) => (title ? { text, title } : { text })

const mortarPushSection = (sections, label, lines) => {
  if (lines.length > 0) {
    sections.push({ label, lines })
  }
}

const mortarThisModLines = (data) => {
  const lines = []
  if (data.profileName) {
    lines.push(
      mortarMenuLine(
        data.installed && data.version
          ? `Version ${data.version} in this profile`
          : 'Not in this profile',
      ),
    )
  }
  if (data.pinned) {
    const reason = typeof data.pinReason === 'string' ? data.pinReason.trim() : ''
    lines.push(mortarMenuLine(reason ? `Pinned: ${reason}` : 'Pinned at this version'))
  }
  if (data.skipVersion) {
    lines.push(mortarMenuLine(`You skipped version ${data.skipVersion}`))
  }
  const skipSources = Array.isArray(data.skipSources) ? data.skipSources : []
  for (const source of skipSources) {
    const label = globalThis.mortarSkipSourceLabel?.(source) || String(source)
    lines.push(mortarMenuLine(`Skipped source: ${label}`))
  }
  return lines
}

const mortarUpdateLines = (data) => {
  const lines = []
  if (data.nexusNewer) {
    lines.push(mortarMenuLine('Nexus has a newer version'))
  }
  if (data.updateCount > 0) {
    lines.push(mortarMenuLine(`Update available in ${data.updateCount} of your profiles`))
  }
  return lines
}

const mortarOtherProfileLines = (data) => {
  if (!Array.isArray(data.alsoIn) || data.alsoIn.length === 0) {
    return []
  }
  return data.alsoIn.map((profile) =>
    mortarMenuLine(
      profile.version ? `${profile.profile} (version ${profile.version})` : profile.profile,
    ),
  )
}

const mortarRequiredLines = (data) => {
  if (!data.profileName) {
    return []
  }
  const requiredNames = Array.isArray(data.requiredByNames) ? data.requiredByNames : []
  const requiredBy = Array.isArray(data.requiredBy) ? data.requiredBy : []
  const requiredCount = Math.max(requiredBy.length, requiredNames.length)
  if (requiredCount === 0) {
    return []
  }
  const names = requiredNames.length > 0 ? requiredNames : requiredBy.map((entry) => String(entry))
  const countLabel = globalThis.mortarPlural(requiredCount, 'mod', 'mods')
  return [
    mortarMenuLine(`${countLabel} in this profile`, names.join(', ')),
    ...names.map((name) => mortarMenuLine(name)),
  ]
}

const mortarProblemLines = (data) => {
  if (!data.profileName) {
    return []
  }
  const problems = Array.isArray(data.problems) ? data.problems : []
  if (problems.length === 0) {
    return [mortarMenuLine('No problems')]
  }
  const lines = problems.slice(0, mortarMenuMaxProblems).map((problem) => ({
    ...mortarMenuLine(typeof problem === 'string' ? problem : problem.text),
    problem: true,
  }))
  if (problems.length > mortarMenuMaxProblems) {
    lines.push(
      mortarMenuLine(`+${problems.length - mortarMenuMaxProblems} more — open Mortar to see them`),
    )
  }
  return lines
}

globalThis.mortarStatusDot = (data) => {
  if (!data?.connected || data.kind === 'collection' || !data.inProfile) {
    return null
  }
  if (data.hasProblems) {
    return 'red'
  }
  if (data.updateAvailable) {
    return 'amber'
  }
  if (data.installed) {
    return 'green'
  }
  return null
}

// The button's accessible name carries what the status dot shows by colour alone.
globalThis.mortarMenuLabel = (data, dotKind) => {
  if (dotKind === 'red') {
    const count = Array.isArray(data.problems) ? data.problems.length : 0
    return `Mortar: ${globalThis.mortarPlural(count, 'problem', 'problems')}`
  }
  if (dotKind === 'amber') {
    return 'Mortar: update available'
  }
  if (dotKind === 'green') {
    return `Mortar: in ${data.profileName}`
  }
  return 'Mortar'
}

globalThis.mortarBuildSections = (data) => {
  const sections = []
  if (!data?.connected || data.kind === 'collection') {
    return sections
  }
  mortarPushSection(sections, 'This mod', mortarThisModLines(data))
  mortarPushSection(sections, 'Updates', mortarUpdateLines(data))
  mortarPushSection(sections, 'Other profiles', mortarOtherProfileLines(data))
  mortarPushSection(sections, 'Required by', mortarRequiredLines(data))
  mortarPushSection(sections, 'Requirements', globalThis.mortarRequirementLines?.(data) || [])
  mortarPushSection(sections, 'Problems', mortarProblemLines(data))
  return sections
}

const mortarOwnedUpdateCount = (open, others, pageVer, newer) => {
  const owned = []
  if (open.profile && open.version) {
    owned.push(open)
  }
  for (const profile of Array.isArray(others) ? others : []) {
    if (profile?.profile && profile.version) {
      owned.push(profile)
    }
  }
  let updateCount = 0
  for (const profile of owned) {
    if (profile.updateAvailable || newer(pageVer, profile.version)) {
      updateCount += 1
    }
  }
  return updateCount
}

// reply is the host's mod reply plus the connection state.
globalThis.mortarMenuModData = (reply, pageVer) => {
  const { open, others, problems, state = 'ready' } = reply ?? {}
  if (!open || state !== 'ready') {
    return { connected: false, kind: 'mod', state }
  }
  const newer = globalThis.mortarNewerVersion || (() => false)
  const installed = open.version
  const updateCount = mortarOwnedUpdateCount(open, others, pageVer, newer)
  const problemList = Array.isArray(problems) ? problems : []
  return {
    connected: true,
    kind: 'mod',
    profileName: open.profile || '',
    installed: Boolean(installed),
    inProfile: Boolean(installed),
    version: installed || '',
    pinned: Boolean(open.pinned),
    pinReason: open.pinReason || '',
    skipVersion: open.skipVersion || '',
    skipSources: Array.isArray(open.skipSources) ? open.skipSources : [],
    alsoIn: Array.isArray(others) ? others : [],
    requiredBy: Array.isArray(open.requiredBy) ? open.requiredBy : [],
    requiredByNames: Array.isArray(open.requiredByNames) ? open.requiredByNames : [],
    nexusNewer: Boolean(installed && newer(pageVer, installed)),
    updateCount,
    updateAvailable: updateCount > 0,
    problems: problemList,
    hasProblems: problemList.length > 0,
  }
}

const mortarApplyAttr = (node, key, value) => {
  if (value === undefined || value === null || value === false) {
    return
  }
  if (key === 'class') {
    node.className = value
    return
  }
  if (key === 'text') {
    node.textContent = value
    return
  }
  node.setAttribute(key, value === true ? '' : String(value))
}

const mortarMenuEl = (tag, attrs, ...children) => {
  const node = document.createElement(tag)
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      mortarApplyAttr(node, key, value)
    }
  }
  for (const child of children) {
    if (child !== undefined && child !== null) {
      node.append(typeof child === 'string' ? document.createTextNode(child) : child)
    }
  }
  return node
}

const mortarMenuFocusables = (root) =>
  [...root.querySelectorAll('button, a[href]')].filter((node) => !node.disabled)

const mortarMarkNode = () => {
  const wrap = mortarMenuEl('span', { 'aria-hidden': 'true' })
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  for (const [name, value] of [
    ['viewBox', '0 0 64 64'],
    ['width', '20'],
    ['height', '20'],
    ['aria-hidden', 'true'],
  ]) {
    svg.setAttribute(name, value)
  }
  for (const [x, y, width] of mortarMarkBricks) {
    const rect = document.createElementNS(svgNS, 'rect')
    for (const [name, value] of [
      ['x', x],
      ['y', y],
      ['width', width],
      ['height', 11],
      ['rx', 2],
    ]) {
      rect.setAttribute(name, String(value))
    }
    svg.append(rect)
  }
  wrap.append(svg)
  return wrap
}

const mortarRenderSections = (menu, sections) => {
  for (const section of sections) {
    const box = mortarMenuEl('div', { class: 'section' })
    box.append(mortarMenuEl('div', { class: 'label', text: section.label }))
    for (const line of section.lines) {
      const row = mortarMenuEl('p', {
        class: line.problem ? 'body problem' : 'body',
      })
      if (line.href) {
        row.append(mortarMenuEl('a', { href: line.href, target: '_blank', text: line.text }))
      } else {
        row.textContent = line.text
      }
      if (line.title) {
        row.title = line.title
      }
      box.append(row)
    }
    menu.append(box)
  }
}

const mortarBindMenu = (host, shadow, btn, menu) => {
  let open = false
  const setOpen = (next, refocus = true) => {
    open = next
    menu.classList.toggle('open', open)
    btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    if (open) {
      menu.classList.toggle('right', btn.getBoundingClientRect().left > window.innerWidth / 2)
      menu.focus()
    } else if (refocus) {
      btn.focus({ preventScroll: true })
    }
  }
  const close = (refocus = true) => {
    if (open) {
      setOpen(false, refocus)
    }
  }
  btn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    setOpen(!open)
  })
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'Tab') {
      return
    }
    const items = mortarMenuFocusables(menu)
    if (items.length === 0) {
      event.preventDefault()
      return
    }
    const [first] = items
    const last = items.at(-1)
    const active = shadow.activeElement
    if (event.shiftKey && (active === first || active === menu)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  })
  const onDocPointer = (event) => {
    const path = event.composedPath ? event.composedPath() : []
    if (!path.includes(host)) {
      close(false)
    }
  }
  document.addEventListener('pointerdown', onDocPointer, true)
  return { close, onDocPointer }
}

// Mortar's accent colour, from the latest native-host reply; every menu on the page follows it.
let mortarAccent = ''
const mortarMenuHosts = new Set()
const mortarAccentHex = /^#[0-9a-f]{6}$/i

globalThis.mortarSetAccent = (hex) => {
  if (typeof hex !== 'string' || !mortarAccentHex.test(hex) || hex === mortarAccent) {
    return
  }
  mortarAccent = hex
  for (const host of mortarMenuHosts) {
    if (host.isConnected) {
      host.style.setProperty('--mortar-accent', hex)
    } else {
      mortarMenuHosts.delete(host)
    }
  }
}

globalThis.mortarAttachMenu = (host, data, options = {}) => {
  host._mortarMenu?.disconnect?.()
  mortarMenuHosts.add(host)
  if (mortarAccent) {
    host.style.setProperty('--mortar-accent', mortarAccent)
  }
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
  shadow.replaceChildren()
  shadow.append(mortarMenuEl('style', { text: mortarMenuStyle }))

  const connected = Boolean(data?.connected)
  const dotKind = globalThis.mortarStatusDot(data)
  const profileName = data?.profileName || ''
  const isCollection = data?.kind === 'collection'

  const label = globalThis.mortarMenuLabel(data, dotKind)
  const btn = mortarMenuEl('button', {
    class: `btn${connected ? '' : ' dim'}`,
    type: 'button',
    'aria-label': label,
    title: label,
    'aria-haspopup': 'dialog',
    'aria-expanded': 'false',
  })
  btn.append(mortarMarkNode())
  if (dotKind) {
    btn.append(mortarMenuEl('span', { class: `dot ${dotKind}`, 'aria-hidden': 'true' }))
  }

  const menu = mortarMenuEl('div', {
    class: 'menu',
    role: 'dialog',
    'aria-label': 'Mortar',
  })
  menu.tabIndex = -1
  menu.append(
    mortarMenuEl(
      'div',
      { class: 'header' },
      mortarMarkNode(),
      mortarMenuEl('span', { class: 'title', text: 'Mortar' }),
      mortarMenuEl('span', { class: 'profile', title: profileName, text: profileName }),
    ),
  )
  if (!connected) {
    menu.append(
      mortarMenuEl('p', {
        class: 'disconnected',
        text:
          data?.state === 'missing'
            ? globalThis.mortarInstallHint
            : globalThis.mortarStateText(data?.state),
      }),
    )
  }
  if (connected && isCollection) {
    menu.append(
      mortarMenuEl('p', {
        class: 'body intro',
        text: 'Preview this collection in Mortar and choose which of its mods to add to a profile.',
      }),
    )
  }
  mortarRenderSections(menu, globalThis.mortarBuildSections(data))

  const openBtn = mortarMenuEl('button', {
    class: 'open-btn',
    type: 'button',
    text: 'Open in Mortar',
  })
  const statusEl = mortarMenuEl('p', { class: 'status', role: 'status' })
  const footer = mortarMenuEl(
    'div',
    { class: 'footer' },
    data?.state === 'missing' ? null : openBtn,
  )
  if (isCollection) {
    footer.append(statusEl)
  }
  menu.append(footer)
  shadow.append(mortarMenuEl('div', { class: 'wrap' }, btn, menu))

  const bound = mortarBindMenu(host, shadow, btn, menu)
  openBtn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (typeof options.onOpen === 'function') {
      options.onOpen()
    }
  })

  const api = {
    close: bound.close,
    setStatus(text) {
      statusEl.textContent = text || ''
    },
    setBusy(busy) {
      openBtn.disabled = Boolean(busy)
    },
    disconnect() {
      document.removeEventListener('pointerdown', bound.onDocPointer, true)
    },
  }
  host._mortarMenu = api
  return api
}
